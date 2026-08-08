# ============================================================
# core/config.py — Application Configuration
# ============================================================
# This file reads values from our .env file and makes them
# available as a typed Python object throughout the app.
#
# WHY do this? Instead of calling os.getenv("SECRET_KEY")
# everywhere, we just import `settings` and use settings.SECRET_KEY
# This gives us type checking + a single place to manage config.
# ============================================================

from pydantic import field_validator
from pydantic_settings import BaseSettings  # reads .env files
from functools import lru_cache             # caches the settings object


class Settings(BaseSettings):
    """
    All application settings, loaded from .env file.
    Pydantic validates the types automatically.
    """

    # --- Database ---
    DATABASE_URL: str = "sqlite:///./eva_homes.db"

    # --- JWT / Security ---
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # --- App Info ---
    APP_NAME: str = "EVA Homes API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # --- Agent Contact ---
    # Public visitors see this agent contact instead of the owner's full phone.
    BROKER_NAME: str = "EVA Homes Agent Desk"
    BROKER_PHONE: str = "+919900612425"
    BROKER_WHATSAPP: str = "+919900612425"

    # --- Google Sign-In ---
    # OAuth client ID from Google Cloud Console (Credentials > OAuth Client ID > Web application).
    # Must match the frontend's VITE_GOOGLE_CLIENT_ID — it's the audience checked on every token.
    GOOGLE_CLIENT_ID: str = ""

    # --- File storage ---
    # "local" (default, dev): files saved to backend/static/, gone on every
    # Render/Vercel restart. "supabase": uploaded to Supabase Storage buckets
    # instead — durable, and how production should run.
    STORAGE_BACKEND: str = "local"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_BUCKET_IMAGES: str = "property-images"
    SUPABASE_BUCKET_DOCS: str = "seller-documents"

    # --- Scheduled jobs ---
    # Shared-secret header (not a user JWT) that authorizes the external
    # cron trigger for POST /api/visits/dispatch-reminders. Empty by
    # default, which means that endpoint refuses every request until a
    # real secret is configured — no accidental open endpoint.
    CRON_SECRET: str = ""

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"warn", "warning", "error", "info"}:
                return False
        return value

    class Config:
        # Tell Pydantic to look for a .env file in the same folder
        env_file = ".env"
        env_file_encoding = "utf-8"


# lru_cache means this function runs only ONCE.
# After the first call, it returns the cached Settings object.
# This is important for performance — we don't want to re-read
# the .env file on every single API request.
@lru_cache()
def get_settings() -> Settings:
    return Settings()


# Create a single global instance we can import anywhere
settings = get_settings()
