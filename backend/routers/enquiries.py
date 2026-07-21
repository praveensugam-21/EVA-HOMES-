from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.rate_limit import client_identifier, rate_limiter
from database import get_db
from models.enquiry import Enquiry
from models.property import Property
from models.user import User
from routers.auth import get_admin_user
from schemas.enquiry import (
    EnquiryAdminItem,
    EnquiryCreate,
    EnquiryListResponse,
    EnquiryResponse,
    EnquiryUpdate,
)

router = APIRouter(prefix="/api/enquiries", tags=["Enquiries"])


@router.post(
    "",
    response_model=EnquiryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a contact enquiry"
)
def submit_enquiry(
    request: Request,
    enquiry_data: EnquiryCreate,
    db: Session = Depends(get_db),
):
    """
    Anyone can submit an enquiry.
    A simple per-client rate limit reduces abuse on the public form.
    """
    rate_limiter.check(
        client_identifier(request, "submit-enquiry"),
        limit=5,
        window_seconds=60,
    )

    if enquiry_data.property_id:
        property_exists = (
            db.query(Property.id)
            .filter(Property.id == enquiry_data.property_id)
            .first()
        )
        if not property_exists:
            raise HTTPException(status_code=404, detail="Property not found.")

    new_enquiry = Enquiry(
        name=enquiry_data.name,
        email=enquiry_data.email,
        phone=enquiry_data.phone,
        message=enquiry_data.message,
        source=enquiry_data.source,
        status="read" if enquiry_data.source == "whatsapp" else "new",
        property_id=enquiry_data.property_id,
        is_read=enquiry_data.source == "whatsapp",
    )
    db.add(new_enquiry)
    db.commit()
    db.refresh(new_enquiry)
    return new_enquiry


@router.get(
    "",
    response_model=EnquiryListResponse,
    summary="Get all enquiries (admin only)"
)
def list_enquiries(
    status_filter: Optional[str] = Query(None, alias="status"),
    unread_only: bool = Query(False),
    search: Optional[str] = Query(None, min_length=2),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    """
    Returns broker-facing enquiry data with counts for the admin dashboard.
    """
    query = db.query(Enquiry).outerjoin(Property, Property.id == Enquiry.property_id)

    if status_filter:
        query = query.filter(Enquiry.status == status_filter)

    if unread_only:
        query = query.filter(Enquiry.is_read.is_(False))

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            Enquiry.name.ilike(search_term) |
            Enquiry.email.ilike(search_term) |
            Enquiry.phone.ilike(search_term) |
            Enquiry.message.ilike(search_term) |
            Property.title.ilike(search_term)
        )

    enquiries = query.order_by(Enquiry.created_at.desc()).all()
    unread_count = db.query(func.count(Enquiry.id)).filter(Enquiry.is_read.is_(False)).scalar() or 0
    new_count = db.query(func.count(Enquiry.id)).filter(Enquiry.status == "new").scalar() or 0

    items = [
        EnquiryAdminItem(
            **EnquiryResponse.model_validate(enquiry).model_dump(),
            property_title=enquiry.property.title if enquiry.property else None,
            property_city=enquiry.property.city if enquiry.property else None,
            property_locality=enquiry.property.locality if enquiry.property else None,
        )
        for enquiry in enquiries
    ]

    return EnquiryListResponse(
        items=items,
        total=len(items),
        unread_count=unread_count,
        new_count=new_count,
    )


@router.put(
    "/{enquiry_id}",
    response_model=EnquiryResponse,
    summary="Update an enquiry (admin only)"
)
def update_enquiry(
    enquiry_id: int,
    enquiry_data: EnquiryUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    enquiry = db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found.")

    if enquiry_data.status is not None:
        enquiry.status = enquiry_data.status
        if enquiry_data.status in {"read", "contacted", "closed"}:
            enquiry.is_read = True

    if enquiry_data.is_read is not None:
        enquiry.is_read = enquiry_data.is_read

    if enquiry_data.broker_notes is not None:
        enquiry.broker_notes = enquiry_data.broker_notes

    db.commit()
    db.refresh(enquiry)
    return enquiry
