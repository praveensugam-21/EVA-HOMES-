# ============================================================
# routers/availability.py — Seller Visit Availability Slots
# ============================================================
# Specific-date (not recurring weekly) visit slots a seller opens up per
# property; buyers book a visit against one, taking it out of the pool.
#
# POST   /api/sellers/me/availability-slots       → seller creates a slot
# GET    /api/sellers/me/availability-slots        → seller's own slots
# DELETE /api/sellers/me/availability-slots/{id}    → seller removes an unbooked slot
# GET    /api/properties/{property_id}/availability → public, unbooked future slots
# ============================================================

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models.availability_slot import AvailabilitySlot
from models.property import Property
from models.user import User
from routers.auth import get_seller_user
from schemas.availability import (
    AvailabilitySlotCreate,
    AvailabilitySlotListResponse,
    AvailabilitySlotResponse,
)

router = APIRouter(tags=["Availability"])


def _to_response(slot: AvailabilitySlot) -> AvailabilitySlotResponse:
    response = AvailabilitySlotResponse.model_validate(slot)
    response.property_title = slot.property.title if slot.property else None
    return response


@router.post(
    "/api/sellers/me/availability-slots",
    response_model=AvailabilitySlotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a visit slot for one of your own properties"
)
def create_availability_slot(
    slot_data: AvailabilitySlotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_seller_user),
):
    prop = db.query(Property).filter(Property.id == slot_data.property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")
    if prop.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only add slots for your own listings.")

    slot = AvailabilitySlot(
        seller_id=current_user.id,
        property_id=prop.id,
        specific_date=slot_data.specific_date,
        start_time=slot_data.start_time,
        end_time=slot_data.end_time,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return _to_response(slot)


@router.get(
    "/api/sellers/me/availability-slots",
    response_model=AvailabilitySlotListResponse,
    summary="List your own visit slots (all properties)"
)
def list_my_availability_slots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_seller_user),
):
    slots = (
        db.query(AvailabilitySlot)
        .options(joinedload(AvailabilitySlot.property))
        .filter(AvailabilitySlot.seller_id == current_user.id)
        .order_by(AvailabilitySlot.specific_date.asc(), AvailabilitySlot.start_time.asc())
        .all()
    )
    items = [_to_response(s) for s in slots]
    return AvailabilitySlotListResponse(items=items, total=len(items))


@router.delete(
    "/api/sellers/me/availability-slots/{slot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove one of your own visit slots (only if not yet booked)"
)
def delete_availability_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_seller_user),
):
    slot = db.query(AvailabilitySlot).filter(AvailabilitySlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")
    if slot.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your slot.")
    if slot.is_booked:
        raise HTTPException(status_code=400, detail="This slot is already booked and can't be removed.")

    db.delete(slot)
    db.commit()
    return None


@router.get(
    "/api/properties/{property_id}/availability",
    response_model=AvailabilitySlotListResponse,
    summary="List unbooked, upcoming visit slots for a property (public)"
)
def list_property_availability(
    property_id: int,
    db: Session = Depends(get_db),
):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")

    slots = (
        db.query(AvailabilitySlot)
        .filter(
            AvailabilitySlot.property_id == property_id,
            AvailabilitySlot.is_booked.is_(False),
            AvailabilitySlot.specific_date >= date.today(),
        )
        .order_by(AvailabilitySlot.specific_date.asc(), AvailabilitySlot.start_time.asc())
        .all()
    )
    items = [_to_response(s) for s in slots]
    return AvailabilitySlotListResponse(items=items, total=len(items))
