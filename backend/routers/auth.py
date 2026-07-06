# ============================================================
# routers/auth.py — Authentication Endpoints
# ============================================================
# This file handles:
#   POST /api/auth/register  → Create new user account
#   POST /api/auth/login     → Login, receive JWT token
#   GET  /api/auth/me        → Get current logged-in user profile
#
# HOW AUTHENTICATION WORKS (step by step):
# 1. User sends email + password to /login
# 2. We look up user by email in DB
# 3. We verify password matches the stored hash
# 4. We create a JWT token with their email inside
# 5. We return the token to the client
# 6. Client stores the token (in localStorage or memory)
# 7. For protected routes, client sends token in the header:
#    Authorization: Bearer eyJhbGci...
# 8. Our get_current_user() function reads that header and
#    looks up the user from the database
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.security import create_access_token, hash_password, verify_password
from database import get_db
from models.user import User
from schemas.user import Token, UserCreate, UserLogin, UserResponse


# ---- DEPENDENCY: GET CURRENT USER ----
# This function is used by protected endpoints.
# It reads the Authorization header, decodes the JWT,
# and returns the User object from the database.
#
# We define it here so auth.py and other routers can import it.
from fastapi.security import OAuth2PasswordBearer
from core.security import decode_access_token

# tokenUrl tells Swagger UI where to send the login form
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login-form")


def get_current_user(
    token: str = Depends(oauth2_scheme),  # FastAPI reads the Bearer token
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency: Extracts and validates JWT token, returns the User.
    
    Usage in protected endpoints:
        current_user: User = Depends(get_current_user)
    
    If token is missing/invalid/expired → raises 401 Unauthorized
    """
    # Decode the JWT token to get the payload
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please login again.",
            # WWW-Authenticate header is required by OAuth2 spec
            headers={"WWW-Authenticate": "Bearer"},
        )

    # The "sub" (subject) in our token is the user's email
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is malformed.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Look up the user in the database
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )

    return user


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency: Like get_current_user, but also checks is_admin=True.
    Use on admin-only endpoints.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required.",
        )
    return current_user


# ---- ROUTER SETUP ----
# APIRouter groups related endpoints together.
# prefix="/api/auth" means all routes here start with /api/auth
# tags=["Authentication"] groups them in the Swagger UI docs
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ============================================================
# ENDPOINT 1: Register a new user
# POST /api/auth/register
# ============================================================
@router.post(
    "/register",
    response_model=UserResponse,     # What we return
    status_code=status.HTTP_201_CREATED,  # 201 = Created (not 200)
    summary="Register a new user account"
)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Creates a new user account.
    
    Steps:
    1. Check if email is already taken
    2. Hash the password
    3. Create User in database
    4. Return the created user (without password!)
    
    Request body:
    {
        "full_name": "Rahul Sharma",
        "email": "rahul@example.com",
        "password": "mypassword123",
        "phone": "9876543210"
    }
    """

    # Step 1: Check if email already exists in the database
    # db.query(User) → start a query on the users table
    # .filter(User.email == user_data.email) → add WHERE clause
    # .first() → get the first result (or None if no match)
    existing_user = db.query(User).filter(User.email == user_data.email).first()

    if existing_user:
        # 409 Conflict — the resource already exists
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{user_data.email}' is already registered."
        )

    # Step 2: Hash the password before storing
    hashed_pw = hash_password(user_data.password)

    # Step 3: Create a new User object and save to DB
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=hashed_pw,   # ← hashed, not plain text!
        phone=user_data.phone
    )

    db.add(new_user)      # Stage the new user for insertion
    db.commit()           # Actually write to the database file
    db.refresh(new_user)  # Reload from DB (to get auto-generated id, created_at)

    return new_user  # Pydantic converts this to UserResponse (no password field)


# ============================================================
# ENDPOINT 2: Login
# POST /api/auth/login
# ============================================================
@router.post(
    "/login",
    response_model=Token,
    summary="Login and receive a JWT access token"
)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Validates email + password and returns a JWT token.
    
    The client should store this token and send it with
    every subsequent request in the Authorization header:
        Authorization: Bearer <token>
    
    Request body:
    {
        "email": "rahul@example.com",
        "password": "mypassword123"
    }
    
    Response:
    {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5c...",
        "token_type": "bearer"
    }
    """

    # Step 1: Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()

    # Step 2: Verify password
    # We use a combined check to prevent "user enumeration attacks"
    # (where an attacker probes which emails exist by reading error messages)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Step 3: Check account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact support."
        )

    # Step 4: Create JWT token
    # "sub" (subject) = who this token belongs to — we use email
    access_token = create_access_token(data={"sub": user.email})

    return Token(access_token=access_token, token_type="bearer")


# ============================================================
# ENDPOINT 3: Get current user profile (PROTECTED)
# GET /api/auth/me
# ============================================================
@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the currently logged-in user's profile"
)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the profile of the currently logged-in user.
    
    This endpoint is PROTECTED — you must send a valid JWT token.
    If no token or invalid token → 401 Unauthorized.
    
    The `current_user` parameter is automatically provided by
    the get_current_user dependency.
    """
    return current_user


# ============================================================
# ENDPOINT 4: Swagger UI login (OAuth2 form format)
# POST /api/auth/login-form
# ============================================================
# This endpoint exists purely for Swagger UI's "Authorize" button.
# The Swagger UI sends login as form data (not JSON).
from fastapi.security import OAuth2PasswordRequestForm

@router.post("/login-form", response_model=Token, include_in_schema=False)
def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Swagger UI compatible login endpoint (uses form data)."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer")
