# To Be Done — Deploy Readiness

What's already working, what's missing, and the exact steps to get there, in order. **The app is live and deployed** (Render backend + Vercel frontend + Supabase Postgres/Storage) — this doc now tracks remaining gaps, not a pre-launch checklist.

---

## ✅ Done — live in production

- [x] Backend (FastAPI, Render) + Frontend (Vite/React, Vercel) deployed and live
- [x] **Postgres database provisioned** (Supabase) — `DATABASE_URL` set on Render, data persists across deploys/restarts
- [x] **Durable file storage** (Supabase Storage) — `STORAGE_BACKEND=supabase`, property images and seller documents survive restarts
- [x] `ALLOWED_ORIGINS` set to the real Vercel frontend domain
- [x] Google OAuth Client ID's Authorized JavaScript origins include the real production domain — Google Sign-In confirmed working live
- [x] Auth: JWT login + Google Sign-In (on both Login and Register pages)
- [x] Alembic migrations wired in and applied on every Render deploy automatically
- [x] CI: GitHub Actions runs the test suite on every push/PR to `main` (16/16 passing)
- [x] Security pass: `SECRET_KEY` rotated, `.env`/`.db` untracked from git, CORS wildcard removed, OTP endpoints rate-limited, auto-seed gated behind `DEBUG`/`SEED_DB`
- [x] **Full security headers on both deploys** — Strict-Transport-Security, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (`frontend/vercel.json` for the real product surface, `backend/main.py` for the API/docs surface)
- [x] **Foreign keys have real `ON DELETE` behavior** — deleting a user or property used to fail with a `ForeignKeyViolation` on Postgres the moment it had any related row; every FK across the schema now cascades (or `SET NULL` where appropriate) correctly
- [x] Moderation-bypass bug fixed — sellers can no longer self-approve their own listings
- [x] **Admin can now also be a buyer/seller** (deliberate policy change, see `CHANGELOG.md` 2026-08-08) — self-approval on an admin's own listings is allowed by design now, not a bug
- [x] Agent (formerly "broker") replies reach the buyer's dashboard + trigger an in-app notification; sellers can now reply too, not just admin
- [x] **Notification bell + unread badge** in the Navbar — previously unread count only showed as text on the Notifications page itself
- [x] Paid location/owner-phone unlock feature — **now two independent, separately-priced unlocks** (phone ₹20, map ₹30 by default), payment reference mandatory, admin-verified
- [x] Free GPS map picker (Leaflet + OpenStreetMap, no API key/billing) for exact property location, with reverse-geocoded address display
- [x] Multi-photo uploads per room, capped at 5MB/file and 10 photos/room (enforced server-side, not just the UI) — now uploads asynchronously, fixed a real event-loop-blocking bug
- [x] Parking is a real `open`/`closed`/`none` type, not a boolean
- [x] **Seller verification has its own admin page** (`/admin/seller-verifications`), Verify/Reject buttons correctly disable once a decision is made, Government ID is now a mandatory document
- [x] **Visit availability slots + automated 1-hour-before reminder** — sellers set specific-date visit slots, buyers book against one, a Render Cron Job dispatches reminders every 10 minutes
- [x] **N+1 queries fixed** across every admin/dashboard list endpoint; **frontend code-split** by route (main JS bundle down ~19% gzipped, dashboard pages load on demand)
- [x] Docs reorganized into `docs/`, `CHANGELOG.md` kept up to date

## ❌ Still missing — real gaps, not launch blockers

- [ ] **No real email/SMS delivery** — OTP codes and notifications are in-app/DB only, nothing is actually sent
- [ ] **No forgot-password flow** — there's genuinely no way for a user to recover access if they forget their password (matters more now that Google-only accounts have an unusable random password with zero recovery path)
- [ ] **In-memory rate limiter** — fine for one backend instance, won't hold if it ever scales to multiple workers
- [ ] **No app UI for hard-deleting a user account** — deliberate (see `CHANGELOG.md`/session notes); deletion is a direct Supabase action only, never exposed as a button in the app

## ⏳ After launch — do when ready, not urgent

- [ ] Wire a real email provider (Resend / SES) for OTP + notifications
- [ ] Wire an SMS provider (Twilio / MSG91) if phone OTP is wanted
- [ ] Move rate limiting to Redis if traffic ever grows beyond a single backend instance
- [ ] Use the `latitude`/`longitude` columns (populated by the map picker but not read by anything yet) for a real "properties near me" radius search
- [ ] Group multi-photo room galleries visually on the public listing beyond the numbered labels ("Kitchen 1/3") already in place
- [ ] The "Assistant to help you" paid-concierge feature raised by the platform owner — deliberately deferred, not yet defined

---

See `CHANGELOG.md` for the full history of what changed and why, and `PROJECT_GUIDE.md` for how each piece of the app actually works.
