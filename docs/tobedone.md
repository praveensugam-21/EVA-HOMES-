# To Be Done — Deploy Readiness

What's already working, what's missing before a real production deploy, and the exact steps to get there, in order.

---

## ✅ Done — working right now, locally

- [x] Backend (FastAPI) + Frontend (Vite/React) run and pass all 15 pytest tests
- [x] Auth: JWT login + Google Sign-In (on both Login and Register pages)
- [x] Alembic migrations wired in (baseline captured, dev DB stamped as current)
- [x] CI: GitHub Actions runs the test suite on every push/PR to `main`
- [x] Security pass: `SECRET_KEY` rotated, `.env`/`.db` untracked from git, CORS wildcard removed, OTP endpoints rate-limited, auto-seed gated behind `DEBUG`/`SEED_DB`
- [x] Moderation-bypass bug fixed — sellers can no longer self-approve their own listings
- [x] Broker replies reach the buyer's dashboard + trigger an in-app notification
- [x] Docs reorganized into `docs/`, `CHANGELOG.md` kept up to date

## ❌ Missing — blocks a real production deploy

- [ ] **No persistent database** — `DATABASE_URL` isn't set on Render, so it falls back to SQLite, which resets on every deploy/restart
- [ ] **No durable file storage** — property images and seller documents live on local disk, lost on every Render/Vercel restart
- [ ] **No real email/SMS delivery** — OTP codes and notifications are in-app/DB only, nothing is actually sent
- [ ] **`ALLOWED_ORIGINS`** only allows `localhost` right now — needs the real frontend domain
- [ ] **Google OAuth Client ID** only allows `localhost` as an Authorized JavaScript origin
- [ ] **In-memory rate limiter** — fine for one backend instance, won't hold if it ever scales to multiple workers

## 🚀 Deploy steps, in order

1. **Create a Postgres database** — Render Postgres or Supabase, either works
2. **Copy its connection string**
3. In the **Render dashboard**, set env vars: `DATABASE_URL` (from step 2), `ALLOWED_ORIGINS` (your real frontend URL, once known)
4. **Push this repo to GitHub** (if it isn't already)
5. **Connect Render to the repo** — `render.yaml` already defines the backend service
6. Render's build step runs `pip install -r requirements.txt && alembic upgrade head` automatically — this creates every table on the fresh Postgres database
7. **Deploy the frontend** (Vercel or similar), set `VITE_API_BASE_URL` to your live Render backend URL
8. Add the frontend's real domain to **both**:
   - Render's `ALLOWED_ORIGINS`
   - Google Cloud Console's OAuth Client ID → Authorized JavaScript origins
9. **Smoke test on the live URLs**: register → login → create a listing → admin approves it → confirm it shows up publicly

## ⏳ After launch — not blockers, do when ready

- [ ] Move uploads to S3 / Cloudinary / R2
- [ ] Wire a real email provider (Resend / SES) for OTP + notifications
- [ ] Wire an SMS provider (Twilio / MSG91) if phone OTP is wanted
- [ ] Move rate limiting to Redis if traffic ever grows beyond a single backend instance

---

See `CHANGELOG.md` for the full history of what changed and why, and `PROJECT_GUIDE.md` for how each piece of the app actually works.
