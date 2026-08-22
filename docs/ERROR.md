# Project Error Log & Debugging History

This document serves as a complete, persistent log of all runtime errors, bugs, and configuration issues encountered during the development of the EVA Homes platform, along with their analysis, root causes, solutions, and prevention strategies.

---

## Error #1

### Date
2026-07-06

### Error
`RuntimeError: Directory 'static' does not exist`

```
Traceback (most recent call last):
  File "main.py", line 55, in <module>
    app.mount("/static", StaticFiles(directory="static"), name="static")
  ...
RuntimeError: Directory 'static' does not exist
```

### Root Cause
FastAPI (via Starlette) validates that the directory target specified in `StaticFiles(directory="static")` exists at the exact moment of mounting. In the previous implementation, the directories `static` and `static/uploads` were created asynchronously inside the FastAPI `lifespan` event handler. However, the lifespan handler runs *after* FastAPI finishes loading module routes, middleware, and mounting directories. As a result, the server crashed during import/load time before the lifespan could execute.

### Explanation
When FastAPI starts up, it executes code line by line. When it reaches `app.mount("/static", StaticFiles(directory="static"), ...)`, it checks if the `"static"` folder exists on disk. Because the code to create the folder was placed in the `lifespan` handler (which only runs after startup completes), the folder did not exist yet, causing a crash.

### Solution
Move the directory creation logic from the async `lifespan` handler to a synchronous check at the very beginning of the `main.py` entrypoint (before configuring the FastAPI app or mounting static directories):

```python
# main.py
import os

# Ensure static/uploads folder exists at startup before mounting
os.makedirs(os.path.join("static", "uploads"), exist_ok=True)
```

### Commands Used
```bash
python -m uvicorn main:app --reload
```

### Verification
- Run `uvicorn main:app --reload` within the `backend` directory.
- Verify that the server starts up successfully and serves the API documentation.
- Check that the `static/uploads` folder is generated in the root of the backend workspace.

### Prevention
Always run directory creation logic synchronously during module initialization if those directories are being mounted via `StaticFiles`. Do not rely on async lifespan events for setting up directories required during application mounting.

---

## Error #2

### Date
2026-07-06

### Error
`UnicodeEncodeError: 'charmap' codec can't encode character '\U0001f331' in position 4: character maps to <undefined>`

```
Traceback (most recent call last):
  File "seed.py", line 26, in <module>
    print("🌱 Creating database tables...")
UnicodeEncodeError: 'charmap' codec can't encode character '\U0001f331' in position 4: character maps to <undefined>
```

### Root Cause
Python's standard `print()` function defaults to the active terminal/console encoding (such as `cp1252` or other legacy codepages on Windows). When printing unicode emojis (like `🌱` or `✨`) inside a shell that does not default to UTF-8 encoding, Python's encoding mechanism fails because the characters are missing from the terminal's active codepage mapping.

### Explanation
Windows command prompts and powershell terminals default to region-specific encoding schemes rather than UTF-8. When Python tries to print an emoji, it fails to map that emoji's unicode character to the legacy local character map, crashing the entire execution of scripts like `seed.py`.

### Solution
Remove emojis and non-ASCII character markers from console log output statements in python scripts, replacing them with standard ASCII text markers (e.g. `[Seed]` instead of `🌱`):

```python
# seed.py
# Before:
# print("🌱 Creating database tables...")
# After:
print("[Seed] Creating database tables...")
```

Alternatively, configure the terminal environment to support UTF-8 by changing the codepage (`chcp 65001`) or setting the environment variable `PYTHONIOENCODING=utf-8`.

### Commands Used
```bash
python backend/seed.py
```

### Verification
Run `python backend/seed.py` on a standard Windows command shell. The command now executes without throwing a encoding error and outputs clean console logs.

### Prevention
Avoid outputting decorative non-ASCII characters (emojis, unicode symbols) in console script logging for command-line utilities meant to run in cross-platform environments, particularly Windows terminals.

---

## Error #3

### Date
2026-07-28

### Error
`LookupError: 'open' is not among the defined enum values. Enum name: parkingtype. Possible values: NONE, OPEN, CLOSED`

Every request to `GET /api/properties/{id}` started 500ing immediately after a migration that replaced the `has_parking` boolean column with a `parking_type` enum column.

### Root Cause
SQLAlchemy's `Enum` column type stores the Python enum member's **name** (`OPEN`) in the database by default, not its `.value` (`open`). The migration's data-backfill step wrote the lowercase value instead:

```python
op.execute("UPDATE properties SET parking_type = 'open' WHERE has_parking = 1")
```

Every existing row ended up with a string SQLAlchemy couldn't map back to any enum member on read.

