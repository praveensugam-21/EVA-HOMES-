# EVA Homes — Architecture

How the system is actually put together: the pieces, how they talk to each other, and why the boundaries are where they are. For *what* the product does, see `pro.md` and `PROJECT_GUIDE.md`; this document is about *how it's built*.

---

## 1. System Overview

```
┌─────────────────────────┐
│   Browser                │
│   React 19 + Vite         │
│   (Vercel)                │
└───────────┬───────────────┘
            │ HTTPS, JSON, JWT in localStorage
            ▼
┌─────────────────────────┐
│   FastAPI backend          │
│   (Render, single service) │
└───────────┬───────────────┘
            │ SQLAlchemy ORM
            ▼
┌─────────────────────────┐
│   Postgres + Storage       │
│   (Supabase)                │
└─────────────────────────┘
            ▲
            │ HTTP POST every 10 min, shared secret
┌───────────┴───────────────┐
│   Render Cron Job           │
│   (visit-reminder dispatch) │
└─────────────────────────┘
```

Four independently deployed pieces, three different vendors. No piece can see inside another — they only talk over the network, the same way a third party would have to. That constraint shaped several decisions below (notably §6, Google Sign-In).

---

## 2. Backend Architecture

**One FastAPI app, one router per domain.** `backend/routers/` has a file per concern — `auth`, `properties`, `enquiries`, `visits`, `offers`, `notifications`, `saved_properties`, `cities`, `settings`, `unlocks`, `availability` — each mounted onto the app in `main.py`. There's no separate service layer or repository pattern; each router function talks to the database directly through SQLAlchemy. For an app this size, that's a deliberate simplicity choice — the indirection a service layer buys isn't paying for itself yet, and every route's full behavior is visible in one function instead of spread across layers.

**Permission checks live at the dependency level, not scattered through business logic.** `routers/auth.py` defines a small set of FastAPI dependencies — `get_current_user`, `get_admin_user`, `get_seller_user`, `get_current_user_optional` — and every route declares which one it needs as a parameter. A route that needs an admin literally cannot run its body without one; there's no `if not user.is_admin: raise` scattered at the top of every function (except for the handful of cases needing a role check *in addition to* being logged in, like "admin OR the property's owner," which stays inline since it's genuinely per-route logic, not a reusable gate).

**Role is derived, not stored as an enum.** A `User` row doesn't have a `role` column. `is_admin` is a boolean flag; "is this user a seller" is answered by whether a `SellerProfile` row exists and links to them. This is what makes an account able to hold multiple capabilities at once (buyer + seller, or — a later, deliberate decision — admin + seller) without a role-migration or a second account.

**Schema changes go through Alembic, never manual `ALTER TABLE`.** `backend/alembic/versions/` has every migration in order; Render's build step runs `alembic upgrade head` automatically on every deploy, so the live schema and the migration history can never drift apart silently. (A handful of `ensure_*_columns()` startup functions in `main.py` predate Alembic being wired in and still run for backward compatibility with databases that existed before that — new schema work should never add to that pattern, only to `alembic/versions/`.)

**Storage is behind one abstraction, swappable by config.** `core/storage.py` exposes `upload_bytes`/`signed_url`/etc.; `STORAGE_BACKEND` (`local` or `supabase`) decides whether those functions write to local disk or call the Supabase Storage REST API. Every router that handles a file upload calls this abstraction, never the filesystem or Supabase's API directly — so the storage backend can change without touching a single router.

---

## 3. Frontend Architecture

**Route-based code-splitting, one static entry point.** `App.jsx` defines every route; every page component except the Home page's own pieces is wrapped in `React.lazy()` behind a single top-level `Suspense` boundary. A visitor browsing the public site never downloads the admin/seller/buyer dashboard bundles — they load on demand, the moment a route is actually visited.

**Three parallel dashboard shells sharing one layout.** `DashboardLayout.jsx` + `components/dashboard/Sidebar.jsx` render a buyer, seller, or admin navigation depending on `mode`, but it's the *same* shell component — not three separately built dashboards. An account with both seller and buyer capability switches between the two sidebars from a toggle inside that shared shell, rather than needing separate URLs or a separate app.

