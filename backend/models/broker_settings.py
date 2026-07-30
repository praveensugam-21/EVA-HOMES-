from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Integer, String
from database import Base


class BrokerSettings(Base):
    __tablename__ = "broker_settings"

    id = Column(Integer, primary_key=True, index=True)
    broker_name = Column(String(100), nullable=False)
    broker_phone = Column(String(20), nullable=False)
    broker_whatsapp = Column(String(20), nullable=False)

    # Offline/manual payment details for the per-property location+phone
    # unlock feature (see models/property_unlock.py). No payment gateway —
    # buyers pay via UPI to this QR/phone directly, admin verifies manually.
    payment_qr_image_url = Column(String(500), nullable=True)
    payment_phone = Column(String(20), nullable=True)
    unlock_fee = Column(Float, default=20.0, nullable=False)

    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
