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
