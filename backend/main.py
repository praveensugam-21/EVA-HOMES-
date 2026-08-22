import os
import sys

# Ensure backend directory and root directory are in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(backend_dir, ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from contextlib import asynccontextmanager


from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from core.config import settings
from database import Base, engine
import models
from routers import (
    auth,
    availability,
    cities,
    enquiries,
    notifications,
    offers,
    properties,
    saved_properties,
    settings as settings_router,
    unlocks,
    visits,
)


# Ensure static/uploads folder exists at startup before mounting
try:
    os.makedirs(os.path.join("static", "uploads"), exist_ok=True)
    os.makedirs(os.path.join("static", "seller_docs"), exist_ok=True)
except OSError:
    pass



def ensure_enquiry_columns():
    """Add lightweight lead-tracking columns for existing SQLite databases."""
    inspector = inspect(engine)
    if "enquiries" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("enquiries")}
    columns_to_add = {
        "source": "ALTER TABLE enquiries ADD COLUMN source VARCHAR(40) NOT NULL DEFAULT 'form'",
        "status": "ALTER TABLE enquiries ADD COLUMN status VARCHAR(40) NOT NULL DEFAULT 'new'",
        "broker_notes": "ALTER TABLE enquiries ADD COLUMN broker_notes TEXT",
    }

    with engine.begin() as connection:
        for column_name, statement in columns_to_add.items():
            if column_name not in existing_columns:
                connection.execute(text(statement))


def ensure_user_columns():
    """Add buyer-profile columns for existing SQLite databases."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    columns_to_add = {
        "address": "ALTER TABLE users ADD COLUMN address VARCHAR(255)",
        "city": "ALTER TABLE users ADD COLUMN city VARCHAR(100)",
        "bio": "ALTER TABLE users ADD COLUMN bio VARCHAR(500)",
        "avatar_url": "ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)",
        "phone_verified": "ALTER TABLE users ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE",
        "email_verified": "ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE",
    }

    with engine.begin() as connection:
        for column_name, statement in columns_to_add.items():
            if column_name not in existing_columns:
                connection.execute(text(statement))


def ensure_property_columns():
    """Add analytics columns for existing SQLite databases."""
    inspector = inspect(engine)
    if "properties" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("properties")}
    columns_to_add = {
        "view_count": "ALTER TABLE properties ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0",
    }

    with engine.begin() as connection:
        for column_name, statement in columns_to_add.items():
            if column_name not in existing_columns:
                connection.execute(text(statement))


def ensure_seller_profile_columns():
    """Add the seller-photo column for existing SQLite databases."""
    inspector = inspect(engine)
    if "seller_profiles" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("seller_profiles")}
    columns_to_add = {
        "photo_url": "ALTER TABLE seller_profiles ADD COLUMN photo_url VARCHAR(500)",
    }

    with engine.begin() as connection:
        for column_name, statement in columns_to_add.items():
            if column_name not in existing_columns:
                connection.execute(text(statement))


def normalize_property_city_casing():
    """
    Property.city is free text a seller types on listing creation (no
    dropdown) — existing rows can have inconsistent casing ("chennai" vs
    "CHENNAI"), which used to show up as duplicate entries in the Popular
    Cities section since SQL GROUP BY is case-sensitive (see
    routers/cities.py). New listings are normalized at write time
    (schemas/property.py), but this backfills rows that already existed
    before that fix. Title-cases anything that doesn't already match —
    idempotent, becomes a no-op once every row is normalized.
    """
    inspector = inspect(engine)
    if "properties" not in inspector.get_table_names():
        return

    with engine.begin() as connection:
        rows = connection.execute(text("SELECT id, city FROM properties")).fetchall()
        for row_id, city in rows:
            if not city:
                continue
            normalized = city.strip().title()
            if normalized != city:
                connection.execute(
                    text("UPDATE properties SET city = :city WHERE id = :id"),
                    {"city": normalized, "id": row_id},
                )


def normalize_property_text_casing():
    """
    Same problem as normalize_property_city_casing() above, for title/
    locality/address — existing rows can be "test home 1" or "HOUSE"/
    "INDIA" (all-lowercase or ALL CAPS, since nothing validated this
    before). New listings are normalized at write time
    (schemas/property.py's normalize_typed_text), this backfills rows
    that already existed before that fix. Idempotent.
    """
    inspector = inspect(engine)
    if "properties" not in inspector.get_table_names():
        return

    from schemas.property import normalize_typed_text

    with engine.begin() as connection:
        rows = connection.execute(text("SELECT id, title, locality, address FROM properties")).fetchall()
        for row_id, title, locality, address in rows:
            updates = {}
            if title and (normalized := normalize_typed_text(title)) != title:
                updates["title"] = normalized
            if locality and (normalized := normalize_typed_text(locality)) != locality:
                updates["locality"] = normalized
            if address and (normalized := normalize_typed_text(address)) != address:
                updates["address"] = normalized
            if updates:
                set_clause = ", ".join(f"{col} = :{col}" for col in updates)
                connection.execute(
                    text(f"UPDATE properties SET {set_clause} WHERE id = :id"),
                    {**updates, "id": row_id},
                )


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        ensure_enquiry_columns()
        ensure_user_columns()
        ensure_property_columns()
        ensure_seller_profile_columns()
        normalize_property_city_casing()
        normalize_property_text_casing()
        # Auto-seeding demo data (including a default admin account) is only
        # for local/dev convenience. In production (DEBUG=false on Render)
        # it's skipped unless explicitly opted into via SEED_DB=true, so a
        # fresh production database never gets a publicly-documented
        # default admin password.
        if settings.DEBUG or os.getenv("SEED_DB", "").strip().lower() == "true":
            try:
                from seed import seed
                seed()
            except Exception as seed_err:
                print(f"[Lifespan Seed Error]: {seed_err}")
        else:
            print("[Lifespan] Skipping auto-seed (DEBUG is false and SEED_DB is not set).")
    except Exception as err:
        print(f"[Lifespan Startup Error]: {err}")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="EVA Homes Real Estate Platform API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
custom_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=custom_origins or [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security Headers Middleware
#
# CSP here covers this API's own HTML surfaces — /docs (Swagger UI) and
# /redoc — not the main product UI (that's the separate frontend deploy,
# with its own, stricter policy in frontend/vercel.json). Swagger UI and
# ReDoc load their JS/CSS from cdn.jsdelivr.net and inject an inline
# <script> to boot (verified directly against the installed fastapi
# package's docs.py) — both are explicitly allowed below so those pages
# keep working instead of silently breaking under a tighter policy.
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    )
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: https://fastapi.tiangolo.com; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "object-src 'none';"
    )
    return response

# Mount static folder for uploads
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include Routers
app.include_router(auth.router)
app.include_router(properties.router)
app.include_router(cities.router)
app.include_router(enquiries.router)
app.include_router(settings_router.router)
app.include_router(saved_properties.router)
app.include_router(visits.router)
app.include_router(offers.router)
app.include_router(notifications.router)
app.include_router(unlocks.router)
app.include_router(availability.router)

@app.get("/", tags=["Health"])
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "active"
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "database": "connected"}


