# ============================================================
# routers/unlocks.py — Property Location/Phone Unlock Endpoints
# ============================================================
# Manual, offline payment flow: buyer pays the admin's UPI/QR outside the
# app, then tells us they paid (optionally with a transaction reference).
# Admin checks their own UPI app and flips the request to verified/rejected.
# There is no payment gateway integration here by design.
#
# POST /api/properties/{property_id}/unlock-request → buyer claims payment
# GET  /api/unlocks/mine                             → buyer's own requests
# GET  /api/unlocks                                   → admin, all requests
# PUT  /api/unlocks/{id}                              → admin, verify/reject
# ============================================================

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from core.notify import notify
from core.rate_limit import rate_limiter
from database import get_db
from models.property import Property
from models.property_unlock import PropertyUnlock, UnlockStatus, UnlockType
from models.user import User
from routers.auth import get_admin_user, get_current_user
from routers.settings import get_or_create_broker_settings
from schemas.property_unlock import (
    UnlockAdminItem,
    UnlockAdminListResponse,
    UnlockListResponse,
    UnlockRequestCreate,
    UnlockResponse,
    UnlockReview,
)

router = APIRouter(tags=["Property Unlocks"])


def _to_response(unlock: PropertyUnlock) -> UnlockResponse:
    return UnlockResponse(
        id=unlock.id,
        property_id=unlock.property_id,
        unlock_type=unlock.unlock_type,
        status=unlock.status,
        payment_reference=unlock.payment_reference,
        amount_paid=unlock.amount_paid,
        requested_at=unlock.requested_at,
        reviewed_at=unlock.reviewed_at,
        property_title=unlock.property.title if unlock.property else None,
        property_thumbnail_url=unlock.property.thumbnail_url if unlock.property else None,
    )


@router.post(
    "/api/properties/{property_id}/unlock-request",
    response_model=UnlockResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Claim you've paid the unlock fee (phone or map, priced independently) for a property"
)
def request_unlock(
    property_id: int,
    unlock_data: UnlockRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rate_limiter.check(f"unlock-request:{current_user.id}", limit=5, window_seconds=300)

    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")

    if prop.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="You already own this listing.")

    broker_settings = get_or_create_broker_settings(db)
    fee = (
        broker_settings.phone_unlock_fee
        if unlock_data.unlock_type == UnlockType.PHONE
        else broker_settings.map_unlock_fee
    )

    existing = (
        db.query(PropertyUnlock)
        .filter(
            PropertyUnlock.user_id == current_user.id,
            PropertyUnlock.property_id == property_id,
            PropertyUnlock.unlock_type == unlock_data.unlock_type,
        )
        .first()
    )

    if existing:
        if existing.status == UnlockStatus.VERIFIED:
            return _to_response(existing)
        # Re-claiming after a rejection, or nudging a still-pending one —
        # just update the reference rather than creating a duplicate row.
        existing.status = UnlockStatus.PENDING
        existing.payment_reference = unlock_data.payment_reference
        existing.amount_paid = fee
        existing.reviewed_at = None
        existing.reviewed_by = None
        db.commit()
        db.refresh(existing)
        return _to_response(existing)

    unlock = PropertyUnlock(
        user_id=current_user.id,
        property_id=property_id,
        unlock_type=unlock_data.unlock_type,
        payment_reference=unlock_data.payment_reference,
        amount_paid=fee,
    )
    db.add(unlock)
    db.commit()
    db.refresh(unlock)
    return _to_response(unlock)


@router.get(
    "/api/unlocks/mine",
    response_model=UnlockListResponse,
    summary="List the current user's own unlock requests"
)
def list_my_unlocks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unlocks = (
        db.query(PropertyUnlock)
        .options(joinedload(PropertyUnlock.property))
        .filter(PropertyUnlock.user_id == current_user.id)
        .order_by(PropertyUnlock.requested_at.desc())
        .all()
    )
    items = [_to_response(u) for u in unlocks]
    return UnlockListResponse(items=items, total=len(items))


@router.get(
    "/api/unlocks",
    response_model=UnlockAdminListResponse,
    summary="List all unlock requests (admin only)"
)
def list_unlocks(
    status_filter: Optional[UnlockStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    query = db.query(PropertyUnlock).options(
        joinedload(PropertyUnlock.property),
        joinedload(PropertyUnlock.user),
        joinedload(PropertyUnlock.reviewer),
    )
    if status_filter:
        query = query.filter(PropertyUnlock.status == status_filter)

    # Pending first (oldest first, so the queue clears in order), then
    # everything else newest first.
    unlocks = query.order_by(
        (PropertyUnlock.status == UnlockStatus.PENDING).desc(),
        PropertyUnlock.requested_at.asc(),
    ).all()

    items = [
        UnlockAdminItem(
            **_to_response(u).model_dump(),
            buyer_name=u.user.full_name if u.user else None,
            buyer_email=u.user.email if u.user else None,
            buyer_phone=u.user.phone if u.user else None,
            reviewed_by_name=u.reviewer.full_name if u.reviewer else None,
        )
        for u in unlocks
    ]
    pending_count = db.query(PropertyUnlock).filter(PropertyUnlock.status == UnlockStatus.PENDING).count()
    return UnlockAdminListResponse(items=items, total=len(items), pending_count=pending_count)


@router.put(
    "/api/unlocks/{unlock_id}",
    response_model=UnlockResponse,
    summary="Verify or reject an unlock request (admin only)"
)
def review_unlock(
    unlock_id: int,
    review: UnlockReview,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    if review.status not in (UnlockStatus.VERIFIED, UnlockStatus.REJECTED):
        raise HTTPException(status_code=400, detail="Status must be 'verified' or 'rejected'.")

    unlock = db.query(PropertyUnlock).filter(PropertyUnlock.id == unlock_id).first()
    if not unlock:
        raise HTTPException(status_code=404, detail="Unlock request not found.")

    unlock.status = review.status
    unlock.reviewed_at = datetime.now(timezone.utc)
    unlock.reviewed_by = current_admin.id
    db.flush()

    unlock_label = "map location" if unlock.unlock_type == UnlockType.MAP else "owner phone number"
    title = "Payment verified" if review.status == UnlockStatus.VERIFIED else "Payment could not be verified"
    message = (
        f"Your {unlock_label} unlock for \"{unlock.property.title}\" is confirmed."
        if review.status == UnlockStatus.VERIFIED
        else f"We couldn't verify your {unlock_label} payment for \"{unlock.property.title}\". Please try again or contact support."
    )
    notify(db, user_id=unlock.user_id, title=title, message=message, link=f"/properties/{unlock.property_id}")

    db.commit()
    db.refresh(unlock)
    return _to_response(unlock)
