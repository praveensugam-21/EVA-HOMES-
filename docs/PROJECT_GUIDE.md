# EVA Homes Project Guide

This project is a full-stack, broker-mediated real estate marketplace with a React frontend and a FastAPI backend. Buyers and sellers never contact each other directly — every enquiry, visit, and offer is visible to (and moderated by) the broker/admin — unless a buyer pays a one-time fee to unlock a specific listing's exact location and the owner's real phone number.

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
- Pay a small one-time fee (offline UPI, admin-verified) to unlock a listing's exact map location and the owner's real phone number — tracked on their own **My Unlocks** page.

**Sellers** (any buyer account can opt in)
- Activate a seller profile and submit verification documents; listing requires admin approval of both the profile and each individual listing.
- Create, edit, and delist their own properties, with a GPS map picker for the exact location and multiple photos per room (bathroom/hall/kitchen/parking).
- View per-listing analytics (views, enquiry counts) and respond to enquiries/visits/offers on their properties.

**Admin** (manages the marketplace — cannot buy, sell, enquire, or hold a seller profile themselves)
- Approve/reject seller verification documents.
- Moderate every listing (approve, reject, feature, verify) — sellers cannot self-approve their own listings.
- View and reply to every enquiry site-wide from one workspace; replies appear on the buyer's dashboard.
- Verify or reject location-unlock payment claims from the **Payment Verifications** page (Navbar shows a live pending-count badge).
- Manage user accounts: activate/deactivate, promote/demote admin.
- Edit the site-wide broker contact details and the location-unlock payment QR/phone/fee.

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
    rate_limit.py            Per-IP/per-user in-memory rate limiter
  models/                 One SQLAlchemy model per table, including property_unlock.py
  routers/                One FastAPI router per domain, including unlocks.py
  schemas/                Pydantic request/response models
  tests/                  pytest smoke suite (auth, property moderation, engagement)
  static/
    uploads/                Property images (local disk — not durable in prod, 5MB/file cap)
    seller_docs/             Seller verification documents (same caveat)

frontend/
  src/
    api/api.js            Axios client — one wrapper object per backend router, incl. unlocksAPI
    context/AuthContext.jsx  Login/logout/register/Google login state
    layouts/DashboardLayout.jsx  Shared shell for buyer/seller/admin dashboards
    components/
      LocationPicker.jsx     Free Leaflet + OpenStreetMap GPS pin picker with reverse geocoding
      dashboard/               Sidebar, StatusBadge, shared dashboard widgets
    pages/
      dashboard/buyer/        BuyerDashboardHome, MyEnquiries, MyVisits, MyOffers,
                              SavedProperties, MyUnlocksPage
      dashboard/seller/       SellerDashboardHome, MyListings, ListingAnalytics,
                              SellerEnquiries, SellerVisits, SellerOffers,
                              SellerDocuments, SellerVerification
      dashboard/shared/       NotificationsPage, SettingsPage
      Admin*.jsx              AdminUsers, AdminListings, AdminEnquiries,
                              AdminBrokerSettings, AdminPaymentVerificationsPage
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

The GPS map picker (Leaflet + OpenStreetMap + Nominatim geocoding) needs no API key or account — it's free out of the box.

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

## Location & Owner-Phone Unlock (paid, manually verified)

A buyer can pay a one-time fee (default ₹20, configurable) to see a specific listing's exact map pin and the owner's real phone number — normally both stay masked in favor of the broker's contact details.

1. Buyer opens a property, sees a "🔒 Exact Location & Owner's Number — ₹20" card with the admin's UPI QR code and phone number (`GET /api/settings/payment-info`).
2. Buyer pays via their own UPI app (no payment gateway integration — genuinely offline), then clicks "I've Paid" with an optional transaction reference (`POST /api/properties/{id}/unlock-request`, rate-limited to 5 per 5 minutes).
3. Admin reviews pending requests on **Payment Verifications** (`/admin/payment-verifications`, `GET /api/unlocks`) — the Navbar shows a live red badge with the pending count — and checks their own UPI app before clicking Verify or Reject (`PUT /api/unlocks/{id}`). The buyer gets notified either way.
4. Once verified, `GET /api/properties/{id}` and `.../contact` include the real `google_maps_link`/`latitude`/`longitude` and the owner's unmasked phone for that buyer, on that listing, permanently — checked server-side on every request, never just remembered client-side.
5. Buyer tracks their own requests (pending/verified/rejected) on **My Unlocks** (`/dashboard/buyer/unlocks`).

Admin configures the QR image, UPI phone number, and fee from **Broker Settings** (`/admin/settings/broker-contact`).

## GPS Map Picker & Multi-Photo Uploads (Create Listing)

- **Exact location**: `LocationPicker` (Leaflet + OpenStreetMap tiles, Nominatim for search/reverse-geocoding — all free, no API key). Search an address, click "My location" for GPS, or click/drag the pin directly on the map. The resolved address displays live; a soft warning appears if the pin doesn't match the typed City field (never blocks submission).
- **Room photos**: Bathroom/Hall/Kitchen/Parking each accept multiple photos (grid gallery, add/remove any of them) — the first photo in each room is that room's required "hero" image, extras ride along as captioned gallery entries. Capped at 10 photos/room and 5MB/file, enforced on the backend (not just the UI).

