# ============================================================
# schemas/enquiry.py — Pydantic Schemas for Enquiries
# ============================================================

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# ---- CREATE SCHEMA ----
# Body of POST /api/enquiries
class EnquiryCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str
    property_id: Optional[int] = None  # Which property? (optional)


# ---- RESPONSE SCHEMA ----
class EnquiryResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    message: str
    property_id: Optional[int] = None
    user_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