### Explanation
This is easy to miss because the API layer (Pydantic) *does* serialize/deserialize using `.value` (lowercase, e.g. `"open"` in JSON responses) — so the lowercase string looks completely correct everywhere except the one place it actually matters: what's physically stored in the SQL column, which SQLAlchemy's `Enum` type expects to match a member *name*, not a value.

### Solution
Fixed the migration to write the uppercase member name, and corrected the already-migrated dev database directly:

```python
# migration
op.execute("UPDATE properties SET parking_type = 'OPEN' WHERE has_parking = 1")
```

```python
# one-time fix for the dev DB already in the wrong state
cur.execute("UPDATE properties SET parking_type = UPPER(parking_type)")
```

### Commands Used
```bash
python -m alembic upgrade head
curl http://127.0.0.1:8000/api/properties/9
```

### Verification
Re-ran the failing `GET /api/properties/{id}` request and confirmed it returned `200` with the correct `parking_type` value.

### Prevention
When a migration backfills data into any `Enum`-typed column via raw SQL, write the member **name** (matching however the enum class defines it, typically uppercase), not the lowercase `.value` — and test the read path (a real GET request), not just that the migration ran without error.

---

## Error #4

### Date
2026-07-28

### Error
`<form> cannot contain a nested <form>` (React DOM warning, followed by broken Enter-key behavior)

### Root Cause
A new `LocationPicker` component (map search box) rendered its own `<form onSubmit={handleSearch}>` for the address-search input. It was used inside `CreateListingPage`, which already wraps its entire page in one big `<form onSubmit={handleSubmit}>` for the listing submission. HTML doesn't allow nested forms — the browser silently drops the inner one, so pressing Enter in the search box triggered the *outer* form's submit handler instead of the search.

### Solution
Removed the inner `<form>` entirely. The search button became a plain `type="button"` calling the handler directly via `onClick`, and the input got an `onKeyDown` handler that calls the same function (with `preventDefault()`) when Enter is pressed — same UX, no nested form.

### Verification
Confirmed via the dev server's console output that the "nested form" warning stopped appearing after the fix, and that pressing Enter in the search box searches instead of submitting the whole listing.

### Prevention
Before adding a `<form>` inside a reusable component, check whether it might ever be rendered inside a page that's already one big form (common in this codebase — several pages wrap the whole form in a single `<form>` tag). If so, use button `onClick` + `onKeyDown` instead of a nested `<form onSubmit>`.

---

## Error #5

### Date
2026-08-02

### Error
`psycopg2.errors.ForeignKeyViolation: update or delete on table "users" violates foreign key constraint "properties_owner_id_fkey" DETAIL: Key (id)=(2) is still referenced from table "properties".`

Same failure shape on `DELETE /api/properties/{id}` too, whenever the listing had any enquiry/visit/offer/saved-property/unlock pointing at it.

### Root Cause
Every foreign key in the original schema (`Property.owner_id`, `Enquiry.property_id`, `Visit.buyer_id`, `SavedProperty.property_id`, etc. — every FK across the whole app) was created via a plain SQLAlchemy `ForeignKey("table.id")` with no `ondelete=` behavior, which defaults to `RESTRICT` on Postgres. SQLite never enforces foreign keys at all in this app (no `PRAGMA foreign_keys=ON` anywhere), so this was completely invisible in local dev — every delete "worked" locally and only broke against the real production Postgres database on Supabase.

### Explanation
SQLAlchemy's `cascade="all, delete-orphan"` on a Python-level `relationship()` only handles cascading when SQLAlchemy itself issues the delete through the ORM — it does nothing for the actual database-level constraint. That matters because deletes don't only happen through the app: an admin deleting a row directly in Supabase's Table Editor (or any raw SQL) hits the real Postgres constraint with no ORM involved at all, and a `RESTRICT` FK will refuse the delete outright rather than cascading.

