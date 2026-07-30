from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base


class SavedProperty(Base):
    """A buyer's wishlist entry — one row per (user, property) pair."""

    __tablename__ = "saved_properties"
    __table_args__ = (
        UniqueConstraint("user_id", "property_id", name="uq_saved_property_user_property"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")
    property = relationship("Property")
