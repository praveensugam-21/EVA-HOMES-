# EVA Homes Project Guide

This project is a full-stack, agent-mediated real estate marketplace with a React frontend and a FastAPI backend. Buyers and sellers never contact each other directly — every enquiry, visit, and offer is visible to (and moderated by) the agent/admin — unless a buyer pays a one-time fee to unlock a specific listing's exact location and/or the owner's real phone number.

Deployed live: React/Vite frontend on Vercel, FastAPI backend on Render, Postgres + file storage on Supabase.

## What The Project Does

**Everyone**
- Browse and search active property listings (city, type, price, bedrooms, keywords).
- Open a property detail page with photos, price, specs, and an agent-masked contact panel (with the agent's photo, if set).
- Submit an enquiry without logging in — including a lightweight one logged automatically when a visitor clicks the WhatsApp contact button.

**Buyers**
- Save properties to a personal shortlist.
- Submit enquiries, request visits (booked against a seller's specific-date availability slots), and make offers — each tracked separately with its own status.
- See agent **and seller** replies to their enquiries directly on their dashboard, plus a notification-bell badge in the Navbar.
- Sign in with email/password or a Google account.
- Pay a small one-time fee (offline UPI, admin-verified) to unlock a listing's exact map location (₹30 default) and/or the owner's real phone number (₹20 default) — two independent, separately-priced unlocks, tracked with amount paid on their own **My Unlocks** page.
- Get an automatic reminder notification about an hour before a confirmed visit.

**Sellers** (any buyer account can opt in — including admin accounts)
- Activate a seller profile and submit verification documents (Government ID is mandatory before the application enters review); listing requires admin approval of both the profile and each individual listing.
- Create, edit, and delist their own properties, with a GPS map picker for the exact location and multiple photos per room (bathroom/hall/kitchen/parking).
- Set specific-date visit availability slots per property for buyers to book against.
- View per-listing analytics (views, enquiry counts) and respond to enquiries/visits/offers on their properties — including replying directly in the enquiry thread, not just changing its status.

**Admin** (manages the marketplace; may additionally hold a seller profile and/or act as a buyer, same as any other account)
- Approve/reject seller verification documents from a dedicated **Seller Verifications** page.
- Moderate every listing (approve, reject, feature, verify) — a plain seller cannot self-approve their own listings; an admin who is also a seller can (a deliberate policy choice, not a gap).
- View and reply to every enquiry site-wide from one workspace; replies appear on the buyer's dashboard.
- Verify or reject location-unlock payment claims from the **Payment Verifications** page (Navbar shows a live pending-count badge, and shows which admin reviewed each decided claim).
- Manage user accounts: activate/deactivate, promote/demote admin.
- Edit the site-wide agent contact details (name, phone, WhatsApp, photo) and the two location-unlock payment fees.

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
    storage.py                Local disk / Supabase Storage abstraction (async)
  models/                 One SQLAlchemy model per table, incl. property_unlock.py, availability_slot.py
  routers/                One FastAPI router per domain, incl. unlocks.py, availability.py
  schemas/                Pydantic request/response models
  tests/                  pytest smoke suite (auth, property moderation, engagement)
  static/
    uploads/                Property images (local disk in dev — Supabase Storage in prod)
    seller_docs/             Seller verification documents (same)

frontend/
  vercel.json            Rewrites + security headers (CSP, HSTS, Permissions-Policy, etc.)
  src/
    api/api.js            Axios client — one wrapper object per backend router, incl. unlocksAPI
    context/AuthContext.jsx  Login/logout/register/Google login state
    layouts/DashboardLayout.jsx  Shared shell for buyer/seller/admin dashboards
    components/
      LocationPicker.jsx     Free Leaflet + OpenStreetMap GPS pin picker with reverse geocoding
      dashboard/               Sidebar, StatusBadge, shared dashboard widgets
    pages/                    Every route below Home is React.lazy()-loaded (App.jsx)
      dashboard/buyer/        BuyerDashboardHome, MyEnquiries, MyVisits, MyOffers,
                              SavedProperties, MyUnlocksPage
      dashboard/seller/       SellerDashboardHome, MyListings, ListingAnalytics,
                              SellerEnquiries (now with a reply thread), SellerVisits
                              (now with availability-slot management), SellerOffers,
                              SellerDocuments, SellerVerification
      dashboard/shared/       NotificationsPage, SettingsPage
      Admin*.jsx              AdminUsers, AdminListings, AdminEnquiries,
                              AdminBrokerSettings (agent contact + photo + two unlock fees),
                              AdminPaymentVerificationsPage, AdminSellerVerificationsPage
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

## Location & Owner-Phone Unlock (paid, manually verified, two independent unlocks)

A buyer can pay a one-time fee to see a specific listing's exact map pin and/or the owner's real phone number — normally both stay masked in favor of the agent's contact details. **Phone and map are separate, independently-priced unlocks** (₹20 and ₹30 by default) — a buyer can hold either, both, or neither for a given listing.

1. Buyer opens a property, sees unlock cards with the admin's UPI QR code and phone number (`GET /api/settings/payment-info`, returns `phone_unlock_fee` and `map_unlock_fee` separately).
2. Buyer pays via their own UPI app (no payment gateway integration — genuinely offline), then submits a claim for the specific unlock type with a **required** transaction reference (`POST /api/properties/{id}/unlock-request`, body includes `unlock_type: "phone" | "map"`, rate-limited to 5 per 5 minutes).
3. Admin reviews pending requests on **Payment Verifications** (`/admin/payment-verifications`, `GET /api/unlocks`) — the Navbar shows a live red badge with the pending count, and each already-decided row shows which admin reviewed it — and checks their own UPI app before clicking Verify or Reject (`PUT /api/unlocks/{id}`). The buyer gets notified either way.
4. Once verified, `GET /api/properties/{id}` returns `map_unlocked` (gates `google_maps_link`/`latitude`/`longitude`) and `GET /.../contact` returns `phone_unlocked` (gates the real owner phone) — independently, checked server-side on every request, never just remembered client-side.
5. Buyer tracks their own requests (type, amount paid, pending/verified/rejected) on **My Unlocks** (`/dashboard/buyer/unlocks`) — the whole card is clickable through to the property.

`PropertyUnlock.amount_paid` snapshots the fee at request time, so a later admin fee change never retroactively rewrites what a buyer actually paid. Admin configures the QR image, UPI phone number, agent photo, and the two fees from **Agent Settings** (`/admin/settings/broker-contact`).

## Seller Verification (dedicated admin workspace)

A separate flow from per-listing approval — this gates whether an account can list at all.

1. Buyer activates a seller profile (`POST /api/auth/me/seller-profile`) — status starts `unverified`.
2. Uploads documents from **My Documents** (`/dashboard/seller/documents`) — types: Government ID (mandatory), Address Proof, Electricity Bill, Business License (optional). Uploading an `id_proof` document is specifically what flips status to `pending` — any other document type alone isn't enough to enter the review queue.
3. Admin reviews on **Seller Verifications** (`/admin/seller-verifications`, `GET /api/auth/sellers?status=pending`) — views each uploaded document, then Verifies or Rejects (`PUT /api/auth/users/{id}/seller-verification`). The seller is notified either way. The Verify/Reject buttons only appear while status is `pending`/`unverified` — they correctly disappear once a decision has been made.

A seller can create listings as soon as they activate a profile — verification and per-listing approval are independent gates, not one blocking the other.

## Visit Availability Slots & Automated Reminders

Sellers no longer just wait for a buyer to propose a free-text date — they define exactly when they're available.

1. Seller adds one-off slots (a **specific calendar date**, not a recurring weekly pattern, plus start/end time) per property from their Visits page (`POST /api/sellers/me/availability-slots`).
2. Buyer sees that property's open, future, unbooked slots (`GET /api/properties/{id}/availability`) and books one (`POST /api/visits`, body is just `slot_id` + an optional message) — the slot immediately flips `is_booked=True` so nobody else can claim it.
3. If the seller rejects or the buyer cancels, the slot frees back up automatically.
4. A Render **Cron Job** (`eva-homes-visit-reminders`, defined in `render.yaml`) hits `POST /api/visits/dispatch-reminders` every 10 minutes — a confirmed visit within about an hour gets a reminder notification sent to both buyer and seller, exactly once (`Visit.reminder_sent_at` makes it idempotent). This endpoint is authorized by a shared-secret header (`CRON_SECRET`), not a user JWT — it refuses every request until that secret is configured, so it can't be an accidentally-open endpoint.

**Why a separate Cron Job and not an in-process scheduler**: Render's free web service spins down after inactivity, so a scheduler running inside the same process as the API would silently stop firing whenever the app was asleep. The Cron Job is a second, independent Render service that wakes on its own schedule.

## Notifications

Every in-app event (new enquiry, agent/seller reply, visit/offer status change, verification decision, payment verification decision, visit reminder) writes a row via `core/notify.py`'s `notify()` helper — in-app/DB only, no email/SMS provider wired up yet. The Navbar shows a **bell icon with a live unread-count badge** (desktop and mobile) for any logged-in user; the full list with mark-as-read lives at `/dashboard/notifications`.

## GPS Map Picker & Multi-Photo Uploads (Create Listing)

- **Exact location**: `LocationPicker` (Leaflet + OpenStreetMap tiles, Nominatim for search/reverse-geocoding — all free, no API key). Search an address, click "My location" for GPS, or click/drag the pin directly on the map. The resolved address displays live; a soft warning appears if the pin doesn't match the typed City field (never blocks submission).
- **Room photos**: Bathroom/Hall/Kitchen/Parking each accept multiple photos (grid gallery, add/remove any of them) — the first photo in each room is that room's required "hero" image, extras ride along as captioned gallery entries. Capped at 10 photos/room and 5MB/file, enforced on the backend (not just the UI).

## Agent Settings In Website

Login as admin and open `/admin/settings/broker-contact` (route path unchanged; the page and all its labels now say "Agent") to edit the agent name, call number, WhatsApp number, photo, and the two location-unlock payment fees (phone/map).

## Admin Enquiries In Website

Login as admin and open `/admin/enquiries`:

- See every enquiry site-wide, filter by status/unread, search by buyer or property.
- Mark enquiries read/contacted/closed.
- **Send a reply** — it's timestamped, appears in a thread on the enquiry, and shows up on the buyer's own "My Enquiries" page plus an in-app notification. (If the enquiry has no linked account — a guest submission — there's nowhere for a reply to land; use "Reach Out" instead.) The property's own seller can also reply to the same thread from their own Enquiries page — this is no longer admin-exclusive.

## Admin Listings In Website

Login as admin and open `/admin/listings`:

- Review every property, filter by status/verified/featured/search.
- Approve, reject, or re-queue a listing (only admin can do this — sellers can still delist their own via sold/rented/inactive; an admin who also holds a seller profile can approve their own listings, deliberately).
- Toggle verified and featured flags.

## Admin Users In Website

Login as admin and open `/admin/users`:

- Search/filter all registered users, paginated 20 at a time with a "Load More" button.
- Every user card shows full detail: phone + verification, email verification, city, address, bio, account ID, join date, and (for real sellers) business name and seller-since date.
- Promote/demote admin access, activate/deactivate accounts (an admin cannot demote or deactivate themselves).
- Seller document review and verification now live on their own page — see below — not here.

## Admin Seller Verifications In Website

Login as admin and open `/admin/seller-verifications`:

- Filter by unverified/pending/verified/rejected/all, pending sorted first.
- View each seller's uploaded documents inline.
- Verify or reject with one click — the seller is notified either way. Buttons correctly disappear once a decision has already been made (no re-clicking an already-verified seller).

## Admin Payment Verifications In Website

Login as admin and open `/admin/payment-verifications`:

- Filter by pending/verified/rejected/all.
- See buyer, property, unlock type (phone/map), claimed payment reference, amount, and timestamp together — plus which admin handled it, once decided.
- Verify or reject with one click — the buyer is notified and, if verified, immediately gets access to that specific unlock (phone or map) on that listing.

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
  GET  /api/auth/me/seller-profile
  PUT  /api/auth/me/seller-profile
  GET  /api/auth/me/seller-documents
  POST /api/auth/me/seller-documents           (id_proof upload is what unlocks "pending" review)
  GET  /api/auth/users                          (admin, paginated: limit/offset)
  PUT  /api/auth/users/{id}                      (admin)
  GET  /api/auth/users/{id}/seller-documents     (admin)
  PUT  /api/auth/users/{id}/seller-verification  (admin)
  GET  /api/auth/sellers                          (admin, paginated, filter by status)

Properties
  GET    /api/properties
  GET    /api/properties/featured
  GET    /api/properties/mine
  GET    /api/properties/mine/analytics
  GET    /api/properties/admin/all         (admin)
  GET    /api/properties/{id}               (map_unlocked gates google_maps_link/lat/lng)
  GET    /api/properties/{id}/contact       (phone_unlocked gates real owner phone)
  POST   /api/properties                   (seller — admin included, if also a seller)
  PUT    /api/properties/{id}
  DELETE /api/properties/{id}
  POST   /api/properties/upload-image      (5MB cap, enforced server-side)
  POST   /api/properties/{id}/unlock-request  (buyer, rate-limited, unlock_type: phone|map)

Location Unlocks
  GET  /api/unlocks/mine
  GET  /api/unlocks                        (admin, includes pending_count)
  PUT  /api/unlocks/{id}                    (admin — verify/reject)

Availability Slots / Visits
  POST   /api/sellers/me/availability-slots       (seller — adds a specific-date slot)
  GET    /api/sellers/me/availability-slots
  DELETE /api/sellers/me/availability-slots/{id}
  GET    /api/properties/{id}/availability         (public — unbooked, future slots)

  POST /api/visits                        (buyer — books a slot_id)
  GET  /api/visits/mine
  GET  /api/visits/received
  PUT  /api/visits/{id}
  POST /api/visits/dispatch-reminders     (cron-only, X-Cron-Secret header, not a user route)

Enquiries / Offers
  POST /api/enquiries            (public — anyone, including admins now)
  GET  /api/enquiries/mine
  GET  /api/enquiries/received
  GET  /api/enquiries            (admin)
  PUT  /api/enquiries/{id}       (admin, or the seller who owns the property)
  POST /api/enquiries/{id}/notes (admin, or the seller who owns the property — reply to buyer)

  POST /api/offers               (buyer — admin included, if also a buyer)
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

  GET /api/settings/broker-contact   (returns photo_url, phone_unlock_fee, map_unlock_fee)
  PUT /api/settings/broker-contact  (admin)
  GET /api/settings/payment-info     (public — QR/phone/two fees for the unlock feature)

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

- No email/SMS provider wired up — notifications and agent/seller replies are in-app only.
- No forgot-password flow.
- In-memory rate limiter — fine for a single backend instance, won't hold if it ever scales to multiple workers.
- `latitude`/`longitude` are captured by the map picker but nothing reads them yet (groundwork for a future radius search).
- No app UI for hard-deleting a user account (deliberate — deletion is a direct Supabase action, not an in-app button).

File storage and the database are **not** gaps anymore — both are live on Supabase in production (see README's "Image & Document Uploads" section).

See `docs/tobedone.md` for the current deploy/gap status and `CHANGELOG.md` for what's already been fixed and why.
