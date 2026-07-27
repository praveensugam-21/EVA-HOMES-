# ============================================================
# routers/offers.py — Property Price Offers
# ============================================================
# POST /api/offers              → buyer makes an offer
# GET  /api/offers/mine          → buyer's own offers
# GET  /api/offers/received      → seller's incoming offers (their properties)
# PUT  /api/offers/{id}          → seller accepts/rejects, or buyer withdraws
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.notify import notify
from database import get_db
from models.property import Property
from models.offer import Offer
from models.user import User
from routers.auth import get_current_user
from schemas.offer import OfferCreate, OfferListResponse, OfferResponse, OfferUpdate

router = APIRouter(prefix="/api/offers", tags=["Offers"])


def _to_response(offer: Offer) -> OfferResponse:
    response = OfferResponse.model_validate(offer)
    response.property_title = offer.property.title if offer.property else None
    response.property_thumbnail_url = offer.property.thumbnail_url if offer.property else None
    response.buyer_name = offer.buyer.full_name if offer.buyer else None
    return response


@router.post("", response_model=OfferResponse, status_code=status.HTTP_201_CREATED, summary="Make a price offer on a property")
def create_offer(
    offer_data: OfferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = db.query(Property).filter(Property.id == offer_data.property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")

    offer = Offer(
        property_id=prop.id,
        buyer_id=current_user.id,
        amount=offer_data.amount,
        message=offer_data.message,
    )
    db.add(offer)
    db.flush()

    notify(
        db,
        user_id=prop.owner_id,
        title="New offer received",
        message=f"{current_user.full_name} offered {offer_data.amount} on \"{prop.title}\".",
        link="/dashboard/seller/offers",
    )

    db.commit()
    db.refresh(offer)
    return _to_response(offer)


@router.get("/mine", response_model=OfferListResponse, summary="List the current user's own offers")
def list_my_offers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offers = (
        db.query(Offer)
        .filter(Offer.buyer_id == current_user.id)
        .order_by(Offer.created_at.desc())
        .all()
    )
    return OfferListResponse(items=[_to_response(o) for o in offers], total=len(offers))


@router.get("/received", response_model=OfferListResponse, summary="List offers received on the current seller's properties")
def list_received_offers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offers = (
        db.query(Offer)
        .join(Property, Property.id == Offer.property_id)
        .filter(Property.owner_id == current_user.id)
        .order_by(Offer.created_at.desc())
        .all()
    )
    return OfferListResponse(items=[_to_response(o) for o in offers], total=len(offers))


@router.put("/{offer_id}", response_model=OfferResponse, summary="Update an offer's status")
def update_offer(
    offer_id: int,
    update_data: OfferUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    is_seller = offer.property.owner_id == current_user.id
    is_buyer = offer.buyer_id == current_user.id
    if not is_seller and not is_buyer and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your offer.")

    if is_buyer and not is_seller and update_data.status != "withdrawn":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Buyers can only withdraw an offer.")

    offer.status = update_data.status
    db.flush()

    if is_seller:
        notify(
            db,
            user_id=offer.buyer_id,
            title="Offer update",
            message=f"Your offer of {offer.amount} on \"{offer.property.title}\" was {update_data.status}.",
            link="/dashboard/buyer/offers",
        )
    elif is_buyer:
        notify(
            db,
            user_id=offer.property.owner_id,
            title="Offer withdrawn",
            message=f"{current_user.full_name} withdrew their offer on \"{offer.property.title}\".",
            link="/dashboard/seller/offers",
        )

    db.commit()
    db.refresh(offer)
    return _to_response(offer)
