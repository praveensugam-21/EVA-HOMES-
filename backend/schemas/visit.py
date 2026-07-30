from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

VALID_VISIT_STATUSES = {"pending", "confirmed", "rejected", "cancelled", "completed"}


class VisitCreate(BaseModel):
    property_id: int = Field(gt=0)
    requested_date: datetime
    message: Optional[str] = Field(default=None, max_length=1000)


class VisitUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in VALID_VISIT_STATUSES:
            raise ValueError(f"status must be one of {sorted(VALID_VISIT_STATUSES)}")
        return v


class VisitResponse(BaseModel):
    id: int
    property_id: int
    buyer_id: int
    requested_date: datetime
    message: Optional[str] = None
    status: str
    created_at: datetime

    # Denormalized display fields, populated by the router
    property_title: Optional[str] = None
    property_thumbnail_url: Optional[str] = None
    buyer_name: Optional[str] = None

    model_config = {"from_attributes": True}


class VisitListResponse(BaseModel):
    items: list[VisitResponse]
    total: int
