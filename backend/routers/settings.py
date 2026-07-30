from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.config import settings
from database import get_db
from models.broker_settings import BrokerSettings
from models.user import User
from routers.auth import get_admin_user
from schemas.settings import BrokerSettingsResponse, BrokerSettingsUpdate, PaymentInfoResponse


router = APIRouter(prefix="/api/settings", tags=["Settings"])


def get_or_create_broker_settings(db: Session) -> BrokerSettings:
    broker_settings = db.query(BrokerSettings).filter(BrokerSettings.id == 1).first()
    if broker_settings:
        return broker_settings

    broker_settings = BrokerSettings(
        id=1,
        broker_name=settings.BROKER_NAME,
        broker_phone=settings.BROKER_PHONE,
        broker_whatsapp=settings.BROKER_WHATSAPP,
    )
    db.add(broker_settings)
    db.commit()
    db.refresh(broker_settings)
    return broker_settings


@router.get(
    "/broker-contact",
    response_model=BrokerSettingsResponse,
    summary="Get current broker contact settings"
)
def get_broker_contact(db: Session = Depends(get_db)):
    return get_or_create_broker_settings(db)


@router.get(
    "/payment-info",
    response_model=PaymentInfoResponse,
    summary="Get the UPI QR code / phone / fee for the location-unlock feature"
)
def get_payment_info(db: Session = Depends(get_db)):
    return get_or_create_broker_settings(db)


@router.put(
    "/broker-contact",
    response_model=BrokerSettingsResponse,
    summary="Update broker contact settings (admin only)"
)
def update_broker_contact(
    broker_data: BrokerSettingsUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    broker_settings = get_or_create_broker_settings(db)
    broker_settings.broker_name = broker_data.broker_name
    broker_settings.broker_phone = broker_data.broker_phone
    broker_settings.broker_whatsapp = broker_data.broker_whatsapp

    if broker_data.payment_qr_image_url is not None:
        broker_settings.payment_qr_image_url = broker_data.payment_qr_image_url
    if broker_data.payment_phone is not None:
        broker_settings.payment_phone = broker_data.payment_phone
    if broker_data.unlock_fee is not None:
        broker_settings.unlock_fee = broker_data.unlock_fee

    db.commit()
    db.refresh(broker_settings)
    return broker_settings
