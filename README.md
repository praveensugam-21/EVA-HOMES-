# EVA Homes

EVA Homes is a full-stack real estate platform for browsing, searching, listing, and enquiring about residential and commercial properties.

The project is split into a React frontend and a FastAPI backend.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios
- Backend: FastAPI, SQLAlchemy, Pydantic, SQLite
- Authentication: JWT based login and registration
- File uploads: property images served through the backend static folder

## Project Structure

```text
eva-homes/
  README.md
  ERROR.md

  backend/
    main.py
    database.py
    seed.py
    requirements.txt
    .env
    core/
    models/
    routers/
    schemas/
    static/
      uploads/

  frontend/
    index.html
    package.json
    package-lock.json
    vite.config.js
    eslint.config.js
    public/
    src/
      api/
      assets/
      components/
      context/
      pages/
```

## Features

- Browse property listings without logging in
- Search and filter listings by city, type, price, bedrooms, and keywords
- View property details and image galleries
- Register and log in with JWT authentication
- Create property listings after login
- Upload property images
- Submit enquiries for properties
- Review and manage enquiries from an admin workspace
- Review and moderate all listings from an admin workspace
- Manage users, admin access, and account activation from an admin workspace
- Admin-only broker settings page to edit call and WhatsApp numbers from the website
- Use FastAPI automatic API documentation for testing endpoints

## Backend Setup

Open a terminal from the project root:

```powershell
cd F:\eva-homes\backend
```

Create and activate a virtual environment:

```powershell
python -m venv venv
.\venv\Scripts\activate
```

Install Python dependencies:

```powershell
pip install -r requirements.txt
```

Seed the database with sample data:

```powershell
python seed.py
```

Run the FastAPI backend:

```powershell
uvicorn main:app --reload
```

Backend URLs:

```text
API:  http://127.0.0.1:8000
Docs: http://127.0.0.1:8000/docs
```

## Frontend Setup

Open a second terminal from the project root:

```powershell
cd F:\eva-homes\frontend
```

Install Node dependencies:

```powershell
npm install
```

Run the Vite development server:

```powershell
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## Normal Development Workflow

Use two terminals while developing:

```text
Terminal 1: backend server
Terminal 2: frontend server
```

Backend:

```powershell
cd F:\eva-homes\backend
.\venv\Scripts\activate
uvicorn main:app --reload
```

Frontend:

```powershell
cd F:\eva-homes\frontend
npm run dev
```

React runs in the browser on port `5173`. FastAPI runs on port `8000`.

## Test Login

After running `python seed.py`, use this sample account:

```text
Email: rahul@example.com
Password: password123
```

Use it to log in and create a property listing.

Admin account for broker settings:

```text
Email: admin@evahomes.com
Password: admin123
```

## Important Commands

Backend:

```powershell
cd F:\eva-homes\backend
.\venv\Scripts\activate
python seed.py
uvicorn main:app --reload
```

Frontend:

```powershell
cd F:\eva-homes\frontend
npm install
npm run dev
npm run build
npm run lint
```

## API Testing

FastAPI provides interactive API docs:

```text
http://127.0.0.1:8000/docs
```

You can test routes such as:

```text
GET  /health
POST /api/auth/register
POST /api/auth/login
GET  /api/properties
GET  /api/properties/admin/all
GET  /api/auth/users
PUT  /api/auth/users/{id}
POST /api/properties
POST /api/properties/upload-image
GET  /api/cities
POST /api/enquiries
GET  /api/enquiries
PUT  /api/enquiries/{id}
```

## Image Uploads

Uploaded property images are stored in:

```text
backend/static/uploads/
```

The backend serves them from:

```text
http://localhost:8000/static/uploads/<filename>
```

## Notes For Developers

- Run backend commands from the `backend` folder so SQLite and static paths resolve correctly.
- Run frontend commands from the `frontend` folder because `package.json` is located there.
- Do not commit virtual environments, `node_modules`, local `.env` files, generated database files, or build output.
- Keep this root README as the main project documentation.

## Additional Guides

- `PROJECT_GUIDE.md` explains the full project structure, setup, and development workflow.
- `BROKER_CONTACT_FLOW.md` explains the broker-assisted contact model, masked owner phone flow, and enquiry lead tracking.

## Build

Create a production frontend build:

```powershell
cd F:\eva-homes\frontend
npm run build
```

Preview the production build locally:

```powershell
npm run preview
```

## License

This project is currently for learning and development.
