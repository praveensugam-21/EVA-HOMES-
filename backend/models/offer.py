from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from database import Base

# Plain string status column, kept portable across databases.
# Valid values: pending, accepted, rejected, withdrawn
OFFER_STATUSES = {"pending", "accepted", "rejected", "withdrawn"}


class Offer(Base):
    """A buyer's price offer on a property, routed to the seller for a decision."""

    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    amount = Column(Float, nullable=False)
    message = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="pending")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    property = relationship("Property")
    buyer = relationship("User")
