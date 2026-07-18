# ============================================================
# schemas/enquiry.py — Pydantic Schemas for Enquiries
# ============================================================

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---- CREATE SCHEMA ----
# Body of POST /api/enquiries
class EnquiryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = None
    message: str = Field(min_length=10, max_length=2000)
    property_id: Optional[int] = Field(default=None, gt=0)  # Which property? (optional)
    source: Literal["form", "callback_request", "call_broker", "whatsapp"] = "form"

    @field_validator("name", "message")
    @classmethod
    def strip_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be empty.")
        return cleaned

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        if not value:
            return None

        cleaned = value.strip()
        digits = "".join(ch for ch in cleaned if ch.isdigit())
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError("Phone number must contain 10 to 15 digits.")
        return cleaned


# ---- RESPONSE SCHEMA ----
class EnquiryResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    message: str
    property_id: Optional[int] = None
    user_id: Optional[int] = None
    source: str
    status: str
    broker_notes: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class EnquiryAdminItem(EnquiryResponse):
    property_title: Optional[str] = None
    property_city: Optional[str] = None
    property_locality: Optional[str] = None


class EnquiryListResponse(BaseModel):
    items: list[EnquiryAdminItem]
    total: int
    unread_count: int
    new_count: int


class EnquiryUpdate(BaseModel):
    status: Optional[Literal["new", "read", "contacted", "closed"]] = None
    is_read: Optional[bool] = None
    broker_notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("broker_notes")
    @classmethod
    def normalize_notes(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None
