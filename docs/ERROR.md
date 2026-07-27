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