**Route guards gate access, not just hide UI.** `RequireAuth`, `SellerRoute`, `AdminRoute` in `App.jsx` redirect away from a page tree entirely if the logged-in user doesn't have the right capability — but this is a UX convenience, not the actual security boundary. The backend enforces every permission independently (see §2); a route guard that was accidentally too permissive would still hit a 403 from the API, not leak data.

**One Axios instance, one file.** `frontend/src/api/api.js` is the single place that knows the backend's base URL and attaches the JWT to every request. Every page imports typed-ish wrapper functions from here (`propertiesAPI.list()`, `unlocksAPI.review()`, etc.) rather than calling `axios` directly — so there's exactly one place to change if an endpoint's shape changes, and exactly one place a 401 gets handled (the response interceptor clears the token and redirects to login).

**Auth state lives in React Context, token in `localStorage`.** `AuthContext.jsx` holds `user`/`token`/`isLoggedIn` and exposes `login`/`logout`/`register`/`googleLogin`/`refreshUser`. On app load, if a token exists in `localStorage`, it's used to fetch `/api/auth/me` — if that fails (expired/invalid), the token is cleared and the user is treated as logged out. This means role/permission data is always re-verified against the live backend on load, never trusted from a stale cached value.

---

## 4. Data Layer

**Postgres in production, SQLite in local dev — same models, same migrations, different engine.** `database.py` builds the SQLAlchemy engine from `DATABASE_URL`; nothing in application code branches on which database it's talking to. The one place the difference matters is Alembic migrations that need `ON DELETE` behavior or native enum types — those are written to target Postgres specifically (with a dialect check that no-ops on SQLite), because SQLite doesn't enforce foreign keys at all in this app and has a different migration model for column/constraint changes (see §7).

**Every foreign key has explicit `ON DELETE` behavior.** `CASCADE` for genuinely dependent data (a property's images/enquiries/visits/offers/unlocks; a user's properties/saved-properties/notifications/seller-profile), `SET NULL` for pure provenance fields (`PropertyUnlock.reviewed_by` — deleting the admin who reviewed a claim shouldn't destroy the buyer's own record). This wasn't the original design — see §7 for why it had to be retrofitted, and why that class of bug is specifically invisible in local SQLite development.

**Free-text fields get normalized at the boundary, not trusted as typed.** `Property.city` is typed freely by a seller (no dropdown) — the Pydantic schema (`schemas/property.py`) normalizes casing/whitespace on every create/update (`.strip().title()`), and the cities-aggregation query (`routers/cities.py`) groups by a case-insensitive key regardless, so inconsistent input can't silently split into duplicate buckets. The general pattern: validate/normalize at the API boundary (Pydantic field validators), not in the database and not in the frontend.

---

## 5. Auth & Permission Model

- **JWT (HS256), stateless.** `core/security.py` issues/decodes tokens; nothing is stored server-side per session, so there's no session store to scale or invalidate — a token is just valid until it expires or the secret rotates.
- **Password auth**: bcrypt-hashed, standard email+password flow.
- **Google Sign-In**: popup-based (`ux_mode` default), not redirect-based — see §6 for why that's a deliberate choice, not just "the default."
- **Role is capability-based, checked per-request, server-side.** See §2 — there's no client-trusted role claim; every sensitive route independently re-checks `is_admin`/`has_seller_profile` against the current database state via a FastAPI dependency.
- **Rate limiting** is per-IP/per-user, in-memory (`core/rate_limit.py`) — deliberately simple, with a known scaling limit (would need Redis if the backend ever ran more than one worker) that's documented rather than hidden.

---

## 6. Why Some Things Are Built The Way They Are

**Google Sign-In uses a popup, not a redirect — because the frontend and backend are on different domains.** Google Identity Services' documented CSRF protection for redirect mode (a double-submit cookie) assumes the page rendering the sign-in button and the endpoint receiving the callback share an origin. This app's frontend (Vercel) and backend (Render) are deliberately separate deployments on separate domains — so that protection structurally cannot work here, no matter how it's configured. A redirect-mode implementation was actually built and then reverted once this became clear; the popup flow is Google's own officially-supported method and works for the overwhelming majority of real visitors. Full debugging trail in `ERROR.md`.

