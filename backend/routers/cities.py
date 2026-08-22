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
    
    HOW IT WORKS (SQL equivalent):
        SELECT city, COUNT(*) as count
        FROM properties
        WHERE status = 'active'
        GROUP BY city
        ORDER BY count DESC
    """

    # func.count() → SQL COUNT(*) aggregate function
    # .group_by(Property.city) → GROUP BY city
    # .order_by(func.count().desc()) → ORDER BY count DESC (most popular first)
    results = (
        db.query(
            Property.city,
            func.count(Property.id).label("count")
        )
        .filter(Property.status == PropertyStatus.ACTIVE)
        .group_by(Property.city)
        .order_by(func.count(Property.id).desc())
        .all()
    )

    # Convert to list of dicts
    return [{"city": row.city, "count": row.count} for row in results]
