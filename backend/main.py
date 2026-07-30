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


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        ensure_enquiry_columns()
        ensure_user_columns()
        ensure_property_columns()
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
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: http:;"
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


