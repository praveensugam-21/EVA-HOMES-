# EVA Homes — Complete Project Explainer

One self-contained document explaining what this project is, how it's built, everything it does, and how it's deployed. For deeper detail on any one topic, see the pointers to `docs/` at the bottom.

---

## 1. What This Is

**EVA Homes** is a full-stack, **agent-mediated** real estate marketplace — a lean, purpose-built alternative to a property portal like MagicBricks or 99acres. Buyers browse and enquire, sellers list and manage properties, and an admin/agent layer sits between them moderating everything and masking direct contact.

**The one structural choice that shapes everything else**: a buyer never gets a seller's real phone number by default. They see the *agent's* contact details instead — the actual owner's number is masked server-side. This turns the platform into a lead-generation and moderation funnel, not a pure peer-to-peer listings board, which is what makes it a real business model rather than just a database of listings.

The project is **live and deployed**: React frontend on Vercel, FastAPI backend on Render, Postgres database + file storage on Supabase.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router (with route-level `React.lazy()` code-splitting), Axios |
| Backend | FastAPI (Python), SQLAlchemy ORM, Pydantic, Alembic for migrations |
| Database | Postgres (Supabase) in production, SQLite locally |
| File storage | Supabase Storage in production, local disk in dev — pluggable via `STORAGE_BACKEND` |
| Auth | Stateless JWT (HS256, bcrypt-hashed passwords) + Google Sign-In (OAuth ID token, popup flow) |
| Maps | Leaflet + OpenStreetMap + Nominatim — free, no API key or billing |
| Scheduling | Render Cron Job (external, hits an API endpoint every 10 minutes) — no in-process scheduler |
| Testing | pytest (16 tests), GitHub Actions CI on every push/PR to `main` |
| Hosting | Vercel (frontend), Render (backend + cron job), Supabase (Postgres + Storage) |

---

## 3. Architecture

```
Browser (React 19 + Vite, deployed on Vercel)
    │  axios, JWT in localStorage
    ▼
FastAPI backend (Python, deployed on Render)
    │  SQLAlchemy ORM
    ▼
Postgres database + Storage buckets (Supabase)

                    ▲
                    │ every 10 min, shared-secret header
Render Cron Job ────┘  (visit reminder dispatch)
```

- **Backend** is organized as one FastAPI router per domain: `auth`, `properties`, `enquiries`, `visits`, `offers`, `notifications`, `saved_properties`, `cities`, `settings`, `unlocks`, `availability`. Each router owns its own permission checks — there's no separate authorization layer to keep in sync.
- **A user's role isn't a single field.** `is_admin` is a boolean flag; "seller" is derived from whether a `SellerProfile` row exists and is linked to the user; everyone is implicitly a buyer. These are **independent capabilities on one account**, not mutually exclusive roles — an admin can also activate a seller profile and buy/sell, just like any regular user (a deliberate, explicit product decision — see §9).
- **Frontend** uses route guards (`RequireAuth`, `SellerRoute`, `AdminRoute` in `App.jsx`) to gate entire page trees by capability, and three parallel dashboard shells (buyer / seller / admin) plus a public marketing/browse site. Every route except Home is lazy-loaded, so a public visitor never downloads the dashboard/admin code.
- **Frontend and backend are separate deployments on separate domains** (Vercel + Render) — this matters for a few design choices explained later (e.g. why Google Sign-In uses a popup, not a redirect).

---

## 4. User Roles & What Each Can Do

