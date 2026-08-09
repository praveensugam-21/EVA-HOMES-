# EVA Homes

EVA Homes is a full-stack, agent-mediated real estate marketplace — buyers browse and enquire, sellers list and manage properties, and every buyer-seller contact is routed through an agent/broker layer rather than direct.

The project is split into a React frontend and a FastAPI backend, deployed on Vercel + Render + Supabase.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, React Router, Axios
- **Backend:** FastAPI, SQLAlchemy, Pydantic, Alembic (migrations)
- **Database:** SQLite locally, Postgres-ready for production (`DATABASE_URL`)
- **Auth:** JWT (email/password) + Google Sign-In (OAuth ID token)
- **Maps:** Leaflet + OpenStreetMap (GPS pin picker, free, no API key/billing)
- **Testing:** pytest (backend smoke suite), GitHub Actions CI

## Project Structure

```text
eva-homes/
  README.md
  render.yaml
  .github/workflows/backend-tests.yml
  docs/
    PROJECT_GUIDE.md
    BROKER_CONTACT_FLOW.md
    CHANGELOG.md
    ERROR.md
    pro.md
    tobedone.md

  backend/
    main.py                 FastAPI app setup, CORS, security headers, startup
    database.py              SQLAlchemy engine/session
    seed.py                   Dev-only sample data (gated, see below)
    requirements.txt
    requirements-dev.txt       Adds pytest/httpx for running tests
    pytest.ini
    alembic.ini
    alembic/                  Versioned schema migrations
      env.py
      versions/
    core/
      config.py                Settings (env vars)
      security.py               Password hashing, JWT
      notify.py                  In-app notification helper
      rate_limit.py               Per-IP in-memory rate limiter
      storage.py                   Local disk / Supabase Storage abstraction (async upload)
    models/                    SQLAlchemy tables, incl. property_unlock.py, availability_slot.py
    routers/                   API endpoints, one file per domain, incl. unlocks.py, availability.py
    schemas/                   Pydantic request/response models
    tests/                     pytest smoke suite
    static/
      uploads/                 Property images (local disk, dev only — Supabase Storage in prod)
      seller_docs/             Seller verification documents (same)

  frontend/
    index.html
    package.json
    vite.config.js
    eslint.config.js
    vercel.json                Rewrites + security headers (CSP, HSTS, etc.)
    .env.example
    public/
    src/
      api/api.js               Axios client, one wrapper per backend router
      context/                 Auth state (AuthContext)
      layouts/                 Dashboard shell layout
      components/
        LocationPicker.jsx      Free Leaflet/OpenStreetMap GPS pin picker
        dashboard/              Shared dashboard widgets (Sidebar, StatusBadge)
      pages/
        dashboard/
          buyer/                 Buyer dashboard pages, incl. My Unlocks
          seller/                 Seller dashboard pages, incl. availability slots
          shared/                 Notifications, Settings
        Admin*.jsx                Admin workspace pages, incl. Payment Verifications,
                                  Seller Verifications
        *Page.jsx                 Public pages (Home, Listings, PropertyDetail, Login, Register, ...)
                                  — every route except Home is React.lazy()-loaded
```

## Features

