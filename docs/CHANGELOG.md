# Changelog

A running, plain-English summary of what changed and why — kept up to date after each work session so you can see what happened without re-reading the full conversation. Newest entries at the top. This is a summary log, not a commit history (see `git log` for that).

---

## 2026-07-28 — Broker replies, Google Sign-In, production hardening pass, repo cleanup & doc reorg

### Broker ↔ buyer communication
- Broker notes on an enquiry are no longer a single overwritable field — they're now a timestamped thread (`enquiry_notes` table), with an explicit **Send Reply** button.
- Replies now actually reach the buyer: they appear on the buyer's own "My Enquiries" page under "Replies from the broker desk," plus an in-app notification. Previously, notes were saved but never surfaced anywhere outside the admin panel.
- Guest enquiries (no linked account) show a warning in the admin panel — there's nowhere for a reply to land, so use Call/WhatsApp instead.

### Google Sign-In
- Added "Sign in with Google" to both the Login and Register pages, backed by a new `POST /api/auth/google` endpoint that verifies Google's ID token and finds-or-creates the matching account by email.
- Requires `GOOGLE_CLIENT_ID` (backend) and `VITE_GOOGLE_CLIENT_ID` (frontend) — both must match the OAuth Client ID from Google Cloud Console. Currently configured for `localhost` only; the production frontend domain needs to be added to the Client ID's Authorized JavaScript origins before deploying.

### Security / production-hardening fixes
- **Secrets:** `backend/.env` and `backend/eva_homes.db` were untracked from git (the files themselves are untouched on disk — this only stops future commits from including them) and `SECRET_KEY` was rotated. Existing login tokens were invalidated by the rotation.
- **Auto-seed** now only runs when `DEBUG=true` or `SEED_DB=true` — a fresh production database no longer silently gets the default `admin@evahomes.com/admin123` account.
- **CORS** tightened — removed the "allow any origin" fallback. Production needs `ALLOWED_ORIGINS` set explicitly in Render's dashboard (placeholder added to `render.yaml`).
- **Upload URLs** no longer hardcoded to `localhost:8000` — built from the actual request instead, so they resolve correctly wherever the app runs. Render's start command also gained `--proxy-headers` so `https` is detected correctly behind Render's proxy.
- **OTP endpoints** (request/verify, phone + email) are now rate-limited.
- **Moderation-bypass bug fixed:** a seller could previously set their own listing's `status` straight to `active` via `PUT /api/properties/{id}` — only `is_verified`/`is_featured` were admin-gated, not `status` itself. Now only admin can approve/reject/re-queue a listing; sellers can still delist their own (sold/rented/inactive).
- **Dead JWT expiry config fixed** — `ACCESS_TOKEN_EXPIRE_MINUTES` was defined but never actually used (tokens were always 60 minutes); now it's respected.
- Removed the fake phone/email OTP verification UI from Settings — it let users "verify" by reading a code that was never actually sent anywhere, and nothing else in the app gated on the result. Backend endpoints still exist (now rate-limited) for whenever a real SMS/email provider gets wired in.

### Repo cleanup
- Removed the dead Vercel-serverless backend path (`vercel.json`, `api/index.py`, `pyproject.toml`, root-level `requirements.txt`/`runtime.txt`, an empty `package-lock.json`) — Render is the actual backend; Vercel should only ever host the frontend static build.
- Untracked stray test upload artifacts (`backend/static/uploads/*`, `seller_docs/*`) and all committed `__pycache__` bytecode files, for the same reason as the `.env`/`.db` fix above.
- Fixed `.gitignore` gaps: `backend/static/seller_docs/` wasn't excluded before (only `uploads/` was), `.pytest_cache/` wasn't excluded.
- Removed two stray empty leftover folders (`.agents/`, a root-level `static/uploads/` left over from once running the backend from the wrong directory).
- Rewrote `README.md` and `PROJECT_GUIDE.md` to match the app as it actually is today (they still described an early version — missing offers/visits/saved-properties/notifications, seller verification, Google Sign-In, testing, Alembic).
- Updated `BROKER_CONTACT_FLOW.md`'s "next improvements" list to reflect what's now actually done vs. still open.

### Testing & migrations (new)
- Added a pytest smoke suite (`backend/tests/`, 15 tests) covering registration/login, property creation + ownership + the moderation-bypass fix above, and enquiry/visit/offer creation + authorization rules. Runs against an isolated on-disk SQLite database, never touches your real `eva_homes.db`.
- Added a GitHub Actions workflow (`.github/workflows/backend-tests.yml`) that runs the suite on every push/PR to `main`.
- Wired in Alembic: baseline migration captured from the current schema, dev database stamped as already-current, Render's build step now runs `alembic upgrade head`. Future schema changes should go through `alembic revision --autogenerate` instead of the old manual `ALTER TABLE` startup shims (which still run too, for backward compatibility with pre-Alembic databases).

### Documentation reorganized
- Moved every markdown doc except `README.md` into a new `docs/` folder: `PROJECT_GUIDE.md`, `BROKER_CONTACT_FLOW.md`, `CHANGELOG.md`, `ERROR.md`, `pro.md`.
- `README.md` stays at the repo root on purpose — that's the one file GitHub (and most tooling) auto-renders on the repo's homepage, so moving it would break that.
- Updated every cross-reference in `README.md` to point at `docs/...`; references between the docs themselves (e.g. `PROJECT_GUIDE.md` linking to `CHANGELOG.md`) needed no change since they're now siblings in the same folder.

### Known gaps — still open, deferred on purpose
These were flagged in the initial audit and intentionally left for later:
- No real email/SMS delivery — OTP and notifications are in-app/DB only.
- File uploads (property images, seller docs) live on local disk — not durable on a real Render/Vercel deploy; needs S3/Cloudinary/R2.
- No persistent Postgres wired up yet — `DATABASE_URL` isn't set on Render, so it'd fall back to ephemeral SQLite in production.
- In-memory rate limiting — fine for one instance, won't hold if the backend ever scales to multiple workers.

---

## 2026-07-27 (earlier) — Pulled upstream feature commit, initial audit

- Pulled commit `b351f7c` ("Update") from `origin/main` — a large feature commit adding the full buyer/seller dashboard suite: offers, visits, saved properties, notifications, seller verification, seller documents, broker settings admin page.
- Ran a full production-readiness audit of the resulting codebase (see the "known gaps" list above — this is where most of it was first identified).
- Wrote `pro.md` — a plain-English walkthrough of what the platform is, how each role's journey works, and why the broker-contact-masking design is the commercially significant part of the architecture.
