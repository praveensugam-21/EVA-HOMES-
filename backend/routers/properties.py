# ============================================================
# routers/properties.py — Property CRUD Endpoints
# ============================================================
# CRUD = Create, Read, Update, Delete
#
# GET    /api/properties          → List properties (with filters + pagination)
# GET    /api/properties/featured → Featured properties (for homepage)
# GET    /api/properties/{id}     → Single property detail
# POST   /api/properties          → Create new listing (auth required)
# PUT    /api/properties/{id}     → Edit listing (owner only)
# DELETE /api/properties/{id}     → Delete listing (owner only)
# ============================================================

import math
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from sqlalchemy import func

from core import storage
from core.config import settings
from core.storage import is_supabase_enabled
from database import get_db
from models.enquiry import Enquiry
from models.offer import Offer
from models.property import ListingType, ParkingType, Property, PropertyImage, PropertyStatus, PropertyType
from models.property_unlock import PropertyUnlock, UnlockStatus, UnlockType
from models.user import User
from models.visit import Visit
from routers.auth import get_admin_user, get_current_user, get_current_user_optional, get_seller_or_admin_user, get_seller_user
from routers.settings import get_or_create_broker_settings
from schemas.property import (
    PropertyAdminItem,
    PropertyAdminListResponse,
    PropertyAnalyticsItem,
    PropertyAnalyticsSummary,
    PropertyCreate,
    PropertyContactResponse,
    PropertyListItem,
    PropertyListResponse,
    PropertyResponse,
    PropertyUpdate,
)

router = APIRouter(prefix="/api/properties", tags=["Properties"])


def mask_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None

    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) < 6:
        return "Hidden"

    return f"{digits[:2]}{'X' * (len(digits) - 4)}{digits[-2:]}"


def whatsapp_number(phone: str) -> str:
    return "".join(ch for ch in phone if ch.isdigit())


def is_unlocked(db: Session, current_user: Optional[User], prop: Property, unlock_type: UnlockType) -> bool:
    """
    True if the given unlock_type (phone or map) should be shown: the owner
    themselves, an admin, or a buyer with a verified (paid, manually
    confirmed) PropertyUnlock of that specific type for this listing. Phone
    and map are independent — a buyer may hold one, both, or neither.
    """
    if not current_user:
        return False
    if current_user.is_admin or current_user.id == prop.owner_id:
        return True

    unlock = (
        db.query(PropertyUnlock)
        .filter(
            PropertyUnlock.user_id == current_user.id,
            PropertyUnlock.property_id == prop.id,
            PropertyUnlock.unlock_type == unlock_type,
            PropertyUnlock.status == UnlockStatus.VERIFIED,
        )
        .first()
    )
    return unlock is not None


