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
from sqlalchemy.orm import Session

from database import get_db
from models.property import ListingType, Property, PropertyImage, PropertyStatus, PropertyType
from models.user import User
from routers.auth import get_admin_user, get_current_user
from routers.settings import get_or_create_broker_settings
from schemas.property import (
    PropertyAdminItem,
    PropertyAdminListResponse,
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
            Property.locality.ilike(search_term)
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
    query = db.query(Property)

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
            **PropertyAdminItem.model_validate(prop).model_dump(),
            owner_name=prop.owner.full_name if prop.owner else None,
        )
        for prop in properties
    ]
    return PropertyAdminListResponse(items=items, total=len(items))


# ============================================================
# ENDPOINT 4: Get Single Property Contact
# GET /api/properties/{property_id}/contact
# ============================================================
@router.get(
    "/{property_id}/contact",
    response_model=PropertyContactResponse,
    summary="Get safe broker contact details for a property"
)
def get_property_contact(property_id: int, db: Session = Depends(get_db)):
    """
    Returns public contact details for the property.

    The owner's full phone is intentionally not returned. Visitors contact
    the broker desk, while the owner phone is shown only in masked form.
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

    return PropertyContactResponse(
        property_id=prop.id,
        owner_name=prop.owner.full_name if prop.owner else None,
        owner_phone_masked=mask_phone(prop.owner.phone if prop.owner else None),
        broker_name=broker_settings.broker_name,
        broker_phone=broker_settings.broker_phone,
        whatsapp_link=whatsapp_link,
    )


@router.get(
    "/{property_id}",
    response_model=PropertyResponse,
    summary="Get full details of a single property"
)
def get_property(property_id: int, db: Session = Depends(get_db)):
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

    # Manually add owner_name since it's not a DB column
    # (it comes from the related User object)
    response = PropertyResponse.model_validate(prop)
    response.owner_name = prop.owner.full_name if prop.owner else None

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
    current_user: User = Depends(get_current_user),  # ← requires login!
):
    """
    Creates a new property listing.
    
    PROTECTED: You must be logged in (send Bearer token).
    The property is automatically linked to the logged-in user.
    
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
        has_parking=property_data.has_parking,
        parking_image_url=property_data.parking_image_url,
        google_maps_link=property_data.google_maps_link,
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
import shutil
import os
from fastapi import File, UploadFile

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
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Uploads an image file to the server and returns its static URL.
    """
    # Verify file is an image
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image."
        )

    # Create safe unique filename
    extension = os.path.splitext(file.filename)[1]
    if not extension:
        extension = ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{extension}"

    # Destination file path
    upload_dir = os.path.join("static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_filename)

    try:
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {str(e)}"
        )

    # Return local static URL
    return {
        "url": f"http://localhost:8000/static/uploads/{unique_filename}"
    }

