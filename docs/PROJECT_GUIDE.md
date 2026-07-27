# EVA Homes Project Guide

This project is a full-stack, broker-mediated real estate marketplace with a React frontend and a FastAPI backend. Buyers and sellers never contact each other directly — every enquiry, visit, and offer is visible to (and moderated by) the broker/admin.

## What The Project Does

**Everyone**
- Browse and search active property listings (city, type, price, bedrooms, keywords).
- Open a property detail page with photos, price, specs, and a broker-masked contact panel.
- Submit an enquiry without logging in.

**Buyers**
- Save properties to a personal shortlist.
- Submit enquiries, request visits, and make offers — each tracked separately with its own status.
- See broker replies to their enquiries directly on their dashboard, plus a notification.
- Sign in with email/password or a Google account.

**Sellers** (any buyer account can opt in)
- Activate a seller profile and submit verification documents; listing requires admin approval of both the profile and each individual listing.
- Create, edit, and delist their own properties.
- View per-listing analytics (views, enquiry counts) and respond to enquiries/visits/offers on their properties.

**Admin**
- Approve/reject seller verification documents.
- Moderate every listing (approve, reject, feature, verify) — sellers cannot self-approve their own listings.
- View and reply to every enquiry site-wide from one workspace; replies appear on the buyer's dashboard.
- Manage user accounts: activate/deactivate, promote/demote admin.
- Edit the site-wide broker contact details (name, call number, WhatsApp number) shown to every buyer instead of the seller's real number.

## Main Folders

```text
backend/
  main.py               FastAPI app setup, CORS, security headers, lifespan/startup
  database.py           SQLAlchemy engine/session, DATABASE_URL handling
  seed.py                Dev-only sample data (gated behind DEBUG/SEED_DB)
  alembic/                Versioned schema migrations (env.py, versions/)
  core/
    config.py             App settings — reads env vars via pydantic-settings
    security.py            Password hashing (bcrypt), JWT create/decode
    notify.py               In-app notification helper (DB only, no email/SMS yet)
    rate_limit.py            Per-IP in-memory rate limiter
  models/                 One SQLAlchemy model per table
  routers/                One FastAPI router per domain (see API routes below)
  schemas/                Pydantic request/response models
  tests/                  pytest smoke suite (auth, property moderation, engagement)
  static/
    uploads/                Property images (local disk — not durable in prod)
    seller_docs/             Seller verification documents (same caveat)

frontend/
  src/
    api/api.js            Axios client — one wrapper object per backend router
    context/AuthContext.jsx  Login/logout/register/Google login state
    layouts/DashboardLayout.jsx  Shared shell for buyer/seller/admin dashboards
    components/dashboard/   Sidebar, StatusBadge, shared dashboard widgets
    pages/
      dashboard/buyer/        BuyerDashboardHome, MyEnquiries, MyVisits, MyOffers, SavedProperties
      dashboard/seller/       SellerDashboardHome, MyListings, ListingAnalytics,
                              SellerEnquiries, SellerVisits, SellerOffers,
                              SellerDocuments, SellerVerification
      dashboard/shared/       NotificationsPage, SettingsPage
      Admin*.jsx              AdminUsers, AdminListings, AdminEnquiries, AdminBrokerSettings
      *Page.jsx                Home, Listings, PropertyDetail, Login, Register,
                              CreateListing, Profile
```

## How To Run Backend

```powershell
cd F:\eva-homes\backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

Backend runs at `http://127.0.0.1:8000`, docs at `http://127.0.0.1:8000/docs`.

Requires a `backend/.env` (not tracked in git) — see `README.md` for the full list of variables, including the optional `GOOGLE_CLIENT_ID` for Google Sign-In.

## How To Run Frontend