# ============================================================
# ENDPOINT 1: List Properties (with filters & pagination)
# GET /api/properties
# ============================================================
@router.get(
    "",
    response_model=PropertyListResponse,
    summary="List all properties with optional filters"
)
def list_properties(
    # QUERY PARAMETERS — appended to the URL like:
    # /api/properties?city=Mumbai&listing_type=rent&page=2
    city: Optional[str] = Query(None, description="Filter by city name"),
    listing_type: Optional[ListingType] = Query(None, description="buy | rent | commercial"),
    property_type: Optional[PropertyType] = Query(None, description="apartment | villa | plot..."),
    min_price: Optional[float] = Query(None, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, description="Maximum price filter"),
    bedrooms: Optional[int] = Query(None, description="Filter by number of bedrooms"),
    search: Optional[str] = Query(None, description="Search in title, city, locality"),
    page: int = Query(1, ge=1, description="Page number (starts at 1)"),
    per_page: int = Query(12, ge=1, le=50, description="Items per page (max 50)"),
    db: Session = Depends(get_db),
):
    """
    Returns a paginated list of active property listings.
    
    FILTERING: You can combine multiple filters.
    PAGINATION: Use page + per_page to navigate large result sets.
    
    Example URL:
        /api/properties?city=Bangalore&listing_type=buy&min_price=50&max_price=100&page=1
    """

    # Start with base query — only show ACTIVE properties
    query = db.query(Property).filter(Property.status == PropertyStatus.ACTIVE)

    # ---- APPLY FILTERS ----
    # Each filter is optional — only add it if the user sent it

    if city:
        # ilike = case-insensitive LIKE — matches "mumbai", "Mumbai", "MUMBAI"
        query = query.filter(Property.city.ilike(f"%{city}%"))

    if listing_type:
        query = query.filter(Property.listing_type == listing_type)

    if property_type:
        query = query.filter(Property.property_type == property_type)

    if min_price is not None:
        query = query.filter(Property.price >= min_price)

    if max_price is not None:
        query = query.filter(Property.price <= max_price)

    if bedrooms is not None:
        query = query.filter(Property.bedrooms == bedrooms)

    if search:
        # Search across multiple columns using OR
        search_term = f"%{search}%"
        query = query.filter(
            Property.title.ilike(search_term) |
            Property.city.ilike(search_term) |
            Property.locality.ilike(search_term) |
            Property.description.ilike(search_term)
        )

    # ---- COUNT TOTAL (before pagination) ----
    # We need this to calculate total_pages in the response
    total = query.count()

    # ---- PAGINATION ----
    # offset = how many records to skip
    # Example: page=2, per_page=12 → skip first 12, take next 12
    offset = (page - 1) * per_page
    properties = (
        query
        .order_by(Property.created_at.desc())  # Newest first
        .offset(offset)
        .limit(per_page)
        .all()
    )

    # ---- BUILD RESPONSE ----
    total_pages = math.ceil(total / per_page) if total > 0 else 1

    return PropertyListResponse(
        items=properties,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


# ============================================================
# ENDPOINT 2: Featured Properties (for homepage)
# GET /api/properties/featured
# ============================================================
@router.get(
    "/featured",
    response_model=list[PropertyListItem],
    summary="Get featured properties for the homepage"
)
def get_featured_properties(
    limit: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db)
):
    """
    Returns featured, active properties for the homepage hero section.
    NOTE: This route must be defined BEFORE /api/properties/{id}
          otherwise FastAPI would try to match "featured" as an ID number.
    """
    properties = (
        db.query(Property)
        .filter(
            Property.status == PropertyStatus.ACTIVE
        )
        .order_by(Property.created_at.desc())
        .limit(limit)
        .all()
    )
    return properties


# ============================================================
# ENDPOINT 3: Admin Listing Moderation Feed
# GET /api/properties/admin/all
# ============================================================
@router.get(
    "/admin/all",
    response_model=PropertyAdminListResponse,
    summary="Get all properties for admin moderation"
)
def admin_list_properties(
    status_filter: Optional[PropertyStatus] = Query(None, alias="status"),
    verified: Optional[bool] = Query(None),
    featured: Optional[bool] = Query(None),
    search: Optional[str] = Query(None, min_length=2),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    query = db.query(Property).options(joinedload(Property.owner))

    if status_filter:
        query = query.filter(Property.status == status_filter)

    if verified is not None:
        query = query.filter(Property.is_verified == verified)

    if featured is not None:
        query = query.filter(Property.is_featured == featured)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            Property.title.ilike(search_term) |
            Property.city.ilike(search_term) |
            Property.locality.ilike(search_term)
        )

    properties = query.order_by(Property.created_at.desc()).all()
    items = [
        PropertyAdminItem(
            **PropertyAdminItem.model_validate(prop).model_dump(exclude={"owner_name"}),
            owner_name=prop.owner.full_name if prop.owner else None,
        )
        for prop in properties
    ]
    return PropertyAdminListResponse(items=items, total=len(items))


