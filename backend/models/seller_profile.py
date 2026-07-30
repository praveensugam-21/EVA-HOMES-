from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from database import Base


class SellerProfile(Base):
    """
    The seller-side add-on for a User account. Created only when a user opts
    in to selling (POST /api/auth/me/seller-profile) — it does not replace
    or require a separate account. Buyer capability (browsing, enquiring,
    the base profile fields on User) always remains available regardless of
    whether this exists.
    """

    __tablename__ = "seller_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    business_name = Column(String(150), nullable=True)

    # Verification lifecycle: unverified -> pending -> verified | rejected
    seller_status = Column(String(20), nullable=False, default="unverified")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="seller_profile")
    documents = relationship(
        "SellerDocument", back_populates="seller_profile", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<SellerProfile id={self.id} user_id={self.user_id} status={self.seller_status}>"