### Visitor (not logged in)
- Browse and filter listings (city, property type, listing type, price, bedrooms, keywords).
- Open a property detail page — photos, specs, an agent-masked contact panel (with the agent's photo, if set).
- Submit an enquiry without an account. Clicking the WhatsApp contact button also silently logs an enquiry, so that lead isn't lost even though the actual chat happens outside the app.
- Hits a login wall the moment they try to save/enquire-with-tracking/message beyond the basic form — a deliberate lead-capture gate.

### Buyer
- Register/login with email+password or Google Sign-In.
- Save properties to a personal shortlist.
- **Enquire**, **request a visit** (booked against a seller-defined specific-date slot, not a free-text time), or **make an offer** — three distinct, separately-tracked funnels, each with its own status lifecycle, not one generic "contact seller" form.
- Track all three from a dashboard (My Enquiries / My Visits / My Offers), each showing live status as the seller/admin responds.
- Get in-app notifications (Navbar bell with a live unread badge) — new replies, visit/offer status changes, and an automatic reminder about an hour before a confirmed visit.
- Pay a one-time fee to **unlock** a listing's exact map location (₹30 default) and/or the owner's real phone number (₹20 default) — two **independent** purchases, tracked with amount paid on a My Unlocks page.

### Seller (any buyer account can opt in — including admin accounts)
- Activate a seller profile (business name) and submit verification documents — Government ID specifically required before the application enters the admin review queue; Address Proof, Electricity Bill, and Business License are supporting documents.
- Create listings — a GPS map picker (click/drag a pin, search an address, or use device location) for the exact location, multiple photos per room (bathroom/hall/kitchen/parking), each listing starting `pending` until admin approves it.
- Define specific-date visit availability slots per property for buyers to book against.
- Manage listings, view per-listing analytics (views, enquiry counts), and respond to enquiries (with a real reply thread now, not just a status toggle), visits, and offers — a dashboard mirroring the buyer's, from the other side.

### Admin (manages the marketplace; may also participate like any other account)
- Approve/reject seller verification from a dedicated page, separate from listing moderation.
- Approve/reject/feature/verify every individual listing.
- See every enquiry site-wide, reply directly to buyers.
- Verify/reject location-unlock payment claims — checks their own UPI app, clicks Verify or Reject, the buyer is notified either way; a live badge shows the pending count.
- Manage user accounts: activate/deactivate, promote/demote admin.
- Set the site-wide agent contact details (name, phone, WhatsApp, photo) and the two unlock fees.
- **Can also activate a seller profile and buy/sell** — including approving their own listings once they're a seller too. This is a deliberate, explicit reversal of an earlier design where admin was strictly excluded from participating; both states were intentional engineering decisions made at different points as the actual product need became clear.

---

## 5. The Data Model

| Table | What it represents |
|---|---|
| `User` | One account. Buyer fields live directly on it; seller-ness is a linked profile, not a role enum. |
| `SellerProfile` | Business name + verification lifecycle (`unverified → pending → verified`/`rejected`). |
| `SellerDocument` | An uploaded ID/address/business-license file backing a verification request. |
| `Property` | The listing — type (apartment/villa/plot/commercial/house), listing type (buy/rent/commercial), status lifecycle (`pending → active → sold/rented/inactive`, or `rejected`). Every new listing starts `pending`. |
| `PropertyImage` | Multiple photos per listing. |
| `Enquiry` | A buyer's message about a listing — its own status, an `EnquiryNote` reply thread (buyer + seller + admin can all post/read), and a `source` (form/whatsapp/callback/call). |
| `Visit` | A booked visit against an `AvailabilitySlot` — buyer books, seller confirms/rejects, buyer can cancel. Carries `reminder_sent_at` so the automated reminder never double-fires. |
| `AvailabilitySlot` | A seller-defined, one-off visit slot for one property — a specific calendar date + start/end time (not recurring). `is_booked` flips true the moment a `Visit` claims it. |
| `Offer` | A buyer's price offer — buyer submits, seller accepts/rejects, buyer can withdraw. |
| `SavedProperty` | A buyer's shortlist entry. |
| `Notification` | In-app event feed — surfaced via the Navbar bell with a live unread count. |
| `BrokerSettings` | One global row — the agent's name/phone/WhatsApp/photo, the location-unlock QR/phone, and the two separate unlock fees (phone, map). |
| `PropertyUnlock` | A buyer's paid-and-verified claim on one listing — now **two independent rows per buyer+property** (`unlock_type: phone \| map`), each with its own status and its own snapshotted `amount_paid` so a later fee change never rewrites history. |

Every foreign key in the schema has explicit `ON DELETE` behavior (`CASCADE` for dependent data, `SET NULL` for provenance-only fields like "which admin reviewed this") — this was a real bug fixed mid-project (see §10).

---

## 6. Key Features, Explained

### Agent-masked contact + the paid unlock exception
By default, every buyer sees the agent's contact details on a listing, never the owner's real number, and never the exact map pin (a slightly imprecise location is shown instead). A buyer can pay to bypass this for one specific listing — phone number and map location are **two separately-priced, independently-purchasable unlocks**, not one bundle. Payment is genuinely offline (UPI to a QR code shown in-app), admin manually verifies against their own UPI app, and the unlock is permanent and checked server-side on every request afterward — never just remembered client-side.

### Two-layer moderation
Seller verification (does this account get to sell at all) and per-listing approval (does this specific listing go public) are two independent gates — a seller can actually list a property before their account is fully verified, which is a deliberate choice, not an oversight.

### Visit scheduling
Sellers define real availability (specific date + time window) instead of buyers guessing at a free-text time and hoping. A Render Cron Job — a separate scheduled service, not code running inside the API process — hits a dispatch endpoint every 10 minutes and sends a reminder to both sides when a confirmed visit is about an hour out. It's a separate service specifically because Render's free web service spins down when idle; a scheduler living inside the API itself would silently stop firing exactly when the app is asleep.

### Notifications
Every meaningful event (new enquiry, reply, visit/offer status change, verification decision, payment verification decision, visit reminder) writes an in-app notification. Surfaced as a bell icon with a live unread badge in the Navbar. Structurally ready for email/SMS (the schema and a preference model already exist) but nothing external is wired up yet — everything is in-app/DB only today.

---

## 7. Security

- **Auth**: stateless JWT (HS256), bcrypt password hashing, Google Sign-In via popup (see §9 for why not redirect mode).
- **Rate limiting**: per-IP/per-user in-memory limiter on sensitive endpoints (login, register, OTP, unlock requests) — fine for one backend instance, would need Redis to scale beyond that.
- **Security headers on both deploys**, each scoped to what it actually protects:
  - `frontend/vercel.json` — this is what protects real visitors, since Vercel serves the actual HTML/JS they load. Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and a Content-Security-Policy built from an exhaustive audit of every external domain the app actually loads (Google Fonts, Google Sign-In, Leaflet/OpenStreetMap tiles, Nominatim, the Google Maps embed, Supabase-hosted images) — deliberately has **no** `'unsafe-inline'` for scripts, confirmed via a full grep that nothing in the codebase needs it.
  - `backend/main.py` — same header set, scoped to the API's own HTML surfaces (`/docs`, `/redoc`). Its CSP needed `'unsafe-inline'` and `cdn.jsdelivr.net` specifically because FastAPI's built-in Swagger UI/ReDoc load from that CDN and inject an inline boot script (verified directly against the installed `fastapi` package's source, not assumed).
- **Foreign keys have real `ON DELETE` behavior** across the whole schema (see §10) — deleting a user or property no longer fails with a Postgres constraint violation the moment it has any related data.
- **CORS** is locked to the real frontend origin (`ALLOWED_ORIGINS`), not a wildcard.
- **Uploads** are capped server-side (5MB/file, 10 photos/room), not just in the UI — enforced by streaming and counting bytes.

---

## 8. Performance

- **N+1 queries fixed** across every admin/dashboard list endpoint (offers, visits, unlocks, enquiries, availability slots, admin users/sellers, admin listings) — these were lazy-loading a relationship (owner name, buyer name, property title) once *per row* with no eager loading, meaning a page listing 50 items could fire 100+ extra queries. Now uses SQLAlchemy `joinedload`/`selectinload`/`contains_eager` throughout.
- **Frontend code-splitting** — every route except Home is `React.lazy()`-loaded behind a `Suspense` boundary, so a visitor browsing public pages never downloads the admin/seller/buyer dashboard bundle. Verified: main JS bundle dropped ~19% gzipped, and every dashboard page now loads as its own small on-demand chunk.
- **Async file uploads** — Supabase Storage uploads used to call a blocking `httpx.post(...)` from inside an async route handler, which stalled the *entire* Uvicorn worker's event loop for the duration of every upload (not just the uploader's own request). Fixed with `httpx.AsyncClient`.

---

## 9. Notable Design Decisions (and why)

- **Buyer/seller/admin are capabilities, not roles** — matches how real users behave (an owner selling their flat is often also house-hunting), and now genuinely extends to admin too, by deliberate choice.
- **Contact masking through one global agent identity is the core monetization mechanic** — more commercially significant than any single feature, since every lead has to route through the platform.
- **The location-unlock feature became two products, not one** — splitting it into independently-priced phone/map unlocks is a genuinely different revenue shape, not a cosmetic change (a buyer who only wants to call the owner no longer has to pay for the map too).
- **Google Sign-In uses a popup, not a redirect** — a redirect-mode attempt was built and then deliberately reverted. Google's documented CSRF protection for redirect mode assumes the sign-in button's page and the callback endpoint share an origin; this app's frontend (Vercel) and backend (Render) are deliberately on different domains, so that protection can never actually work here. On top of that, Google's own platform flagged the underlying flow as a legacy pattern it now restricts. The popup flow is Google's officially supported method and works for the overwhelming majority of visitors — the one case it failed on turned out to be a single browser extension on one machine, not a systemic problem. Full debugging trail in `docs/ERROR.md`.
- **Scheduling lives outside the app process, deliberately** — Render's free tier spins the whole app down when idle, so anything relying on the app being awake to fire on schedule doesn't work. The visit-reminder system is a second, independent Render Cron Job for exactly this reason.

---

## 10. Bugs Worth Knowing About (fixed, but instructive)

- **Missing `ON DELETE` behavior on every foreign key.** Every FK in the original schema defaulted to Postgres's `RESTRICT`, and SQLite (used in local dev) doesn't enforce foreign keys at all in this app — so deleting a user or property with any related data worked fine locally and failed with a `ForeignKeyViolation` the moment it hit the real production Postgres database. Fixed with an Alembic migration adding explicit `CASCADE`/`SET NULL` to every affected constraint.
- **The backend's Content-Security-Policy was silently breaking its own `/docs` page** — it didn't allow `cdn.jsdelivr.net`, which is exactly where FastAPI's built-in Swagger UI loads its JS/CSS from. Found by reading the installed `fastapi` package's actual source rather than assuming, and fixed alongside the broader security-headers pass.

---

## 11. Deployment

| Piece | Where | Notes |
|---|---|---|
| Frontend | Vercel | Root directory `frontend`, auto-deploys on push to `main`. `vercel.json` has the SPA rewrite + all security headers. |
| Backend | Render (web service) | Root directory `backend`. Build: `pip install -r requirements.txt && alembic upgrade head` — migrations run automatically on every deploy. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"`. |
| Visit reminders | Render (cron job) | Separate service, `*/10 * * * *`, pings the backend's reminder-dispatch endpoint with a shared secret. |
| Database + Storage | Supabase | Postgres for `DATABASE_URL`; Storage buckets for property images and seller documents (`STORAGE_BACKEND=supabase`). |

**Key environment variables**: `DATABASE_URL`, `SECRET_KEY`, `GOOGLE_CLIENT_ID` (backend) / `VITE_GOOGLE_CLIENT_ID` (frontend, must match), `ALLOWED_ORIGINS`, `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`, `CRON_SECRET` (auto-generated and shared between the web service and cron job via Render's `fromService` reference), `VITE_API_BASE_URL` (frontend, points at the live Render backend URL).

---

## 12. What's Genuinely Still Missing

- No real email/SMS delivery — notifications and OTP codes are in-app/DB only, nothing actually gets sent externally.
- No forgot-password flow.
- In-memory rate limiter — fine for one instance, wouldn't hold across multiple backend workers.
- No in-app UI for hard-deleting a user account (deliberate — that stays a direct Supabase action, never an app button).
- The "Assistant to help you" paid-concierge idea raised by the platform owner — deliberately deferred, not yet defined.

Everything else that used to be a launch blocker (persistent database, durable file storage, real CORS/OAuth origins, security headers) is done and live.

---

## Where To Go For More Detail

- `docs/PROJECT_GUIDE.md` — full API route list, per-workspace walkthroughs, local dev setup.
- `docs/pro.md` — the deeper "why" behind the product's structure and design choices.
- `docs/BROKER_CONTACT_FLOW.md` — the agent-masking model and the paid-unlock exception, in depth.
- `docs/CHANGELOG.md` — session-by-session history of what changed and why.
- `docs/ERROR.md` — real bugs hit during development, root causes, and fixes.
- `docs/tobedone.md` — current deploy status and what's still open.
- `README.md` — quick-start setup commands for running the project locally.
