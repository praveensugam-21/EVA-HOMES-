# EVA Homes

EVA Homes is a full-stack, broker-mediated real estate marketplace — buyers browse and enquire, sellers list and manage properties, and every buyer-seller contact is routed through a broker layer rather than direct.

The project is split into a React frontend and a FastAPI backend.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, React Router, Axios
- **Backend:** FastAPI, SQLAlchemy, Pydantic, Alembic (migrations)
- **Database:** SQLite locally, Postgres-ready for production (`DATABASE_URL`)
- **Auth:** JWT (email/password) + Google Sign-In (OAuth ID token)
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
    models/                    SQLAlchemy tables
    routers/                   API endpoints, one file per domain
    schemas/                   Pydantic request/response models
    tests/                     pytest smoke suite
    static/
      uploads/                 Property images (local disk, dev only)
      seller_docs/             Seller verification documents (local disk, dev only)

  frontend/
    index.html
    package.json
    vite.config.js
    eslint.config.js
    .env.example
    public/
    src/
      api/api.js               Axios client, one wrapper per backend router
      context/                 Auth state (AuthContext)
      layouts/                 Dashboard shell layout
      components/
        dashboard/              Shared dashboard widgets (Sidebar, StatusBadge)
      pages/
        dashboard/
          buyer/                 Buyer dashboard pages
          seller/                 Seller dashboard pages
          shared/                 Notifications, Settings
        Admin*.jsx                Admin workspace pages
        *Page.jsx                 Public pages (Home, Listings, PropertyDetail, Login, Register, ...)
```

## Features

**Public / visitor**
- Browse and filter property listings (city, type, price, bedrooms, keywords)
- View property details, photo galleries, and a broker-masked contact panel
- Submit an enquiry without logging in

**Buyer**
- Register/login with email+password or Google Sign-In
- Save properties to a shortlist
- Submit enquiries, request visits, make offers — and track all three from a dashboard
- Receive in-app replies/notifications when a broker responds or a seller acts on a visit/offer

**Seller** (opt-in on any buyer account)
- Activate a seller profile and submit verification documents
- Create and manage listings (each starts `pending` until admin approval)
- View per-listing analytics, respond to enquiries/visits/offers

**Admin**
- Approve/reject seller verification
- Moderate listings (approve, reject, feature, verify)
- Manage all enquiries site-wide, reply directly to buyers (shows on their dashboard + notification)
- Manage user accounts (activate/deactivate, promote/demote admin)
- Edit the site-wide broker contact details (name, phone, WhatsApp)

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

Property images and seller verification documents are currently stored on local disk:

```text
backend/static/uploads/       property images
backend/static/seller_docs/    seller verification documents
```

This works for local development but **does not survive a real cloud deploy** (Render/Vercel disks are ephemeral) — moving to S3/Cloudinary/R2 is a known follow-up, not yet done.

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
