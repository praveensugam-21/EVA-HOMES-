from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from models.property_unlock import UnlockStatus, UnlockType


class UnlockRequestCreate(BaseModel):
    unlock_type: UnlockType
    payment_reference: str = Field(min_length=3, max_length=100)


class UnlockReview(BaseModel):
    status: UnlockStatus  # only "verified" or "rejected" make sense here


class UnlockResponse(BaseModel):
    id: int
    property_id: int
    unlock_type: UnlockType
    status: UnlockStatus
    payment_reference: Optional[str] = None
    amount_paid: float
    requested_at: datetime
    reviewed_at: Optional[datetime] = None

    # Convenience fields the frontend needs without a second lookup
    property_title: Optional[str] = None
    property_thumbnail_url: Optional[str] = None

    model_config = {"from_attributes": True}


class UnlockAdminItem(UnlockResponse):
    buyer_name: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_phone: Optional[str] = None
    reviewed_by_name: Optional[str] = None


class UnlockListResponse(BaseModel):
    items: List[UnlockResponse]
    total: int


class UnlockAdminListResponse(BaseModel):
    items: List[UnlockAdminItem]
    total: int
    pending_count: int = 0