# ============================================================
# ENDPOINT 3b: My Listings — the logged-in user's own properties,
# regardless of status, so they can see pending/rejected/etc.
# GET /api/properties/mine
# ============================================================
@router.get(
    "/mine",
    response_model=PropertyAdminListResponse,
    summary="Get the current user's own property listings (any status)"
)
def list_my_properties(
    status_filter: Optional[PropertyStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Property).filter(Property.owner_id == current_user.id)

    if status_filter:
        query = query.filter(Property.status == status_filter)

    properties = query.order_by(Property.created_at.desc()).all()
    items = [
        PropertyAdminItem(
            **PropertyAdminItem.model_validate(prop).model_dump(exclude={"owner_name"}),
            owner_name=current_user.full_name,
        )
        for prop in properties
    ]
    return PropertyAdminListResponse(items=items, total=len(items))


# ============================================================
# ENDPOINT 3c: Listing Analytics — per-listing views/enquiries/
# visits/offers for the current seller, plus a summary.
# GET /api/properties/mine/analytics
# ============================================================
@router.get(
    "/mine/analytics",
    response_model=PropertyAnalyticsSummary,
    summary="Get listing analytics for the current seller's properties"
)
def get_my_listing_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_seller_user),
):
    properties = (
        db.query(Property)
        .filter(Property.owner_id == current_user.id)
        .order_by(Property.created_at.desc())
        .all()
    )
    property_ids = [p.id for p in properties]

    enquiry_counts = dict(
        db.query(Enquiry.property_id, func.count(Enquiry.id))
        .filter(Enquiry.property_id.in_(property_ids))
        .group_by(Enquiry.property_id)
        .all()
    ) if property_ids else {}

    visit_counts = dict(
        db.query(Visit.property_id, func.count(Visit.id))
        .filter(Visit.property_id.in_(property_ids))
        .group_by(Visit.property_id)
        .all()
    ) if property_ids else {}

    offer_counts = dict(
        db.query(Offer.property_id, func.count(Offer.id))
        .filter(Offer.property_id.in_(property_ids))
        .group_by(Offer.property_id)
        .all()
    ) if property_ids else {}

    items = [
        PropertyAnalyticsItem(
            id=p.id,
            title=p.title,
            status=p.status,
            view_count=p.view_count or 0,
            enquiry_count=enquiry_counts.get(p.id, 0),
            visit_count=visit_counts.get(p.id, 0),
            offer_count=offer_counts.get(p.id, 0),
        )
        for p in properties
    ]

    return PropertyAnalyticsSummary(
        total_listings=len(properties),
        active_listings=sum(1 for p in properties if p.status == PropertyStatus.ACTIVE),
        pending_listings=sum(1 for p in properties if p.status == PropertyStatus.PENDING),
        total_views=sum(item.view_count for item in items),
        total_enquiries=sum(item.enquiry_count for item in items),
        total_visits=sum(item.visit_count for item in items),
        total_offers=sum(item.offer_count for item in items),
        items=items,
    )


# ============================================================
# ENDPOINT 4: Get Single Property Contact
# GET /api/properties/{property_id}/contact
# ============================================================
@router.get(
    "/{property_id}/contact",
    response_model=PropertyContactResponse,
    summary="Get safe broker contact details for a property"
)
def get_property_contact(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Returns public contact details for the property.

    The owner's full phone is masked by default — visitors contact the
    broker desk instead. A buyer with a verified PropertyUnlock for this
    listing (or the owner/an admin) additionally gets the real number.
    """
    prop = db.query(Property).filter(Property.id == property_id).first()

    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Property with ID {property_id} not found."
        )

    broker_settings = get_or_create_broker_settings(db)
    message = (
        f"Hi {broker_settings.broker_name}, I am interested in property #{prop.id}: "
        f"{prop.title} in {prop.locality + ', ' if prop.locality else ''}{prop.city}."
    )
    whatsapp_link = (
        f"https://wa.me/{whatsapp_number(broker_settings.broker_whatsapp)}"
        f"?text={quote(message)}"
    )

    unlocked = is_unlocked(db, current_user, prop, UnlockType.PHONE)

    return PropertyContactResponse(
        property_id=prop.id,
        owner_name=prop.owner.full_name if prop.owner else None,
        owner_phone_masked=mask_phone(prop.owner.phone if prop.owner else None),
        owner_photo_url=(prop.owner.seller_profile.photo_url if prop.owner and prop.owner.has_seller_profile else None),
        phone_unlocked=unlocked,
        owner_phone=(prop.owner.phone if unlocked and prop.owner else None),
        broker_name=broker_settings.broker_name,
        broker_phone=broker_settings.broker_phone,
        broker_photo_url=broker_settings.photo_url,
        whatsapp_link=whatsapp_link,
    )


@router.get(
    "/{property_id}",
    response_model=PropertyResponse,
    summary="Get full details of a single property"
)
def get_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Returns full detail of one property by its ID.
    Includes all images and owner name.
    """
    # .first() returns the object or None
    prop = db.query(Property).filter(Property.id == property_id).first()

    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Property with ID {property_id} not found."
        )

    prop.view_count = (prop.view_count or 0) + 1
    db.commit()
    db.refresh(prop)

    # Manually add owner_name since it's not a DB column
    # (it comes from the related User object)
    response = PropertyResponse.model_validate(prop)
    response.owner_name = prop.owner.full_name if prop.owner else None

    unlocked = is_unlocked(db, current_user, prop, UnlockType.MAP)
    response.map_unlocked = unlocked
    if not unlocked:
        response.google_maps_link = None

    return response


