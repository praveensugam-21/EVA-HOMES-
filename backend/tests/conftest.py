import os
import sys

# Point the app at an isolated on-disk SQLite database *before* anything
# else is imported — core.config/database read DATABASE_URL at import time,
# so this must happen first. Also skip auto-seeding so tests start from an
# empty, deterministic database.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_DB_PATH = os.path.join(BACKEND_DIR, "tests", "_test_eva_homes.db")

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["DEBUG"] = "false"
os.environ.pop("SEED_DB", None)

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import pytest
from fastapi.testclient import TestClient

from database import Base, SessionLocal, engine
import models  # noqa: F401 — registers every table on Base.metadata
from main import app


@pytest.fixture(scope="session", autouse=True)
def _test_database():
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest.fixture(autouse=True)
def _clean_tables():
    """Truncate every table between tests so each test starts from empty."""
    yield
    with engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """
    The app's rate limiter is a single in-process dict keyed by client IP
    (see core/rate_limit.py). TestClient requests all appear to come from
    the same fake IP, so without a reset, register/login limits from one
    test would bleed into the next and fail it with a 429.
    """
    from core.rate_limit import rate_limiter

    rate_limiter._hits.clear()
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def register_and_login(client, email, password="Testpass1", full_name="Test User", phone=None):
    payload = {"full_name": full_name, "email": email, "password": password}
    if phone:
        payload["phone"] = phone
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 201, resp.text

    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def make_admin(db_session, email):
    from models.user import User

    user = db_session.query(User).filter(User.email == email).first()
    user.is_admin = True
    db_session.commit()


VALID_PROPERTY_PAYLOAD = {
    "title": "3BHK Luxury Apartment",
    "price": 250.0,
    "city": "Mumbai",
    "locality": "Bandra West",
    "bathroom_image_url": "https://example.com/bathroom.jpg",
    "hall_image_url": "https://example.com/hall.jpg",
    "kitchen_image_url": "https://example.com/kitchen.jpg",
    "google_maps_link": "https://maps.google.com/?q=Bandra+West+Mumbai",
}
