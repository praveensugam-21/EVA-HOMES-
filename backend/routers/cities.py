# ============================================================
# routers/cities.py — Cities Endpoint
# ============================================================
# GET /api/cities → Returns list of cities where properties exist
#
# Instead of hardcoding cities in the frontend (like Cities.jsx does now),
# we query the actual database to get cities that have real listings.
# This makes the data always accurate and up-to-date!
# ============================================================

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.property import Property, PropertyStatus

router = APIRouter(prefix="/api/cities", tags=["Cities"])


@router.get("", summary="Get all cities with active property listings")
def get_cities(db: Session = Depends(get_db)):
    """
    Returns a list of cities that have at least one active property listing.
    Also includes a count of listings per city.

    Response:
    [
        {"city": "Mumbai", "count": 42},
        {"city": "Bangalore", "count": 35},
        ...
    ]

    Grouped by a trimmed/lowercased key rather than the raw stored string —
    Property.city is free text a seller types on listing creation (no
    dropdown), so "Chennai", "chennai", and "CHENNAI" are otherwise treated
    as three different cities by SQL GROUP BY. The display value is title-
    cased for a consistent look regardless of how any individual listing's
    city was typed.
    """
    normalized_city = func.lower(func.trim(Property.city))

    results = (
        db.query(
            normalized_city.label("city_key"),
            func.count(Property.id).label("count"),
        )
        .filter(Property.status == PropertyStatus.ACTIVE)
        .group_by(normalized_city)
        .order_by(func.count(Property.id).desc())
        .all()
    )

    return [{"city": row.city_key.title(), "count": row.count} for row in results]
