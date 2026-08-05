from sqlalchemy import Boolean, Column, ForeignKey, Integer
from sqlalchemy.orm import relationship
from database import Base


class NotificationPreference(Base):
    """One-to-one notification settings for a user. Created lazily with
    sensible defaults the first time a user reads or edits their settings."""

    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    email_on_enquiry = Column(Boolean, default=True, nullable=False)
    email_on_visit_offer_update = Column(Boolean, default=True, nullable=False)
    email_on_verification_update = Column(Boolean, default=True, nullable=False)
    sms_notifications = Column(Boolean, default=False, nullable=False)

    user = relationship("User")
