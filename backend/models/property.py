from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, DateTime, Float,
    ForeignKey, Integer, String, Text, Enum
)
from sqlalchemy.orm import relationship
import enum
from database import Base

class PropertyType(str, enum.Enum):
    APARTMENT = "apartment"
    VILLA = "villa"
    PLOT = "plot"
    COMMERCIAL = "commercial"
    HOUSE = "house"

class ListingType(str, enum.Enum):
    BUY = "buy"
    RENT = "rent"
    COMMERCIAL = "commercial"

class PropertyStatus(str, enum.Enum):
    ACTIVE = "active"
    SOLD = "sold"
    RENTED = "rented"
    INACTIVE = "inactive"

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    price_label = Column(String(50), nullable=True)
    city = Column(String(100), nullable=False, index=True)
    locality = Column(String(200), nullable=True)
    address = Column(Text, nullable=True)

    property_type = Column(Enum(PropertyType), default=PropertyType.APARTMENT, nullable=False)
    listing_type = Column(Enum(ListingType), default=ListingType.BUY, nullable=False)
    status = Column(Enum(PropertyStatus), default=PropertyStatus.ACTIVE, nullable=False)

    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Integer, nullable=True)
    area_sqft = Column(Float, nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    is_featured = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    owner = relationship("User", back_populates="properties")
    images = relationship(
        "PropertyImage",
        back_populates="property",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Property id={self.id} title={self.title} city={self.city}>"

class PropertyImage(Base):
    __tablename__ = "property_images"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(500), nullable=False)
    caption = Column(String(200), nullable=True)
    order = Column(Integer, default=0)

    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    property = relationship("Property", back_populates="images")

