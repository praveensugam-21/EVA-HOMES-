from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from database import Base

# channel: "phone" | "email"
OTP_CHANNELS = {"phone", "email"}


class OTPCode(Base):
    """
    A one-time verification code for confirming a phone number or email.

    NOTE: There is no SMS/email provider wired up yet, so the code is
    currently returned directly in the API response (dev-mode) instead of
    being delivered externally. Swap in a real provider (e.g. Twilio for
    SMS, SES/SendGrid for email) at the single call site in
    routers/auth.py — the OTP generation/verification logic here does not
    need to change.
    """

    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    channel = Column(String(10), nullable=False)
    code_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")
