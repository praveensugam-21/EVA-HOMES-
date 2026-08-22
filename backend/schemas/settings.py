from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


def normalize_phone(value: str) -> str:
    phone = value.strip().replace(" ", "").replace("-", "")
    if not phone.startswith("+"):
        phone = f"+{phone}"
    return phone


class BrokerSettingsBase(BaseModel):
    broker_name: str
    broker_phone: str
    broker_whatsapp: str

    @field_validator("broker_name")
    @classmethod
    def validate_name(cls, value):
        name = value.strip()
        if len(name) < 2:
            raise ValueError("Agent name is required.")
        return name

    @field_validator("broker_phone", "broker_whatsapp")
    @classmethod
    def validate_phone(cls, value):
        phone = normalize_phone(value)
        digits = "".join(ch for ch in phone if ch.isdigit())
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError("Phone number must contain 10 to 15 digits.")
        return phone


class BrokerSettingsUpdate(BrokerSettingsBase):
    # Offline/manual payment details for the location/phone unlock feature.
    # Optional so admin can save agent-contact edits without having to
    # resend these every time (and vice versa).
    photo_url: Optional[str] = None
    payment_qr_image_url: Optional[str] = None
    payment_phone: Optional[str] = None
    phone_unlock_fee: Optional[float] = None
    map_unlock_fee: Optional[float] = None

    @field_validator("payment_phone")
    @classmethod
    def validate_payment_phone(cls, value):
        if not value:
            return value
        return normalize_phone(value)

    @field_validator("phone_unlock_fee", "map_unlock_fee")
    @classmethod
    def validate_unlock_fee(cls, value):
        if value is not None and value < 0:
            raise ValueError("Unlock fee cannot be negative.")
        return value


class BrokerSettingsResponse(BrokerSettingsBase):
    id: int
    photo_url: Optional[str] = None
    payment_qr_image_url: Optional[str] = None
    payment_phone: Optional[str] = None
    phone_unlock_fee: float
    map_unlock_fee: float
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaymentInfoResponse(BaseModel):
    """Public-facing subset — what a buyer needs to see to pay the unlock fee."""
    payment_qr_image_url: Optional[str] = None
    payment_phone: Optional[str] = None
    phone_unlock_fee: float
    map_unlock_fee: float