# ============================================================
# ENDPOINT 4: Create Property (PROTECTED)
# POST /api/properties
# ============================================================
@router.post(
    "",
    response_model=PropertyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Post a new property listing (login required)"
)
def create_property(
    property_data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_seller_user),  # ← requires login + seller role!
):
    """
    Creates a new property listing.

    PROTECTED: You must be logged in as a seller (or admin) account.
    Buyer accounts cannot list properties. The property is automatically
    linked to the logged-in user.
    
    Request body example:
    {
        "title": "3BHK Luxury Apartment",
        "city": "Mumbai",
        "locality": "Bandra West",
        "price": 250.0,
        "price_label": "₹2.5 Cr",
        "property_type": "apartment",
        "listing_type": "buy",
        "bedrooms": 3,
        "bathrooms": 2,
        "area_sqft": 1800,
        "thumbnail_url": "https://example.com/image.jpg",
        "images": [
            {"url": "https://example.com/img1.jpg", "caption": "Living Room"},
            {"url": "https://example.com/img2.jpg", "caption": "Kitchen"}
        ]
    }
    """

    # A phone number is what makes the paid location/phone unlock feature
    # actually worth paying for — without one, a buyer who unlocks this
    # listing gets nothing for the "owner's phone number" half of it.
    if not current_user.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add a phone number to your profile before listing a property — buyers need a way to reach you.",
        )

    # Create the Property object
    new_property = Property(
        title=property_data.title,
        description=property_data.description,
        price=property_data.price,
        price_label=property_data.price_label,
        city=property_data.city,
        locality=property_data.locality,
        address=property_data.address,
        property_type=property_data.property_type,
        listing_type=property_data.listing_type,
        bedrooms=property_data.bedrooms,
        bathrooms=property_data.bathrooms,
        area_sqft=property_data.area_sqft,
        thumbnail_url=property_data.thumbnail_url,
        bathroom_image_url=property_data.bathroom_image_url,
        hall_image_url=property_data.hall_image_url,
        kitchen_image_url=property_data.kitchen_image_url,
        parking_type=property_data.parking_type,
        parking_image_url=property_data.parking_image_url,
        google_maps_link=property_data.google_maps_link,
        latitude=property_data.latitude,
        longitude=property_data.longitude,
        owner_id=current_user.id,  # ← automatically link to logged-in user
    )

    db.add(new_property)
    db.flush()  # flush to get new_property.id (before commit)

    # Add images if provided
    for img_data in property_data.images or []:
        image = PropertyImage(
            url=img_data.url,
            caption=img_data.caption,
            order=img_data.order,
            property_id=new_property.id
        )
        db.add(image)

    db.commit()
    db.refresh(new_property)

    # Build response with owner_name
    response = PropertyResponse.model_validate(new_property)
    response.owner_name = current_user.full_name
    return response


