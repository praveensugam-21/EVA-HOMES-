# EVA Homes Project Guide

This project is a full-stack real estate marketplace with a React frontend and a FastAPI backend.

## What The Project Does

- Visitors can browse active property listings.
- Visitors can search and filter properties.
- Visitors can open a property detail page with photos, price, specs, map, and contact options.
- Registered users can create property listings.
- Every listing is linked to the logged-in user who posted it.
- Buyers can send enquiries without logging in.
- The broker contact flow protects the owner's full phone number.
- Admin users can update broker call and WhatsApp numbers from the website.
- Admin users can review every enquiry from a dedicated admin workspace.
- Admin users can moderate listing status, verification, and featured visibility from a dedicated admin workspace.
- Admin users can manage user activation and admin access from a dedicated admin workspace.

## Main Folders

```text
backend/
  main.py              FastAPI app setup
  database.py          SQLAlchemy database connection
  seed.py              Sample users, properties, and enquiries
  core/
    config.py          App settings, broker phone, JWT settings
    security.py        Password hashing and JWT helpers
  models/              Database tables
  routers/             API endpoints
  schemas/             Pydantic request/response schemas

frontend/
  src/
    api/api.js         Axios API wrapper
    pages/             Route pages
    components/        Reusable UI sections
    context/           Auth state
```

## How To Run Backend

Open a terminal:

```powershell
cd F:\eva-homes\backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python seed.py
uvicorn main:app --reload
```

Backend runs at:

```text
http://127.0.0.1:8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

## How To Run Frontend

Open a second terminal:

```powershell
cd F:\eva-homes\frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## Test Accounts

After `python seed.py`, use:

```text
Admin: admin@evahomes.com / admin123
User:  rahul@example.com / password123
User:  priya@example.com / password123
```

## Broker Settings In Website

Login as the admin user and open:

```text
/admin/settings/broker-contact
```

This page lets you edit:

- Broker name
- Broker call number
- Broker WhatsApp number

After saving, property detail pages start using the updated values for the call button and WhatsApp button.

## Admin Enquiries In Website

Login as the admin user and open:

```text
/admin/enquiries
```

This page lets the admin:

- see all buyer enquiries
- filter by status or unread state
- search by buyer or property
- mark enquiries as read, contacted, or closed
- save internal broker notes

## Admin Listings In Website

Login as the admin user and open:

```text
/admin/listings
```

This page lets the admin:

- review every property in the system
- filter by status, verified, featured, and search
- mark a listing active, inactive, sold, or rented
- toggle verified status
- toggle featured status

## Admin Users In Website

Login as the admin user and open:

```text
/admin/users
```

This page lets the admin:

- review all registered users
- search by name, email, or phone
- filter active and admin accounts
- promote a user to admin
- remove admin access
- deactivate or reactivate accounts

## Important API Routes

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
GET  /api/auth/users
PUT  /api/auth/users/{id}

GET  /api/properties
GET  /api/properties/admin/all
GET  /api/properties/{id}
GET  /api/properties/{id}/contact
POST /api/properties

POST /api/enquiries
GET  /api/enquiries
PUT  /api/enquiries/{id}
```

## Common Development Flow

1. Start backend first.
2. Start frontend second.
3. Open `http://localhost:5173`.
4. Browse listings.
5. Open a property.
6. Use the contact panel to call broker, WhatsApp broker, send enquiry, or request owner callback.

## Database Notes

The default database is SQLite:

```text
backend/eva_homes.db
```

If you want a clean reset during development:

1. Stop the backend server.
2. Delete `backend/eva_homes.db`.
3. Run `python seed.py` again.
4. Restart `uvicorn main:app --reload`.

The app also checks for missing enquiry lead-tracking columns at startup, so older local databases can continue working.