## Broker Settings In Website

Login as admin and open `/admin/settings/broker-contact` to edit the broker name, call number, WhatsApp number, and the location-unlock payment QR/phone/fee.

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

- Search/filter all registered users, paginated 20 at a time with a "Load More" button.
- Every user card shows full detail: phone + verification, email verification, city, address, bio, account ID, join date, and (for real sellers) business name and seller-since date.
- Promote/demote admin access, activate/deactivate accounts (an admin cannot demote or deactivate themselves).
- Review a seller's uploaded verification documents and approve/reject their seller status.

## Admin Payment Verifications In Website

Login as admin and open `/admin/payment-verifications`:

- Filter by pending/verified/rejected/all.
- See buyer, property, claimed payment reference, and timestamp together.
- Verify or reject with one click — the buyer is notified and, if verified, immediately gets access to that listing's exact location and owner phone.

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
  GET  /api/auth/users                    (admin, paginated: limit/offset)
  PUT  /api/auth/users/{id}                (admin)
  PUT  /api/auth/users/{id}/seller-verification  (admin)

Properties
  GET    /api/properties
  GET    /api/properties/featured
  GET    /api/properties/mine
  GET    /api/properties/mine/analytics
  GET    /api/properties/admin/all         (admin)
  GET    /api/properties/{id}               (gates google_maps_link/lat/lng behind unlock)
  GET    /api/properties/{id}/contact       (gates real owner phone behind unlock)
  POST   /api/properties                   (seller, not admin)
  PUT    /api/properties/{id}
  DELETE /api/properties/{id}
  POST   /api/properties/upload-image      (5MB cap, enforced server-side)
  POST   /api/properties/{id}/unlock-request  (buyer, rate-limited)

Location Unlocks
  GET  /api/unlocks/mine
  GET  /api/unlocks                        (admin, includes pending_count)
  PUT  /api/unlocks/{id}                    (admin — verify/reject)

Enquiries / Visits / Offers
  POST /api/enquiries            (public, not admin)
  GET  /api/enquiries/mine
  GET  /api/enquiries/received
  GET  /api/enquiries            (admin)
  PUT  /api/enquiries/{id}       (admin, or the seller who owns the property)
  POST /api/enquiries/{id}/notes (admin — reply to buyer)

  POST /api/visits               (buyer, not admin)
  GET  /api/visits/mine
  GET  /api/visits/received
  PUT  /api/visits/{id}

  POST /api/offers               (buyer, not admin)
  GET  /api/offers/mine
  GET  /api/offers/received
  PUT  /api/offers/{id}

Saved properties / Notifications / Settings
  GET    /api/saved-properties
  POST   /api/saved-properties/{property_id}   (buyer, not admin)
  DELETE /api/saved-properties/{property_id}

  GET /api/notifications
  PUT /api/notifications/read-all
  PUT /api/notifications/{id}/read

  GET /api/settings/broker-contact
  PUT /api/settings/broker-contact  (admin)
  GET /api/settings/payment-info     (public — QR/phone/fee for the unlock feature)

  GET /api/cities
```

## Common Development Flow

1. Start backend (`uvicorn main:app --reload`), then frontend (`npm run dev`).
2. Open `http://localhost:5173`.
3. Browse listings → open a property → enquire, request a visit, or make an offer.
4. Log in as `admin@evahomes.com` to approve the listing/enquiry/seller and see it flow back to the buyer's dashboard.
5. As a buyer, try "I've Paid" on a property's location-unlock card, then verify it from `/admin/payment-verifications` and confirm the buyer's view unlocks.

## Database Notes

Default database is SQLite at `backend/eva_homes.db`. Schema changes go through **Alembic**, not manual edits:

```powershell
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

For a clean local reset: stop the server, delete `backend/eva_homes.db`, run `alembic upgrade head`, restart. (The old manual `ALTER TABLE` startup shims in `main.py` still run too, for backward compatibility with pre-Alembic databases — new changes should go through Alembic only.)

**Note on enum columns**: SQLAlchemy's `Enum` type stores the Python member *name* (e.g. `OPEN`) in the database, not its lowercase `.value` (`open`). Any raw SQL in a migration that touches an enum column (e.g. a data backfill) must write the uppercase name, or reads will fail with a `LookupError`. See `docs/ERROR.md`.

## Known Gaps (deferred, not forgotten)

- File uploads (property images, seller documents) live on local disk — fine for dev, not durable on a real cloud deploy.
- No email/SMS provider wired up — notifications and broker replies are in-app only.
- No forgot-password flow.
- Production Postgres isn't provisioned yet; `DATABASE_URL` needs to be set on Render before going live.
- `latitude`/`longitude` are captured by the map picker but nothing reads them yet (groundwork for a future radius search).

See `docs/tobedone.md` for the full deploy checklist and `CHANGELOG.md` for what's already been fixed and why.