```powershell
cd F:\eva-homes\frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. Requires `frontend/.env` with `VITE_API_BASE_URL` (and optionally `VITE_GOOGLE_CLIENT_ID`, must match the backend's value exactly).

## Running Tests

```powershell
cd F:\eva-homes\backend
pip install -r requirements.txt -r requirements-dev.txt
pytest -q
```

Tests spin up an isolated on-disk SQLite database (`backend/tests/_test_eva_homes.db`, auto-deleted after the run) — they never touch your real `eva_homes.db`. The same suite runs in GitHub Actions on every push/PR to `main`.

## Test Accounts

`DEBUG=True` auto-seeds these on first run (skipped if the database already has users):

```text
Admin: admin@evahomes.com / admin123
User:  rahul@example.com / password123
User:  priya@example.com / password123
```

## Sign-In Options

- **Email + password** — standard JWT login, `POST /api/auth/login`.
- **Google Sign-In** — available on both Login and Register pages if `GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_ID` are configured. The backend verifies Google's ID token and finds-or-creates the matching account by email (`POST /api/auth/google`).

## Broker Settings In Website

Login as admin and open `/admin/settings/broker-contact` to edit the broker name, call number, and WhatsApp number shown on every property's contact panel.

## Admin Enquiries In Website

Login as admin and open `/admin/enquiries`:

- See every enquiry site-wide, filter by status/unread, search by buyer or property.
- Mark enquiries read/contacted/closed.
- **Send a reply** — it's timestamped, appears in a thread on the enquiry, and shows up on the buyer's own "My Enquiries" page plus an in-app notification. (If the enquiry has no linked account — a guest submission — there's nowhere for a reply to land; use "Reach Out" instead.)

## Admin Listings In Website

Login as admin and open `/admin/listings`:

- Review every property, filter by status/verified/featured/search.
- Approve, reject, or re-queue a listing (only admin can do this — sellers can still delist their own via sold/rented/inactive).
- Toggle verified and featured flags.

## Admin Users In Website

Login as admin and open `/admin/users`:

- Search/filter all registered users.
- Promote/demote admin access, activate/deactivate accounts (an admin cannot demote or deactivate themselves).
- Review a seller's uploaded verification documents and approve/reject their seller status.

## Important API Routes

```text
Auth
  POST /api/auth/register
  POST /api/auth/login
  POST /api/auth/google
  GET  /api/auth/me
  PUT  /api/auth/me
  PUT  /api/auth/me/password
  POST /api/auth/me/seller-profile
  POST /api/auth/me/seller-documents
  GET  /api/auth/users                    (admin)
  PUT  /api/auth/users/{id}                (admin)
  PUT  /api/auth/users/{id}/seller-verification  (admin)

Properties
  GET    /api/properties
  GET    /api/properties/featured
  GET    /api/properties/mine
  GET    /api/properties/mine/analytics
  GET    /api/properties/admin/all         (admin)
  GET    /api/properties/{id}
  GET    /api/properties/{id}/contact
  POST   /api/properties                   (seller)
  PUT    /api/properties/{id}
  DELETE /api/properties/{id}
  POST   /api/properties/upload-image

Enquiries / Visits / Offers
  POST /api/enquiries            (public)
  GET  /api/enquiries/mine
  GET  /api/enquiries/received
  GET  /api/enquiries            (admin)
  PUT  /api/enquiries/{id}       (admin)
  POST /api/enquiries/{id}/notes (admin — reply to buyer)

  POST /api/visits
  GET  /api/visits/mine
  GET  /api/visits/received
  PUT  /api/visits/{id}

  POST /api/offers
  GET  /api/offers/mine
  GET  /api/offers/received
  PUT  /api/offers/{id}

Saved properties / Notifications / Settings
  GET    /api/saved-properties
  POST   /api/saved-properties/{property_id}
  DELETE /api/saved-properties/{property_id}

  GET /api/notifications
  PUT /api/notifications/read-all
  PUT /api/notifications/{id}/read

  GET /api/settings/broker-contact
  PUT /api/settings/broker-contact  (admin)

  GET /api/cities
```

## Common Development Flow

1. Start backend (`uvicorn main:app --reload`), then frontend (`npm run dev`).
2. Open `http://localhost:5173`.
3. Browse listings → open a property → enquire, request a visit, or make an offer.
4. Log in as `admin@evahomes.com` to approve the listing/enquiry/seller and see it flow back to the buyer's dashboard.

## Database Notes

Default database is SQLite at `backend/eva_homes.db`. Schema changes go through **Alembic**, not manual edits:

```powershell
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

For a clean local reset: stop the server, delete `backend/eva_homes.db`, run `alembic upgrade head`, restart. (The old manual `ALTER TABLE` startup shims in `main.py` still run too, for backward compatibility with pre-Alembic databases — new changes should go through Alembic only.)

## Known Gaps (deferred, not forgotten)

- File uploads (property images, seller documents) live on local disk — fine for dev, not durable on a real cloud deploy.
- No email/SMS provider wired up — notifications and broker replies are in-app only.
- Production Postgres isn't provisioned yet; `DATABASE_URL` needs to be set on Render before going live.

See `CHANGELOG.md` for what's already been fixed and what's still open.
