from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from database import Base


class SellerDocument(Base):
    """A single verification document uploaded for a seller profile (ID proof, address proof, etc.)."""

    __tablename__ = "seller_documents"

    id = Column(Integer, primary_key=True, index=True)
    seller_profile_id = Column(Integer, ForeignKey("seller_profiles.id"), nullable=False, index=True)
    doc_type = Column(String(50), nullable=False)
    file_url = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    seller_profile = relationship("SellerProfile", back_populates="documents")

    def __repr__(self):
        return f"<SellerDocument id={self.id} seller_profile_id={self.seller_profile_id} type={self.doc_type}>"