**Visit reminders run as a separate Render Cron Job, not a scheduler inside the API process — because the API process doesn't stay awake.** Render's free web service spins down after a period of inactivity. A scheduler running inside that same process (e.g. APScheduler) would silently stop firing exactly when the app is asleep — which is unrelated to whether a reminder is actually due. The fix lives outside the app entirely: a second, independent Render service on its own clock, authenticated with a shared secret (`CRON_SECRET`) rather than a user JWT, since it isn't a user request.

**Storage and database are both externalized to Supabase, not kept on Render's own disk.** Render's filesystem is ephemeral — anything written to local disk is gone on the next deploy or restart. Both the database (`DATABASE_URL`) and file storage (`STORAGE_BACKEND=supabase`) point at Supabase specifically so state survives redeploys, while the storage abstraction (§2) keeps local-disk mode available for zero-setup local development.

**Uploads are async, not sync, inside the API process.** `core/storage.py`'s Supabase upload uses `httpx.AsyncClient`, not a blocking `httpx.post`. A blocking call inside an `async def` route handler stalls the *entire* Uvicorn worker's event loop for the duration of the upload — every other concurrent request on that worker waits too, not just the uploader's own. This was a real, measured bug (see `ERROR.md`/`CHANGELOG.md`), not a preemptive optimization.

**Admin's ability to also buy/sell was removed, then deliberately restored.** Early in the project, admin was explicitly blocked from every buyer/seller action, enforced server-side — a considered choice to keep the operational role from blurring into "just another user." That was later reversed by explicit product decision: admin can now hold a seller profile and transact, including approving their own listings once they're a seller too. Neither state was a bug; both were the correct implementation of what was actually wanted at the time. The lesson generalized from this: access-control decisions in a real product are allowed to change as the business's needs get clearer, and the job is building what's asked, not defending an earlier decision on principle.

---

## 7. A Bug That Shaped The Architecture Section Above

Every foreign key in the original schema was created with no `ondelete=` behavior, which defaults to Postgres's `RESTRICT`. SQLite — used in local dev — never enforces foreign keys at all in this app (no `PRAGMA foreign_keys=ON`), so **this entire category of bug was completely invisible locally** and only ever surfaced against the real production Postgres database: deleting a user or property with any related row failed outright with a `ForeignKeyViolation`.

The fix (a migration adding explicit `CASCADE`/`SET NULL` to every affected constraint) is straightforward; the more durable lesson is architectural: **when local dev and production use different database engines, don't assume a schema constraint behaves the same in both.** Anything relying on database-level enforcement (foreign keys, check constraints, native enums) needs to be verified against the actual production engine, not inferred from local testing passing. Full writeup in `ERROR.md`.

---

## 8. Deployment Topology

| Service | Vendor | Responsibility |
|---|---|---|
| Frontend | Vercel | Static build + SPA rewrite + all security headers (CSP, HSTS, etc.) — the actual surface real visitors load |
| Backend API | Render (web service) | FastAPI app; runs Alembic migrations on every deploy build |
| Visit reminders | Render (cron job) | Separate scheduled service, independent of the API's uptime |
| Database | Supabase (Postgres) | Persistent, survives every redeploy |
| File storage | Supabase (Storage) | Property images + seller documents, survives every redeploy |

No component trusts another's internal state — every boundary (frontend↔backend, backend↔database, cron↔backend) is a real network call with its own auth (JWT, DB credentials, shared secret respectively), which is exactly why the Google Sign-In and cron-scheduling decisions in §6 had to be solved as cross-service problems rather than in-process shortcuts.

---

## See Also

- `pro.md` — the product's *why*: business model, user journeys, design rationale.
- `PROJECT_GUIDE.md` — the full API route list and per-workspace walkthrough.
- `ERROR.md` — real bugs hit during development, with root causes (several referenced above).
- `CHANGELOG.md` — chronological history of what changed and why.
- `../Project_explain.md` — a single-file overview of the whole project, less architecture-focused than this document.
