# ============================================================
# core/storage.py — File storage abstraction (local disk / Supabase Storage)
# ============================================================
# Controlled by settings.STORAGE_BACKEND:
#   "local"    (default) — save to backend/static/, dev-only, not durable
#   "supabase" — upload to a Supabase Storage bucket over its REST API
#
# Callers never touch the backend directly — they call save_file() and get
# back a URL, without caring which mode is active. This means local dev
# keeps working with zero Supabase setup, and switching a deployment to
# Supabase is just three env vars, no code change.
# ============================================================

import httpx

from core.config import settings


class StorageError(Exception):
    pass


def _supabase_headers(content_type: str | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "apikey": settings.SUPABASE_SERVICE_KEY,
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def upload_bytes(bucket: str, path: str, content: bytes, content_type: str) -> None:
    """Uploads raw bytes to a Supabase Storage bucket at the given path."""
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    headers = _supabase_headers(content_type)
    headers["x-upsert"] = "true"

    response = httpx.post(url, headers=headers, content=content, timeout=30.0)
    if response.status_code not in (200, 201):
        raise StorageError(f"Supabase upload failed ({response.status_code}): {response.text}")


def public_url(bucket: str, path: str) -> str:
    """URL for an object in a public bucket — works forever, no expiry."""
    return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"


def signed_url(bucket: str, path: str, expires_in: int = 3600) -> str:
    """
    Temporary URL for an object in a private bucket (e.g. seller documents).
    Generated fresh on every request rather than stored, since it expires.
    """
    url = f"{settings.SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}"
    response = httpx.post(url, headers=_supabase_headers(), json={"expiresIn": expires_in}, timeout=15.0)
    if response.status_code != 200:
        raise StorageError(f"Supabase signed URL failed ({response.status_code}): {response.text}")

    return f"{settings.SUPABASE_URL}/storage/v1{response.json()['signedURL']}"


def is_supabase_enabled() -> bool:
    return settings.STORAGE_BACKEND == "supabase" and bool(settings.SUPABASE_URL) and bool(settings.SUPABASE_SERVICE_KEY)
