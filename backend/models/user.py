from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """
    A single account. Every user is implicitly a buyer (can browse, enquire,
    and edit the profile fields below). Selling is an add-on capability:
    a user gains one SellerProfile (see models/seller_profile.py) only when
    they explicitly opt in — no separate account or role is required.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # ---- Buyer profile fields (every account has these) ----
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    bio = Column(String(500), nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # ---- Verification flags (set via OTP flow, see routers/auth.py) ----
    phone_verified = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)

    properties = relationship("Property", back_populates="owner")
    seller_profile = relationship(
        "SellerProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    @property
    def has_seller_profile(self) -> bool:
        return self.seller_profile is not None

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"
