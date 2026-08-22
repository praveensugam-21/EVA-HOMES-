from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from core.notify import notify
from core.rate_limit import client_identifier, rate_limiter
from database import get_db
from models.enquiry import Enquiry
from models.enquiry_note import EnquiryNote
from models.property import Property
from models.user import User
from routers.auth import get_admin_user, get_current_user, get_current_user_optional
from schemas.enquiry import (
    EnquiryAdminItem,
    EnquiryCreate,
    EnquiryListResponse,
    EnquiryNoteCreate,
    EnquiryNoteOut,
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
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Anyone can submit an enquiry — login is not required. If the visitor
    happens to be logged in, the enquiry is attributed to their account
    (Enquiry.user_id) so it shows up under their "My Enquiries" dashboard.
    A simple per-client rate limit reduces abuse on the public form.
    """
    rate_limiter.check(
        client_identifier(request, "submit-enquiry"),
        limit=5,
        window_seconds=60,
    )

    prop = None
    if enquiry_data.property_id:
        prop = db.query(Property).filter(Property.id == enquiry_data.property_id).first()
        if not prop:
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
        user_id=current_user.id if current_user else None,
    )
    db.add(new_enquiry)
    db.flush()

    if prop:
        notify(
            db,
            user_id=prop.owner_id,
            title="New enquiry",
            message=f"{enquiry_data.name} enquired about \"{prop.title}\".",
            link="/dashboard/seller/enquiries",
        )

    if current_user:
        db.add(EnquiryNote(
            enquiry_id=new_enquiry.id,
            text="Thanks — we've received your enquiry and the agent desk will be in touch shortly.",
        ))

    db.commit()
    db.refresh(new_enquiry)
    return new_enquiry


@router.get(
    "/mine",
    response_model=EnquiryListResponse,
    summary="List the current user's own submitted enquiries"
)
def list_my_enquiries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enquiries = (
        db.query(Enquiry)
        .options(joinedload(Enquiry.property), selectinload(Enquiry.notes))
        .outerjoin(Property, Property.id == Enquiry.property_id)
        .filter(Enquiry.user_id == current_user.id)
        .order_by(Enquiry.created_at.desc())
        .all()
    )
    items = [
        EnquiryAdminItem(
            **EnquiryResponse.model_validate(enquiry).model_dump(),
            property_title=enquiry.property.title if enquiry.property else None,
            property_city=enquiry.property.city if enquiry.property else None,
            property_locality=enquiry.property.locality if enquiry.property else None,
            notes=enquiry.notes,
        )
        for enquiry in enquiries
    ]
    return EnquiryListResponse(items=items, total=len(items), unread_count=0, new_count=0)


@router.get(
    "/received",
    response_model=EnquiryListResponse,
    summary="List enquiries received on the current seller's properties"
)
def list_received_enquiries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enquiries = (
        db.query(Enquiry)
        .options(joinedload(Enquiry.property), selectinload(Enquiry.notes))
        .join(Property, Property.id == Enquiry.property_id)
        .filter(Property.owner_id == current_user.id)
        .order_by(Enquiry.created_at.desc())
        .all()
    )
    items = [
        EnquiryAdminItem(
            **EnquiryResponse.model_validate(enquiry).model_dump(),
            property_title=enquiry.property.title if enquiry.property else None,
            property_city=enquiry.property.city if enquiry.property else None,
            property_locality=enquiry.property.locality if enquiry.property else None,
            notes=enquiry.notes,
        )
        for enquiry in enquiries
    ]
    unread_count = sum(1 for e in enquiries if not e.is_read)
    new_count = sum(1 for e in enquiries if e.status == "new")
    return EnquiryListResponse(items=items, total=len(items), unread_count=unread_count, new_count=new_count)


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
    query = (
        db.query(Enquiry)
        .options(joinedload(Enquiry.property), selectinload(Enquiry.notes))
        .outerjoin(Property, Property.id == Enquiry.property_id)
    )

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
            notes=enquiry.notes,
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
    summary="Update an enquiry (admin, or the seller who owns the linked property)"
)
def update_enquiry(
    enquiry_id: int,
    enquiry_data: EnquiryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enquiry = db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found.")

    is_owner = enquiry.property is not None and enquiry.property.owner_id == current_user.id
    if not current_user.is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized to update this enquiry.")

    if enquiry_data.broker_notes is not None and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only the agent desk can edit these notes.")

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


@router.post(
    "/{enquiry_id}/notes",
    response_model=EnquiryNoteOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a timestamped reply to an enquiry (admin, or the seller who owns the linked property)"
)
def add_enquiry_note(
    enquiry_id: int,
    note_data: EnquiryNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enquiry = db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found.")

    is_owner = enquiry.property is not None and enquiry.property.owner_id == current_user.id
    if not current_user.is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized to reply to this enquiry.")

    note = EnquiryNote(enquiry_id=enquiry_id, text=note_data.text)
    db.add(note)
    db.flush()

    if enquiry.user_id:
        notify(
            db,
            user_id=enquiry.user_id,
            title="Reply to your enquiry",
            message=note_data.text,
            link="/dashboard/buyer/enquiries",
        )

    db.commit()
    db.refresh(note)
    return note
