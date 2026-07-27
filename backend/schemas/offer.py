from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

VALID_OFFER_STATUSES = {"pending", "accepted", "rejected", "withdrawn"}


class OfferCreate(BaseModel):
    property_id: int = Field(gt=0)
    amount: float = Field(gt=0)
    message: Optional[str] = Field(default=None, max_length=1000)


class OfferUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in VALID_OFFER_STATUSES:
            raise ValueError(f"status must be one of {sorted(VALID_OFFER_STATUSES)}")
        return v


class OfferResponse(BaseModel):
    id: int
    property_id: int
    buyer_id: int
    amount: float
    message: Optional[str] = None
    status: str
    created_at: datetime

    property_title: Optional[str] = None
    property_thumbnail_url: Optional[str] = None
    buyer_name: Optional[str] = None

    model_config = {"from_attributes": True}


class OfferListResponse(BaseModel):
    items: list[OfferResponse]
    total: int
