# ============================================================
# routers/visits.py — Property Visit Requests
# ============================================================
# POST /api/visits                        → buyer books an open availability slot
# GET  /api/visits/mine                    → buyer's own visit requests
# GET  /api/visits/received                → seller's incoming visit requests (their properties)
# PUT  /api/visits/{id}                    → seller responds, or buyer cancels
# POST /api/visits/dispatch-reminders      → cron-triggered, "1 hour before" reminders
# ============================================================

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from core.config import settings
from core.notify import notify
from database import get_db
from models.availability_slot import AvailabilitySlot
from models.property import Property
from models.user import User
from models.visit import Visit
from routers.auth import get_current_user
from schemas.visit import VisitCreate, VisitListResponse, VisitResponse, VisitUpdate

router = APIRouter(prefix="/api/visits", tags=["Visits"])


def _to_response(visit: Visit) -> VisitResponse:
    response = VisitResponse.model_validate(visit)
    response.property_title = visit.property.title if visit.property else None
    response.property_thumbnail_url = visit.property.thumbnail_url if visit.property else None
    response.buyer_name = visit.buyer.full_name if visit.buyer else None
    return response


@router.post("", response_model=VisitResponse, status_code=status.HTTP_201_CREATED, summary="Book an open visit slot")
def create_visit(
    visit_data: VisitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slot = db.query(AvailabilitySlot).filter(AvailabilitySlot.id == visit_data.slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Visit slot not found.")
    if slot.is_booked:
        raise HTTPException(status_code=409, detail="This slot has already been booked. Pick another one.")

    prop = db.query(Property).filter(Property.id == slot.property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")

    # Naive UTC throughout this app (no per-user timezone handling exists
    # anywhere else) — the slot's date/time is stored and compared as-is.
    requested_date = datetime.combine(slot.specific_date, slot.start_time)

    visit = Visit(
        property_id=prop.id,
        buyer_id=current_user.id,
        slot_id=slot.id,
        requested_date=requested_date,
        message=visit_data.message,
    )
    slot.is_booked = True
    db.add(visit)
    db.flush()

    notify(
        db,
        user_id=prop.owner_id,
        title="New visit request",
        message=f"{current_user.full_name} requested a visit for \"{prop.title}\".",
        link=f"/dashboard/seller/visits",
    )

    db.commit()
    db.refresh(visit)
    return _to_response(visit)


@router.get("/mine", response_model=VisitListResponse, summary="List the current user's own visit requests")
def list_my_visits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    visits = (
        db.query(Visit)
        .options(joinedload(Visit.property), joinedload(Visit.buyer))
        .filter(Visit.buyer_id == current_user.id)
        .order_by(Visit.created_at.desc())
        .all()
    )
    return VisitListResponse(items=[_to_response(v) for v in visits], total=len(visits))


@router.get("/received", response_model=VisitListResponse, summary="List visit requests for the current seller's properties")
def list_received_visits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    visits = (
        db.query(Visit)
        .options(joinedload(Visit.property), joinedload(Visit.buyer))
        .join(Property, Property.id == Visit.property_id)
        .filter(Property.owner_id == current_user.id)
        .order_by(Visit.created_at.desc())
        .all()
    )
    return VisitListResponse(items=[_to_response(v) for v in visits], total=len(visits))


@router.put("/{visit_id}", response_model=VisitResponse, summary="Update a visit's status")
def update_visit(
    visit_id: int,
    update_data: VisitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found.")

    is_seller = visit.property.owner_id == current_user.id
    is_buyer = visit.buyer_id == current_user.id
    if not is_seller and not is_buyer and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your visit request.")

    if is_buyer and not is_seller and update_data.status != "cancelled":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Buyers can only cancel a visit request.")

    visit.status = update_data.status
    # Freed back into the pool — a rejected/cancelled visit shouldn't
    # permanently lock out the slot from every other buyer.
    if update_data.status in ("cancelled", "rejected") and visit.slot:
        visit.slot.is_booked = False
    db.flush()

    if is_seller:
        notify(
            db,
            user_id=visit.buyer_id,
            title="Visit request update",
            message=f"Your visit request for \"{visit.property.title}\" is now {update_data.status}.",
            link="/dashboard/buyer/visits",
        )
    elif is_buyer:
        notify(
            db,
            user_id=visit.property.owner_id,
            title="Visit request cancelled",
            message=f"{current_user.full_name} cancelled their visit request for \"{visit.property.title}\".",
            link="/dashboard/seller/visits",
        )

    db.commit()
    db.refresh(visit)
    return _to_response(visit)


@router.post(
    "/dispatch-reminders",
    include_in_schema=False,
    summary="Cron-triggered: notify buyer+seller ~1 hour before a confirmed visit"
)
def dispatch_visit_reminders(request: Request, db: Session = Depends(get_db)):
    """
    Called by an external scheduler (Render Cron Job), not a logged-in
    user — authorized via a shared-secret header instead of a JWT.
    CRON_SECRET defaults to empty, which makes this endpoint refuse every
    request until a real secret is configured on the service.
    """
    provided_secret = request.headers.get("X-Cron-Secret")
    if not settings.CRON_SECRET or provided_secret != settings.CRON_SECRET:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")

    # Naive UTC, matching how requested_date is stored (see create_visit).
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    window_start = now + timedelta(minutes=55)
    window_end = now + timedelta(minutes=65)

    due_visits = (
        db.query(Visit)
        .filter(
            Visit.status == "confirmed",
            Visit.reminder_sent_at.is_(None),
            Visit.requested_date >= window_start,
            Visit.requested_date <= window_end,
        )
        .all()
    )

    for visit in due_visits:
        notify(
            db,
            user_id=visit.buyer_id,
            title="Visit reminder",
            message=f"Your visit for \"{visit.property.title}\" is in about 1 hour.",
            link="/dashboard/buyer/visits",
        )
        notify(
            db,
            user_id=visit.property.owner_id,
            title="Visit reminder",
            message=f"{visit.buyer.full_name}'s visit for \"{visit.property.title}\" is in about 1 hour.",
            link="/dashboard/seller/visits",
        )
        visit.reminder_sent_at = now

    db.commit()
    return {"reminders_sent": len(due_visits)}