### Solution
Added a new Alembic migration that drops and recreates every affected FK constraint with explicit `ON DELETE` behavior — `CASCADE` for genuinely dependent data (a property's images, enquiries, visits, offers, unlocks; a user's properties, saved-properties, notifications, seller profile), and `SET NULL` for the one case where cascading would be wrong (`PropertyUnlock.reviewed_by` — deleting the admin who happened to review a request shouldn't destroy the buyer's own unlock record, since that's the buyer's data, not the admin's):

```python
op.drop_constraint("properties_owner_id_fkey", "properties", type_="foreignkey")
op.create_foreign_key(
    "properties_owner_id_fkey", "properties", "users", ["owner_id"], ["id"], ondelete="CASCADE"
)
```

The migration is guarded to only run on Postgres (`if bind.dialect.name != "postgresql": return`) since SQLite has nothing to fix here and doesn't support `DROP CONSTRAINT` the same way.

### Commands Used
```powershell
alembic revision -m "add ondelete cascade to foreign keys"
alembic upgrade head
```
```sql
-- verification, run directly in Supabase's SQL Editor
SELECT conname, confdeltype FROM pg_constraint WHERE conname = 'properties_owner_id_fkey';
-- 'a' (no action) before the fix, 'c' (cascade) after
```

### Verification
Deployed the migration, re-ran the SQL check above and confirmed `confdeltype` flipped from `a` to `c`, then successfully deleted a user with dependent properties/enquiries directly in Supabase and confirmed everything cascaded cleanly with no error.

### Prevention
Any `ForeignKey(...)` should have an explicit `ondelete=` from the start, decided deliberately (`CASCADE` for owned/dependent data, `SET NULL` for provenance/attribution fields, `RESTRICT` only when you genuinely want the delete blocked) — not left to the database default. And because SQLite silently doesn't enforce FKs at all in this app, **this entire category of bug is invisible in local dev** — it only ever surfaces against the real Postgres database, so it has to be reasoned about explicitly rather than caught by testing locally.

---

## Error #6

### Date
2026-08-05 to 2026-08-06

### Error
A chain of different-looking failures while trying to make Google Sign-In more robust against popup blockers: `[GSI_LOGGER]: Failed to open popup window`, then (after switching to `ux_mode: "redirect"`) `Error 400: redirect_uri_mismatch`, then `Error 400: invalid_request` / "doesn't comply with Google's OAuth 2.0 policy for keeping apps secure."

### Root Cause (the approach itself, not a single line of code)
The original popup-based Google Sign-In was blocked by a browser extension on one specific machine — confirmed harmless (worked fine in Incognito, i.e. it was never actually broken for real visitors). The fix attempted was switching to Google Identity Services' `ux_mode: "redirect"`, which avoids `window.open()` entirely. That introduced a real, self-inflicted bug: GIS's documented CSRF protection for redirect mode (a `g_csrf_token` cookie + matching form field) only works when the page rendering the button and the `login_uri` receiving the callback **share an origin** — the cookie is set by client-side JS on the button's page, so it can never reach a `login_uri` on a different domain. This app's frontend (Vercel) and backend (Render) are deliberately on different domains, so that check was rejecting every request, real or fake, unconditionally.

### Explanation
Each symptom in the chain had a distinct, real cause layered on top of the fundamental architecture mismatch above:
- `redirect_uri_mismatch` — the exact URI GIS sent had to be registered byte-for-byte in Google Cloud Console's *Authorized redirect URIs* (a separate list from *Authorized JavaScript origins*), and the first attempt used the wrong backend domain entirely (`eva-homes.onrender.com`, a domain belonging to an unrelated Render user, instead of the project's actual `eva-homes-backend.onrender.com`).
- `invalid_request` / "OAuth 2.0 policy for keeping apps secure" — Google's own project dashboard "Use secure flows" checkup item flagged the underlying implicit-token grant `ux_mode: redirect` uses as a legacy/insecure pattern Google now restricts at the platform level — not something fixable by further Console configuration.

### Solution
**Reverted to the original popup-based flow entirely** rather than continuing to fight the redirect-mode approach — removed the new `/api/auth/google/callback` endpoint, the `FRONTEND_URL` setting, the frontend `GoogleCallbackPage`, and the `ux_mode`/`login_uri` wiring, restoring the simple `callback:` popup handler. This is Google's own officially-supported method for GIS and works for the overwhelming majority of visitors; the one machine that hit it was an edge case, not a systemic problem.

### Commands Used
```powershell
alembic downgrade -1   # unrelated migration testing during the same session, included for context
git log --oneline -5
```
Mostly iterative code edits + re-deploys + checking Render build logs and decoding Google's base64 `authError` query parameter (`base64.urlsafe_b64decode`) to see the exact rejected value instead of guessing from the generic error page.

### Verification
Confirmed the popup flow signs in successfully once tested in a browser session without the interfering extension (Incognito), matching its original working state before any of this began.

### Prevention
Before switching an auth flow's UX mode to work around a client-side annoyance, check whether the *provider's own documented security mechanism* (here, GIS's double-submit CSRF cookie) actually assumes an architecture the app has (same-origin frontend+backend) — if the app deliberately doesn't have that architecture (a split Vercel/Render deploy, in this case), the "more robust" alternative can be structurally broken from the start, not just harder to configure. When a provider's platform dashboard has a security/compliance checkup panel (Google Cloud Console's "Project checkup" did, here), check it early — it can reveal that an approach is blocked by policy before spending hours debugging Console configuration that was never going to fix it.
