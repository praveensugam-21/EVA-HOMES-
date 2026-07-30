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
from models.property import ListingType, ParkingType, PropertyStatus, PropertyType


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
    parking_type: ParkingType = ParkingType.NONE
    parking_image_url: Optional[str] = None
    google_maps_link: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# ---- CREATE SCHEMA ----
# Sent by the client when posting a new property
# client also sends a list of image URLs (optional)
class PropertyCreate(PropertyBase):
    images: Optional[List[PropertyImageCreate]] = []

    @model_validator(mode="after")
    def check_parking_image(self):
        if self.parking_type != ParkingType.NONE and not self.parking_image_url:
            raise ValueError("Parking image is required when parking type is open or closed.")
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
    parking_type: Optional[ParkingType] = None
    parking_image_url: Optional[str] = None
    google_maps_link: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_featured: Optional[bool] = None
    is_verified: Optional[bool] = None


# ---- FULL RESPONSE (single property detail page) ----
class PropertyResponse(PropertyBase):
    id: int
    status: PropertyStatus
    is_featured: bool
    is_verified: bool
    view_count: int = 0
    owner_id: int
    created_at: datetime
    images: List[PropertyImageResponse] = []

    # Overridden as Optional — the router nulls this out unless the viewer
    # owns the listing, is an admin, or has a verified PropertyUnlock for it.
    google_maps_link: Optional[str] = None

    # True if the caller is entitled to see the real google_maps_link above
    # (and the seller's real phone via GET /{id}/contact). Drives whether
    # the frontend shows the map or the "pay to unlock" card.
    location_unlocked: bool = False

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
    parking_type: ParkingType
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

    # Only populated when the caller has a verified PropertyUnlock for this
    # property (or owns/administers it) — the real, unmasked owner phone.
    location_unlocked: bool = False
    owner_phone: Optional[str] = None


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
    view_count: int = 0
    owner_id: int
    owner_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PropertyAdminListResponse(BaseModel):
    items: List[PropertyAdminItem]
    total: int


# ---- Seller listing analytics (GET /api/properties/mine/analytics) ----
class PropertyAnalyticsItem(BaseModel):
    id: int
    title: str
    status: PropertyStatus
    view_count: int
    enquiry_count: int
    visit_count: int
    offer_count: int


class PropertyAnalyticsSummary(BaseModel):
    total_listings: int
    active_listings: int
    pending_listings: int
    total_views: int
    total_enquiries: int
    total_visits: int
    total_offers: int
    items: List[PropertyAnalyticsItem]
