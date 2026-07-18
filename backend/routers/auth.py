from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from core.rate_limit import client_identifier, rate_limiter
from core.security import create_access_token, decode_access_token, hash_password, verify_password
from database import get_db
from models.user import User
from schemas.user import Token, UserAdminListResponse, UserAdminUpdate, UserCreate, UserLogin, UserResponse


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login-form")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is malformed.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )

    return user


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required.",
        )
    return current_user


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account"
)
def register(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    rate_limiter.check(
        client_identifier(request, "auth-register"),
        limit=5,
        window_seconds=300,
    )

    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{user_data.email}' is already registered."
        )

    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        phone=user_data.phone,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post(
    "/login",
    response_model=Token,
    summary="Login and receive a JWT access token"
)
def login(
    request: Request,
    credentials: UserLogin,
    db: Session = Depends(get_db),
):
    rate_limiter.check(
        client_identifier(request, "auth-login"),
        limit=10,
        window_seconds=300,
    )

    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact support."
        )

    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the currently logged-in user's profile"
)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.get(
    "/users",
    response_model=UserAdminListResponse,
    summary="Get all users (admin only)"
)
def list_users(
    search: str | None = Query(None, min_length=2),
    active: bool | None = Query(None),
    admin_only: bool | None = Query(None, alias="is_admin"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    query = db.query(User)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            User.full_name.ilike(search_term) |
            User.email.ilike(search_term) |
            User.phone.ilike(search_term)
        )

    if active is not None:
        query = query.filter(User.is_active == active)

    if admin_only is not None:
        query = query.filter(User.is_admin == admin_only)

    users = query.order_by(User.created_at.desc()).all()
    return UserAdminListResponse(items=users, total=len(users))


@router.put(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Update a user role or account status (admin only)"
)
def update_user_admin_state(
    user_id: int,
    user_data: UserAdminUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.id == current_admin.id and user_data.is_admin is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin access."
        )

    if user.id == current_admin.id and user_data.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account."
        )

    if user_data.is_active is not None:
        user.is_active = user_data.is_active

    if user_data.is_admin is not None:
        user.is_admin = user_data.is_admin

    db.commit()
    db.refresh(user)
    return user


@router.post("/login-form", response_model=Token, include_in_schema=False)
def login_form(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    rate_limiter.check(
        client_identifier(request, "auth-login-form"),
        limit=10,
        window_seconds=300,
    )

    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer")
