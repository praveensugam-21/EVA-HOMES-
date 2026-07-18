import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from core.config import settings
from database import Base, engine
import models
from routers import auth, cities, enquiries, properties, settings as settings_router

# Ensure static/uploads folder exists at startup before mounting
os.makedirs(os.path.join("static", "uploads"), exist_ok=True)


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_enquiry_columns()
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
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


