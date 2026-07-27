from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from database import Base

class EnquiryNote(Base):
    __tablename__ = "enquiry_notes"

    id = Column(Integer, primary_key=True, index=True)
    enquiry_id = Column(Integer, ForeignKey("enquiries.id"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    enquiry = relationship("Enquiry", back_populates="notes")

    def __repr__(self):
        return f"<EnquiryNote id={self.id} enquiry_id={self.enquiry_id}>"
