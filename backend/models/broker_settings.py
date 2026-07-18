from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String
from database import Base


class BrokerSettings(Base):
    __tablename__ = "broker_settings"

    id = Column(Integer, primary_key=True, index=True)
    broker_name = Column(String(100), nullable=False)
    broker_phone = Column(String(20), nullable=False)
    broker_whatsapp = Column(String(20), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
