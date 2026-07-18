# ============================================================
# schemas/property.py — Pydantic Schemas for Properties
# ============================================================
# Same pattern as user schemas:
# - PropertyCreate → body of POST request
# - PropertyUpdate → body of PUT request (all optional)
# - PropertyResponse → what we send back to the client
# - PropertyListResponse → a slimmer version for listing pages
# ============================================================

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, model_validator

# Import our Enum types from the model
# We reuse the same enums for both DB and API validation
from models.property import ListingType, PropertyStatus, PropertyType


# ---- IMAGE SCHEMAS ----

class PropertyImageCreate(BaseModel):
    url: str
    caption: Optional[str] = None
    order: int = 0


class PropertyImageResponse(BaseModel):
    id: int
    url: str
    caption: Optional[str] = None
    order: int
    model_config = {"from_attributes": True}


# ---- PROPERTY BASE ----
# Shared fields between Create and Response
class PropertyBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    price_label: Optional[str] = None
    city: str
    locality: Optional[str] = None
    address: Optional[str] = None
    property_type: PropertyType = PropertyType.APARTMENT
    listing_type: ListingType = ListingType.BUY
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area_sqft: Optional[float] = None
    thumbnail_url: Optional[str] = None
    bathroom_image_url: str
    hall_image_url: str
    kitchen_image_url: str
    has_parking: bool = False
    parking_image_url: Optional[str] = None
    google_maps_link: str


# ---- CREATE SCHEMA ----
# Sent by the client when posting a new property
# client also sends a list of image URLs (optional)
class PropertyCreate(PropertyBase):
    images: Optional[List[PropertyImageCreate]] = []

    @model_validator(mode="after")
    def check_parking_image(self):
        if self.has_parking and not self.parking_image_url:
            raise ValueError("Parking image is required when parking is enabled.")
        return self


# ---- UPDATE SCHEMA ----
# ALL fields optional — client only sends what changed
class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    price_label: Optional[str] = None
    city: Optional[str] = None
    locality: Optional[str] = None
    address: Optional[str] = None
    property_type: Optional[PropertyType] = None
    listing_type: Optional[ListingType] = None
    status: Optional[PropertyStatus] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area_sqft: Optional[float] = None
    thumbnail_url: Optional[str] = None
    bathroom_image_url: Optional[str] = None
    hall_image_url: Optional[str] = None
    kitchen_image_url: Optional[str] = None
    has_parking: Optional[bool] = None
    parking_image_url: Optional[str] = None
    google_maps_link: Optional[str] = None
    is_featured: Optional[bool] = None
    is_verified: Optional[bool] = None


# ---- FULL RESPONSE (single property detail page) ----
class PropertyResponse(PropertyBase):
    id: int
    status: PropertyStatus
    is_featured: bool
    is_verified: bool
    owner_id: int
    created_at: datetime
    images: List[PropertyImageResponse] = []

    # Owner's name — we'll populate this manually in the router
    owner_name: Optional[str] = None

    model_config = {"from_attributes": True}


# ---- LIST RESPONSE (lighter — for listing pages / cards) ----
# We don't want to send ALL fields when showing a grid of 20 properties.
# This is a slimmer version with just the card-display info.
class PropertyListItem(BaseModel):
    id: int
    title: str
    city: str
    locality: Optional[str] = None
    price: float
    price_label: Optional[str] = None
    property_type: PropertyType
    listing_type: ListingType
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area_sqft: Optional[float] = None
    thumbnail_url: Optional[str] = None
    is_featured: bool
    is_verified: bool
    has_parking: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- PAGINATED LIST RESPONSE ----
# Wraps a list with pagination metadata so the frontend knows
# how many pages exist, what page we're on, etc.
class PropertyListResponse(BaseModel):
    items: List[PropertyListItem]
    total: int        # total count of matching properties
    page: int         # current page number
    per_page: int     # how many items per page
    total_pages: int  # total number of pages


class PropertyContactResponse(BaseModel):
    property_id: int
    owner_name: Optional[str] = None
    owner_phone_masked: Optional[str] = None
    broker_name: str
    broker_phone: str
    whatsapp_link: str


class PropertyAdminItem(BaseModel):
    id: int
    title: str
    city: str
    locality: Optional[str] = None
    price: float
    price_label: Optional[str] = None
    property_type: PropertyType
    listing_type: ListingType
    status: PropertyStatus
    thumbnail_url: Optional[str] = None
    is_featured: bool
    is_verified: bool
    owner_id: int
    owner_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PropertyAdminListResponse(BaseModel):
    items: List[PropertyAdminItem]
    total: int
