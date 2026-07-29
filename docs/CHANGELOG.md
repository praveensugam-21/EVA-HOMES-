# Changelog

A running, plain-English summary of what changed and why — kept up to date after each work session so you can see what happened without re-reading the full conversation. Newest entries at the top. This is a summary log, not a commit history (see `git log` for that).

---

## 2026-07-29 — Phone number now required to list a property

Found during a project re-analysis: `User.phone` was optional everywhere, and nothing stopped a seller from creating a listing without ever setting one. That's a real problem given the paid location/phone-unlock feature — a buyer paying ₹20 specifically for the owner's real phone number would get `null` if the seller never provided one.

- **Backend**: `POST /api/properties` now rejects (400) if `current_user.phone` is empty, with a clear message. Deliberately scoped to listing *creation* only — not added to `get_seller_user` broadly, so it doesn't lock sellers out of viewing their existing listings/analytics if they signed up before this rule existed.
- **Frontend**: `CreateListingPage` now checks this upfront (before the seller even starts filling out the form) and shows a "Add a phone number first" screen with a direct link to their profile, instead of letting them fill out the whole form and hit a error at the very end.
- **Tests**: `register_and_login`'s test helper now defaults to a real phone number (previously `None`), since listing creation needs one — fixed 9 tests that broke because of this new rule, and added a new one (`test_seller_without_phone_cannot_create_property`) that explicitly covers the blocked case. 16/16 passing.
- Verified live: a seller with a phone (seed data) still creates listings normally; a fresh seller without one gets a clean 400.

---

## 2026-07-28 (final) — Full documentation sync

Brought every doc up to date with everything built this session (location-unlock feature, GPS map picker, multi-photo uploads, admin exclusivity, parking type, upload/rate limits, pending-count badge):

