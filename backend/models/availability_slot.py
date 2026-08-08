from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Time
from sqlalchemy.orm import relationship
from database import Base


class AvailabilitySlot(Base):
    """
    A seller-defined one-off visit slot for a specific property — a
    specific calendar date + time window, not a recurring weekly pattern.
    A buyer books a visit by claiming an unbooked slot (see models/visit.py
    Visit.slot_id); once booked, is_booked=True takes it out of the pool
    for anyone else.
    """

    __tablename__ = "availability_slots"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)

    specific_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_booked = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    seller = relationship("User")
    property = relationship("Property")

    def __repr__(self):
        return f"<AvailabilitySlot id={self.id} property_id={self.property_id} date={self.specific_date} booked={self.is_booked}>"
