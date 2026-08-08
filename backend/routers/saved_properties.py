# ============================================================
# routers/saved_properties.py — Buyer Wishlist Endpoints
# ============================================================
# POST   /api/saved-properties            → save a property
# DELETE /api/saved-properties/{property_id} → unsave a property
# GET    /api/saved-properties            → list the current user's saved properties
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.property import Property
from models.saved_property import SavedProperty
from models.user import User
from routers.auth import get_current_user
from schemas.saved_property import SavedPropertyListResponse, SavedPropertyResponse

router = APIRouter(prefix="/api/saved-properties", tags=["Saved Properties"])


@router.get("", response_model=SavedPropertyListResponse, summary="List the current user's saved properties")
def list_saved_properties(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved = (
        db.query(SavedProperty)
        .filter(SavedProperty.user_id == current_user.id)
        .order_by(SavedProperty.created_at.desc())
        .all()
    )
    return SavedPropertyListResponse(items=saved, total=len(saved))


@router.post(
    "/{property_id}",
    response_model=SavedPropertyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a property to the current user's wishlist"
)
def save_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")

    existing = (
        db.query(SavedProperty)
        .filter(SavedProperty.user_id == current_user.id, SavedProperty.property_id == property_id)
        .first()
    )
    if existing:
        return existing

    saved = SavedProperty(user_id=current_user.id, property_id=property_id)
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved


@router.delete(
    "/{property_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a property from the current user's wishlist"
)
def unsave_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved = (
        db.query(SavedProperty)
        .filter(SavedProperty.user_id == current_user.id, SavedProperty.property_id == property_id)
        .first()
    )
    if not saved:
        raise HTTPException(status_code=404, detail="Property is not in your saved list.")

    db.delete(saved)
    db.commit()
    return None
