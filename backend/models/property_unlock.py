from datetime import datetime, timezone
import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from database import Base


class UnlockStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class PropertyUnlock(Base):
    """
    A buyer's claim to have paid the (offline, UPI/QR) unlock fee for one
    property. Admin manually checks their own UPI app against
    payment_reference and flips status to verified/rejected — nothing here
    talks to a real payment gateway.

    Once status == verified, GET /api/properties/{id} and
    GET /api/properties/{id}/contact start including the real map link and
    the seller's real phone number for this user_id + property_id pair only.
    """

    __tablename__ = "property_unlocks"
    __table_args__ = (
        UniqueConstraint("user_id", "property_id", name="uq_unlock_user_property"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)

    status = Column(Enum(UnlockStatus), default=UnlockStatus.PENDING, nullable=False)
    payment_reference = Column(String(100), nullable=True)

    requested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime, nullable=True)
    # SET NULL, not CASCADE: this is provenance on the BUYER's own unlock
    # request (who happened to review it), not the reviewing admin's data —
    # deleting that admin shouldn't destroy every unlock request they ever
    # verified.
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    property = relationship("Property", back_populates="unlocks")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    def __repr__(self):
        return f"<PropertyUnlock id={self.id} user_id={self.user_id} property_id={self.property_id} status={self.status}>"