- `docs/tobedone.md` — moved the 6 audit items to Done, added the still-open forgot-password gap, added new "after launch" items (lat/lng radius search, gallery grouping).
- `docs/PROJECT_GUIDE.md` — new "Location & Owner-Phone Unlock" and "GPS Map Picker & Multi-Photo Uploads" sections, updated folder tree, API route list, and admin description (manages, doesn't participate).
- `README.md` — feature list per role updated, upload cap documented, folder tree updated.
- `docs/BROKER_CONTACT_FLOW.md` — new "Paid Exception" section explaining how the location-unlock feature deliberately bypasses the masked-contact model for verified, paying buyers only.
- `docs/pro.md` — added `PropertyUnlock` to the data model table, updated buyer/admin journeys, added two new "what I learned" points (admin exclusivity enforced server-side, the unlock feature as a second zero-infrastructure-cost monetization mechanic).
- `docs/ERROR.md` — logged two real bugs hit this session: the SQLAlchemy `Enum` name-vs-value migration bug, and the nested-`<form>` bug in `LocationPicker`.

---

## 2026-07-28 (very late) — Closed all 6 gaps found in the post-launch feature audit

Fixed every item identified when re-auditing the location-unlock, GPS picker, and multi-photo-upload features added earlier this session:

- **Upload size/count limits**: `upload_image()` now streams to disk in 1MB chunks, counts bytes, and aborts + deletes the partial file with a 413 if it exceeds 5MB — verified live with a real 6MB upload attempt (rejected, no orphaned file left behind). Frontend also caps each room at 10 photos and pre-filters oversized files client-side before even attempting the upload.
- **Rate limit on unlock-request**: 5 requests / 5 minutes per user, same `rate_limiter` pattern used everywhere else in the app — verified live, the 6th rapid request in a row correctly got a 429.
- **Admin alert for pending unlocks**: `GET /api/unlocks` now returns `pending_count`; the Navbar's "Payments" link shows a red badge with the live count (both desktop and mobile menus) whenever an admin is logged in.
- **Lat/lng columns added to `Property`** (nullable, Alembic migration, no data loss) — `LocationPicker`'s pin now writes real `latitude`/`longitude` alongside `google_maps_link`, verified round-tripping correctly through the API. Nothing reads them yet; this is groundwork for a future "properties near me" radius search.
- **Pinned-location vs. typed-city mismatch warning**: soft, non-blocking check — if the reverse-geocoded address for the map pin doesn't contain the typed City field, a small amber warning shows under the City input so the seller can catch an honest mistake (pinning the wrong spot, or a typo in the city name) without being forced to fix it.
- **Extra room photos now numbered in the gallery** (e.g. "Kitchen 1/3", "Kitchen 2/3") instead of three flat tiles all just labeled "Kitchen".

Verified end-to-end: full pytest suite (15/15), a clean production build, and live tests against the running backend for the upload cap, the rate limit, and the pending-count badge.

## 2026-07-28 (later night) — Paid location/phone unlock, parking type

New monetization feature: exact map location and the seller's real phone number are now paywalled per listing, unlocked via an offline UPI payment that admin verifies manually (no payment gateway).

- **New `PropertyUnlock` table**: one row per (buyer, property), status `pending`/`verified`/`rejected`, optional payment reference. Unique per buyer+property — re-requesting after a rejection updates the same row instead of piling up duplicates.
- **`BrokerSettings` extended** with `payment_qr_image_url`, `payment_phone`, `unlock_fee` (defaults to ₹20) — editable from Admin → Broker Settings, with a QR image upload.
- **New public endpoint** `GET /api/settings/payment-info` — just the QR/phone/fee, for the unlock card on the property page.
- **New `unlocks.py` router**: `POST /api/properties/{id}/unlock-request` (buyer claims payment), `GET /api/unlocks/mine` (buyer's own requests), `GET /api/unlocks` + `PUT /api/unlocks/{id}` (admin lists and verifies/rejects — buyer gets notified either way).
- **`GET /api/properties/{id}` and `.../contact` now gate on unlock status**: `google_maps_link` is nulled out and the real owner phone is withheld unless the caller owns the listing, is an admin, or has a `verified` unlock for that specific property. Verified end-to-end: a fresh unlock → pending → admin verifies → buyer's next request to the same endpoints returns the real data, no reload-and-hope.
- **New pages**: buyer-side `My Unlocks` (dashboard sidebar), admin-side `Payment Verifications` (Navbar admin links) — verify/reject with one click, buyer + property + reference shown together.
- **Parking replaced**: `has_parking` (boolean) → `parking_type` (`none`/`open`/`closed`) on `Property` — a real Alembic migration, not a manual patch; existing `has_parking=true` rows were backfilled to `open` rather than silently losing that data. Hit and fixed one real bug during this: SQLAlchemy's `Enum` column stores the Python member *name* (`OPEN`), not its lowercase `.value` (`open`) — the first migration attempt wrote lowercase and 500'd on every read until caught and corrected.

Every piece tested against the running backend before moving to the next (unlock request → admin verify → buyer sees unlocked data → settings update → payment-info reflects it), plus the full pytest suite (15/15) and a clean production build at the end.

## 2026-07-28 (night) — Admin is a manager, not a marketplace participant

Previously an admin account could also act as a buyer/seller — `get_seller_user` explicitly bypassed the seller-profile check for admins, so admin could create listings, and nothing stopped an admin from submitting enquiries, requesting visits, making offers, saving properties, or activating a seller profile. Closed all of that:

- **Backend**: added an explicit `is_admin` check (403) to seller-profile creation, listing creation (`get_seller_user` no longer bypasses for admins), enquiry submission, visit requests, offers, and saved-properties — verified live against the real seeded admin account, all six return 403 with a clear reason.
- **Frontend**: `Navbar` no longer shows "Dashboard" or "+ List Property" for admin accounts; `SellerRoute` in `App.jsx` no longer lets admin through to seller-dashboard pages (it would have been a dead end anyway now that the backend rejects those calls).
- Admin's actual management powers — moderating any listing, editing/deactivating any user, replying to any enquiry — go through separate `get_admin_user`/inline `is_admin` checks that were untouched, and are confirmed still working.

Also reorganized `AdminUsersPage.jsx` per the same principle plus a "show everything" request: an admin row no longer shows a misleading "Buyer" badge (only real buyer/seller accounts get that badge now), and every user's card now shows their full profile — phone + verification status, email verification, city, address, bio, account ID, join date, and (for real sellers) business name and seller-since date — organized into one labeled details grid instead of the previous two-field summary.

Confirmed with the full test suite (15/15 pass) and a clean production build both before and after.

## 2026-07-28 (evening) — Site-wide visual redesign

Redesigned the public home page (Navbar, Hero, Featured, Cities, WhyUs, Steps, Footer) around a real design system instead of raw Tailwind defaults: a considered neutral scale (`ink`/`ink-soft`/`muted`/`faint`/`line`/`surface`) plus one deliberate accent — later dropped in favor of pure black/white/grey per feedback, with black borders on every card. Typography moved from a single all-purpose Poppins to a real pairing (Outfit for headings, Plus Jakarta Sans for body), registered as Tailwind v4 `@theme` tokens (`font-display`, `bg-ink`, etc.) rather than hardcoded hex values, so the whole system lives in one place (`index.css`).

Then extended that same system to **every remaining page** — all 27 remaining frontend files (every dashboard page, both auth pages, all three admin pages, property detail, create-listing, profile) — via a scripted `zinc-*` → design-token migration (746 class replacements) rather than hand-editing each file, so the whole app now shares one consistent visual language instead of only the home page. Verified with a full production build (`vite build`) afterward — compiles clean, no leftover `zinc-*` classes anywhere.

Also: removed the `Testimonials` section entirely (fabricated client quotes shouldn't ship) and added a monochrome shimmer/pulse/twinkle animation to the "How It Works" step circles, staggered so it ripples down the sequence — respects `prefers-reduced-motion`.

Added the contact email (`evahomes360@gmail.com`) to the footer.

## 2026-07-28 (later) — Full frontend audit: 3 bugs found and fixed

Went through every remaining unchecked page (19 total: `PropertyDetailPage`'s visit/offer forms, every buyer/seller dashboard page, all three admin pages, Profile/CreateListing/Notifications) and cross-checked each one's API calls against the actual backend routes and response shapes. 16 were clean. Found and fixed 3 real bugs:

- **Sellers couldn't update their own received enquiries.** `SellerEnquiriesPage.jsx`'s "Mark new/contacted/closed" buttons called `PUT /api/enquiries/{id}`, but that endpoint was admin-only — every click silently 403'd for any seller who wasn't also an admin. Fixed by allowing the property's owner to update `status`/`is_read` too; `broker_notes` (the buyer-facing reply channel) stays admin-only either way. Verified live: the property owner now gets 200, a non-owner still correctly gets 403, and a non-admin owner still can't touch `broker_notes`.
- **Price displayed twice, garbled** on `SavedPropertiesPage.jsx` and `MyListingsPage.jsx` — both rendered `${price} ${price_label}` when `price_label` is already a complete string (e.g. "₹85 Lakhs"), producing things like "8500000 ₹85 Lakhs". Every other page in the app does `price_label || fallback` correctly; these two didn't. Fixed to match.

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
