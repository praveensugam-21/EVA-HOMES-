# ============================================================
# routers/visits.py — Property Visit Requests
# ============================================================
# POST /api/visits              → buyer requests a visit
# GET  /api/visits/mine          → buyer's own visit requests
# GET  /api/visits/received      → seller's incoming visit requests (their properties)
# PUT  /api/visits/{id}          → seller responds, or buyer cancels
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.notify import notify
from database import get_db
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


@router.post("", response_model=VisitResponse, status_code=status.HTTP_201_CREATED, summary="Request a property visit")
def create_visit(
    visit_data: VisitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts manage the marketplace and can't request visits.",
        )

    prop = db.query(Property).filter(Property.id == visit_data.property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")

    visit = Visit(
        property_id=prop.id,
        buyer_id=current_user.id,
        requested_date=visit_data.requested_date,
        message=visit_data.message,
    )
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
