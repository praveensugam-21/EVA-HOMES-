from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from database import Base

# Plain string status column (not a native DB enum) so this stays portable
# across SQLite / Postgres / Supabase without enum-migration friction.
# Valid values: pending, confirmed, rejected, cancelled, completed
VISIT_STATUSES = {"pending", "confirmed", "rejected", "cancelled", "completed"}


class Visit(Base):
    """A buyer's request to physically view a property, routed to the seller."""

    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    requested_date = Column(DateTime, nullable=False)
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