**Public / visitor**
- Browse and filter property listings (city, type, price, bedrooms, keywords)
- View property details, photo galleries, and an agent-masked contact panel (with the agent's photo, if set)
- Submit an enquiry without logging in

**Buyer**
- Register/login with email+password or Google Sign-In
- Save properties to a shortlist
- Submit enquiries, request visits (against a seller's specific-date availability slots), make offers — and track all three from a dashboard
- In-app **notification bell** (Navbar, with unread badge) — notified when an agent/seller replies, a visit/offer status changes, or a booked visit is coming up in about an hour
- Pay a one-time fee (offline UPI, admin-verified) to unlock a listing's exact map location (₹30 default) and/or the owner's real phone number (₹20 default) — two independent unlocks, tracked with amount paid on a **My Unlocks** page

**Seller** (opt-in on any buyer account — admin accounts can opt in too)
- Activate a seller profile and submit verification documents (Government ID is mandatory before review)
- Create and manage listings (each starts `pending` until admin approval), with a free GPS map picker for the exact location and multiple photos per room
- Set specific-date visit availability slots per property; reply to buyer enquiries directly (not just admin)
- View per-listing analytics, respond to enquiries/visits/offers

**Admin** (manages the marketplace; can additionally opt into buying/selling like any other account)
- Approve/reject seller verification from a dedicated **Seller Verifications** page
- Moderate listings (approve, reject, feature, verify)
- Manage all enquiries site-wide, reply directly to buyers (shows on their dashboard + notification)
- Verify/reject location-unlock payment claims (Navbar shows a live pending-count badge)
- Manage user accounts (activate/deactivate, promote/demote admin), paginated 20 at a time with full profile detail per user
- Edit the site-wide agent contact details (name, phone, WhatsApp, photo) and the two location-unlock payment fees

See `docs/PROJECT_GUIDE.md` for the full walkthrough of each workspace.

## Backend Setup

```powershell
cd F:\eva-homes\backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` (not tracked in git — copy the values you need):

```env
DATABASE_URL=sqlite:///./eva_homes.db
SECRET_KEY=<generate a random string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
APP_NAME=EVA Homes API
APP_VERSION=1.0.0
DEBUG=True
GOOGLE_CLIENT_ID=<optional — from Google Cloud Console, leave blank to disable Google Sign-In>
CRON_SECRET=<shared secret for POST /api/visits/dispatch-reminders — leave blank locally, auto-generated on Render>
```

Apply migrations, then run the server:

```powershell
alembic upgrade head
uvicorn main:app --reload
```

With `DEBUG=True`, the app auto-seeds sample data (users, properties) on first startup — see [Test Accounts](#test-accounts) below. In production (`DEBUG=false`), auto-seed is skipped unless `SEED_DB=true` is also set.

Backend URLs:

```text
API:  http://127.0.0.1:8000
Docs: http://127.0.0.1:8000/docs
```

## Frontend Setup

```powershell
cd F:\eva-homes\frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=<optional — must match backend's GOOGLE_CLIENT_ID>
```

Run the dev server:

```powershell
npm run dev
```

Frontend URL: `http://localhost:5173`

## Running Tests

```powershell
cd F:\eva-homes\backend
.\venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
pytest -q
```

The same suite runs automatically in CI (`.github/workflows/backend-tests.yml`) on every push/PR to `main`.

## Database Migrations

Schema changes go through Alembic, not manual edits:

```powershell
cd F:\eva-homes\backend
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

`render.yaml`'s build step runs `alembic upgrade head` automatically before each deploy.

## Test Accounts

After the backend auto-seeds (`DEBUG=True`, first run only — it skips if the database already has users):

```text
Admin: admin@evahomes.com / admin123
User:  rahul@example.com / password123
User:  priya@example.com / password123
```

**Change or remove these before deploying anywhere real** — they're dev-only, and auto-seed is disabled in production by default (see Backend Setup above).

## Image & Document Uploads

Storage is pluggable via `STORAGE_BACKEND` (`core/storage.py`):

- **`local`** (default for dev) — saved to local disk:
  ```text
  backend/static/uploads/       property images
  backend/static/seller_docs/    seller verification documents
  ```
  Works for local development but **does not survive a real cloud deploy** (Render/Vercel disks are ephemeral).
- **`supabase`** (production) — uploaded to Supabase Storage buckets instead, durable across restarts. Requires `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET_IMAGES`, `SUPABASE_BUCKET_DOCS`. Uploads are async (`httpx.AsyncClient`) so a slow upload doesn't block other requests on the same worker.

Uploads are capped at **5MB per file** (enforced server-side by streaming and counting bytes, not just trusted from the client) and **10 photos per room** on a listing, regardless of backend.

## Notes For Developers

- Run backend commands from `backend/` so relative paths (SQLite file, `static/`) resolve correctly.
- Run frontend commands from `frontend/` (that's where `package.json` lives).
- Never commit `.env` files, `venv/`, `node_modules/`, the SQLite database, or build output — all covered by `.gitignore`.
- New schema changes: use Alembic (see above), not manual `ALTER TABLE`.

## Additional Guides

All in `docs/`:

- `docs/PROJECT_GUIDE.md` — full walkthrough of every workspace (buyer/seller/admin) and API routes.
- `docs/BROKER_CONTACT_FLOW.md` — the broker-assisted contact model and masked owner phone flow.
- `docs/CHANGELOG.md` — running summary of what changed and why, session by session.
- `docs/ERROR.md` — log of runtime errors/bugs encountered during development and how they were fixed.
- `docs/pro.md` — plain-English walkthrough of the product: what it is, how each role's journey works, and its business logic.
- `docs/tobedone.md` — checklist: what's done, what's missing, and the exact deploy steps in order.

## Build

```powershell
cd F:\eva-homes\frontend
npm run build
npm run preview
```

## License

This project is currently for learning and development.
