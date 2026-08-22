from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int


class NotificationPreferenceResponse(BaseModel):
    email_on_enquiry: bool
    email_on_visit_offer_update: bool
    email_on_verification_update: bool
    sms_notifications: bool

    model_config = {"from_attributes": True}


class NotificationPreferenceUpdate(BaseModel):
    email_on_enquiry: Optional[bool] = None
    email_on_visit_offer_update: Optional[bool] = None
    email_on_verification_update: Optional[bool] = None
    sms_notifications: Optional[bool] = None
