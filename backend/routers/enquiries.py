# ============================================================
# routers/enquiries.py — Contact Enquiry Endpoints
# ============================================================
# POST /api/enquiries         → Submit a new enquiry (public)
# GET  /api/enquiries         → View all enquiries (admin only)
# PUT  /api/enquiries/{id}/read → Mark enquiry as read (admin only)
# ============================================================

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database import get_db
from models.enquiry import Enquiry
from models.user import User
from routers.auth import get_admin_user, get_current_user
from schemas.enquiry import EnquiryCreate, EnquiryResponse

router = APIRouter(prefix="/api/enquiries", tags=["Enquiries"])


# ============================================================
# ENDPOINT 1: Submit an Enquiry (PUBLIC — no login needed)
# POST /api/enquiries
# ============================================================
@router.post(
    "",
    response_model=EnquiryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a contact enquiry"
)
def submit_enquiry(
    enquiry_data: EnquiryCreate,
    db: Session = Depends(get_db),
    # current_user is optional — guests can also submit enquiries
    # We use a try-except approach via Optional dependency
):
    """
    Submits a contact enquiry.
    
    Anyone can submit — no login required.
    
    Request body:
    {
        "name": "Amit Kumar",
        "email": "amit@gmail.com",
        "phone": "9876543210",
        "message": "I'm interested in this property.",
        "property_id": 5
    }
    """
    new_enquiry = Enquiry(
        name=enquiry_data.name,
        email=enquiry_data.email,
        phone=enquiry_data.phone,
        message=enquiry_data.message,
        property_id=enquiry_data.property_id,
        # user_id will be None for guests (not logged in)
    )
    db.add(new_enquiry)
    db.commit()
    db.refresh(new_enquiry)
    return new_enquiry


# ============================================================
# ENDPOINT 2: List All Enquiries (ADMIN ONLY)
# GET /api/enquiries
# ============================================================
@router.get(
    "",
    response_model=list[EnquiryResponse],
    summary="Get all enquiries (admin only)"
)
def list_enquiries(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user)  # ← admin check
):
    """
    Returns all enquiries, newest first.
    Only accessible by admin users.
    """
    enquiries = db.query(Enquiry).order_by(Enquiry.created_at.desc()).all()
    return enquiries


# ============================================================
# ENDPOINT 3: Mark Enquiry as Read (ADMIN ONLY)
# PUT /api/enquiries/{enquiry_id}/read
# ============================================================
@router.put(
    "/{enquiry_id}/read",
    response_model=EnquiryResponse,
    summary="Mark an enquiry as read (admin only)"
)
def mark_as_read(
    enquiry_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user)
):
    """Marks an enquiry as read."""
    enquiry = db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
    if not enquiry:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Enquiry not found.")
    enquiry.is_read = True
    db.commit()
    db.refresh(enquiry)
    return enquiry