# ============================================================
# ENDPOINT 5: Update Property (PROTECTED — owner only)
# PUT /api/properties/{property_id}
# ============================================================
@router.put(
    "/{property_id}",
    response_model=PropertyResponse,
    summary="Update your property listing"
)
def update_property(
    property_id: int,
    updates: PropertyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates a property. Only the owner can update their listing.
    
    Send only the fields you want to change.
    """
    prop = db.query(Property).filter(Property.id == property_id).first()

    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")

    # AUTHORIZATION CHECK: Is the logged-in user the owner?
    if prop.owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own properties."
        )

    # Apply updates — only update fields that were actually sent
    # model_dump(exclude_unset=True) gives only fields the client sent
    update_data = updates.model_dump(exclude_unset=True)
    moderation_only_fields = {"is_verified", "is_featured"}
    if not current_user.is_admin and moderation_only_fields.intersection(update_data):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can update verification or featured status."
        )

    # Owners may still delist their own property (sold/rented/inactive), but
    # only admin can approve (active), reject, or re-queue (pending) a
    # listing — otherwise a seller could bypass moderation entirely by just
    # PUTing status="active" straight after creating it.
    admin_only_statuses = {PropertyStatus.ACTIVE, PropertyStatus.REJECTED, PropertyStatus.PENDING}
    if not current_user.is_admin and update_data.get("status") in admin_only_statuses:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can approve, reject, or re-queue a listing.",
        )

    for field, value in update_data.items():
        setattr(prop, field, value)  # prop.title = "New Title" etc.

    db.commit()
    db.refresh(prop)

    response = PropertyResponse.model_validate(prop)
    response.owner_name = prop.owner.full_name
    return response


# ============================================================
# ENDPOINT 6: Delete Property (PROTECTED — owner only)
# DELETE /api/properties/{property_id}
# ============================================================
@router.delete(
    "/{property_id}",
    status_code=status.HTTP_204_NO_CONTENT,  # 204 = Success, No Content
    summary="Delete your property listing"
)
def delete_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Permanently deletes a property listing.
    All images linked to it are also deleted (cascade delete).
    Only the owner or an admin can delete.
    """
    prop = db.query(Property).filter(Property.id == property_id).first()

    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")

    if prop.owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own properties."
        )

    db.delete(prop)   # SQLAlchemy cascade will delete images too
    db.commit()

    # 204 No Content — return nothing
    return None


import uuid
import os
from fastapi import File, Request, UploadFile

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB per photo

# ============================================================
# ENDPOINT 7: Upload Image (PROTECTED — login required)
# POST /api/properties/upload-image
# ============================================================
@router.post(
    "/upload-image",
    summary="Upload property image photo",
    status_code=status.HTTP_200_OK
)
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_seller_or_admin_user)
):
    """
    Uploads an image and returns its URL. Goes to a Supabase Storage bucket
    if STORAGE_BACKEND=supabase is configured, otherwise falls back to local
    disk (dev only — not durable on a real deploy).
    Capped at MAX_UPLOAD_BYTES — enforced by counting bytes while streaming,
    not by trusting the client-supplied size/header.
    """
    # Verify file is an image
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image."
        )

    extension = os.path.splitext(file.filename)[1] or ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{extension}"

    # Read the whole file into memory, enforcing the size cap while doing so —
    # small enough (5MB max) that this is fine, and both storage backends
    # below need the full bytes anyway (Supabase needs them for the upload
    # call; local disk needs them for streaming to a file).
    chunks = []
    total_bytes = 0
    while chunk := await file.read(1024 * 1024):
        total_bytes += len(chunk)
        if total_bytes > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Image is larger than {MAX_UPLOAD_BYTES // (1024 * 1024)}MB.",
            )
        chunks.append(chunk)
    content = b"".join(chunks)

    if is_supabase_enabled():
        try:
            await storage.upload_bytes(settings.SUPABASE_BUCKET_IMAGES, unique_filename, content, file.content_type)
        except storage.StorageError as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
        return {"url": storage.public_url(settings.SUPABASE_BUCKET_IMAGES, unique_filename)}

    # Local disk fallback
    upload_dir = os.path.join("static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_filename)
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {str(e)}"
        )

    # Build the URL from the actual request instead of hardcoding localhost,
    # so it resolves correctly in every environment (dev, Render, etc.)
    base_url = str(request.base_url).rstrip("/")
    return {
        "url": f"{base_url}/static/uploads/{unique_filename}"
    }

