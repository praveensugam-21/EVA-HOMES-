# ============================================================
# seed.py — Populate Database with Sample Data
# ============================================================
# Run this ONCE after setting up the database to add test data.
# This makes it easy to see real data in the frontend right away.
#
# TO RUN:
#   cd backend
#   python seed.py
# ============================================================

from database import Base, SessionLocal, engine

# Import all models (so tables are created)
import models  # noqa

from core.security import hash_password
from models.user import User
from models.property import Property, PropertyImage, ListingType, PropertyType, PropertyStatus
from models.enquiry import Enquiry


def seed():
    """Creates all tables and inserts sample data."""
    
    print("[Seed] Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # ---- Check if already seeded ----
        # If there's already a user in the database, skip seeding
        if db.query(User).count() > 0:
            print("[Warning] Database already has data. Skipping seed.")
            print("    (Delete eva_homes.db file and re-run to reset)")
            return

        print("[Seed] Seeding users...")

        # ---- Create Admin User ----
        admin = User(
            full_name="EVA Admin",
            email="admin@evahomes.com",
            hashed_password=hash_password("admin123"),
            phone="9999999999",
            is_active=True,
            is_admin=True,  # ← admin account
        )
        db.add(admin)

        # ---- Create Regular Users ----
        user1 = User(
            full_name="Rahul Sharma",
            email="rahul@example.com",
            hashed_password=hash_password("password123"),
            phone="9876543210",
        )
        user2 = User(
            full_name="Priya Mehta",
            email="priya@example.com",
            hashed_password=hash_password("password123"),
            phone="9123456789",
        )
        db.add_all([user1, user2])
        db.flush()  # flush to get IDs

        print("[Success] Users created.")
        print("[Seed] Seeding properties...")

        # ---- Sample Properties ----
        properties_data = [
            {
                "title": "Luxury 3BHK Apartment in Bandra West",
                "description": "A stunning sea-facing apartment with modern interiors, 24/7 security, gym, and swimming pool. Perfect for families.",
                "price": 250.0,
                "price_label": "Cr",
                "city": "Mumbai",
                "locality": "Bandra West",
                "property_type": PropertyType.APARTMENT,
                "listing_type": ListingType.BUY,
                "bedrooms": 3,
                "bathrooms": 3,
                "area_sqft": 1800.0,
                "thumbnail_url": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600",
                "is_featured": True,
                "owner_id": user1.id,
            },
            {
                "title": "Premium Villa in Whitefield",
                "description": "Spacious independent villa with private garden, modular kitchen, and open car parking. Gated community with 24/7 security.",
                "price": 180.0,
                "price_label": "Cr",
                "city": "Bangalore",
                "locality": "Whitefield",
                "property_type": PropertyType.VILLA,
                "listing_type": ListingType.BUY,
                "bedrooms": 4,
                "bathrooms": 4,
                "area_sqft": 3200.0,
                "thumbnail_url": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600",
                "is_featured": True,
                "owner_id": user1.id,
            },
            {
                "title": "Modern Studio for Rent — Koramangala",
                "description": "Fully furnished studio apartment. Ideal for working professionals. Close to metro, restaurants, and IT parks.",
                "price": 22000.0,
                "price_label": "/month",
                "city": "Bangalore",
                "locality": "Koramangala",
                "property_type": PropertyType.APARTMENT,
                "listing_type": ListingType.RENT,
                "bedrooms": 1,
                "bathrooms": 1,
                "area_sqft": 550.0,
                "thumbnail_url": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600",
                "is_featured": True,
                "owner_id": user2.id,
            },
            {
                "title": "2BHK Flat in Gurgaon Sector 56",
                "description": "Semi-furnished flat in a gated society with park, gym, and power backup. Easy connectivity to Delhi.",
                "price": 75.0,
                "price_label": "Lakh",
                "city": "Delhi",
                "locality": "Gurgaon Sector 56",
                "property_type": PropertyType.APARTMENT,
                "listing_type": ListingType.BUY,
                "bedrooms": 2,
                "bathrooms": 2,
                "area_sqft": 1050.0,
                "thumbnail_url": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600",
                "is_featured": True,
                "owner_id": user2.id,
            },
            {
                "title": "Office Space for Rent — Hitech City",
                "description": "Premium Grade A office space with open floor plan, high-speed internet, cafeteria and conference rooms.",
                "price": 85000.0,
                "price_label": "/month",
                "city": "Hyderabad",
                "locality": "Hitech City",
                "property_type": PropertyType.COMMERCIAL,
                "listing_type": ListingType.COMMERCIAL,
                "area_sqft": 3500.0,
                "thumbnail_url": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600",
                "is_featured": True,
                "owner_id": user1.id,
            },
            {
                "title": "Residential Plot in Anna Nagar",
                "description": "Clear title residential plot in prime location. All approvals in place. DTCP approved layout.",
                "price": 120.0,
                "price_label": "Cr",
                "city": "Chennai",
                "locality": "Anna Nagar",
                "property_type": PropertyType.PLOT,
                "listing_type": ListingType.BUY,
                "area_sqft": 2400.0,
                "thumbnail_url": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600",
                "is_featured": True,
                "owner_id": user2.id,
            },
            {
                "title": "3BHK Flat in Kothrud",
                "description": "Spacious flat with large balcony and great city views. Society amenities include club house and kids' play area.",
                "price": 95.0,
                "price_label": "Lakh",
                "city": "Pune",
                "locality": "Kothrud",
                "property_type": PropertyType.APARTMENT,
                "listing_type": ListingType.BUY,
                "bedrooms": 3,
                "bathrooms": 2,
                "area_sqft": 1350.0,
                "thumbnail_url": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600",
                "is_featured": False,
                "owner_id": user1.id,
            },
            {
                "title": "2BHK Furnished Flat for Rent — Powai",
                "description": "Fully furnished flat with lake view. Includes all appliances, modular kitchen, and reserved parking.",
                "price": 45000.0,
                "price_label": "/month",
                "city": "Mumbai",
                "locality": "Powai",
                "property_type": PropertyType.APARTMENT,
                "listing_type": ListingType.RENT,
                "bedrooms": 2,
                "bathrooms": 2,
                "area_sqft": 950.0,
                "thumbnail_url": "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=600",
                "is_featured": False,
                "owner_id": user2.id,
            },
        ]

        for prop_data in properties_data:
            prop = Property(**prop_data)
            db.add(prop)

        db.commit()
        print(f"[Success] {len(properties_data)} properties created.")

        # ---- Sample Enquiries ----
        print("[Seed] Seeding enquiries...")
        enquiries = [
            Enquiry(
                name="Anil Kapoor",
                email="anil@example.com",
                phone="9988776655",
                message="I'm interested in visiting the Bandra apartment this weekend. Please arrange a viewing.",
                property_id=1,
            ),
            Enquiry(
                name="Sunita Patel",
                email="sunita@example.com",
                message="What is the maintenance charge for the Whitefield villa? Is it negotiable?",
                property_id=2,
            ),
        ]
        db.add_all(enquiries)
        db.commit()

        print("[Success] Enquiries created.")
        print("\n" + "="*50)
        print("DATABASE SEEDED SUCCESSFULLY!")
        print("="*50)
        print("\nLOGIN CREDENTIALS:")
        print("  Admin  -> admin@evahomes.com  / admin123")
        print("  User 1 -> rahul@example.com   / password123")
        print("  User 2 -> priya@example.com   / password123")
        print("\nStart the server: uvicorn main:app --reload")
        print("View API docs:   http://localhost:8000/docs\n")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
