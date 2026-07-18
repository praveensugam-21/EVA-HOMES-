from datetime import datetime
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
            raise ValueError("Broker name is required.")
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
    pass


class BrokerSettingsResponse(BrokerSettingsBase):
    id: int
    updated_at: datetime

    model_config = {"from_attributes": True}
