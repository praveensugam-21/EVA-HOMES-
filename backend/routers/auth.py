import os
import secrets
import shutil
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from core.rate_limit import client_identifier, rate_limiter
from core.security import create_access_token, decode_access_token, hash_password, verify_password
from database import get_db
from models.user import User
from models.seller_profile import SellerProfile
from models.seller_document import SellerDocument
from models.notification_preference import NotificationPreference
from models.otp_code import OTPCode
from schemas.notification import NotificationPreferenceResponse, NotificationPreferenceUpdate
from schemas.user import (
    OTPRequestResponse,
    OTPVerifyRequest,
    PasswordChange,
    SellerDocumentResponse,
    SellerProfileCreate,
    SellerProfileResponse,
    SellerProfileUpdate,
    SellerVerificationUpdate,
    Token,
    UserAdminListResponse,
    UserAdminUpdate,
    UserCreate,
    UserLogin,
    UserProfileUpdate,
    UserResponse,
)


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login-form")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login-form", auto_error=False)


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


def get_current_user_optional(
    token: Optional[str] = Depends(optional_oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Like get_current_user, but returns None instead of raising when there's
    no token or it's invalid. Used on public endpoints (e.g. submitting an
    enquiry) that want to attribute the action to a logged-in user when
    possible, without requiring login.
    """
    if not token:
        return None
    payload = decode_access_token(token)
    if payload is None:
        return None
    email = payload.get("sub")
    if email is None:
        return None
    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        return None
    return user


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required.",
        )
    return current_user


def get_seller_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Only accounts that have activated a seller profile (or admins) may
    create/manage listings. Buyer-only accounts cannot — they can activate
    a seller profile at any time from their own account via
    POST /api/auth/me/seller-profile, no separate registration needed.
    """
    if not current_user.has_seller_profile and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You need a seller profile to list properties. Activate one from your profile page first.",
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

    # Every account starts as a buyer. Selling is opt-in later via
    # POST /api/auth/me/seller-profile — no separate account required.
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


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update the currently logged-in user's own (buyer) profile"
)
def update_my_profile(
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.put(
    "/me/password",
    summary="Change the currently logged-in user's password"
)
def change_my_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    current_user.hashed_password = hash_password(password_data.new_password)
    db.commit()
    return {"detail": "Password updated."}


# ============================================================
# Notification preferences — one-to-one, created lazily
# ============================================================

def _get_or_create_notification_preference(db: Session, user: User) -> NotificationPreference:
    preference = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == user.id)
        .first()
    )
    if preference is None:
        preference = NotificationPreference(user_id=user.id)
        db.add(preference)
        db.commit()
        db.refresh(preference)
    return preference


@router.get(
    "/me/notification-preferences",
    response_model=NotificationPreferenceResponse,
    summary="Get the current user's notification preferences"
)
def get_my_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_or_create_notification_preference(db, current_user)


@router.put(
    "/me/notification-preferences",
    response_model=NotificationPreferenceResponse,
    summary="Update the current user's notification preferences"
)
def update_my_notification_preferences(
    update_data: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preference = _get_or_create_notification_preference(db, current_user)
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(preference, field, value)
    db.commit()
    db.refresh(preference)
    return preference


# ============================================================
# Phone / email OTP verification
# ============================================================
# No SMS/email provider is wired up yet (see models/otp_code.py) — the
# generated code is returned directly in the request-otp response under
# `dev_code` so the flow works end-to-end today. To go live, replace the
# two `# TODO: send via provider` spots below with a real send call; the
# generation/hashing/expiry/verify logic does not need to change.

def _issue_otp(db: Session, user: User, channel: str) -> tuple[str, "OTPCode"]:
    code = f"{secrets.randbelow(1_000_000):06d}"
    otp = OTPCode(
        user_id=user.id,
        channel=channel,
        code_hash=hash_password(code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(otp)
    db.commit()
    db.refresh(otp)
    return code, otp


@router.post(
    "/me/phone/request-otp",
    response_model=OTPRequestResponse,
    summary="Request an OTP to verify the current user's phone number"
)
def request_phone_otp(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Add a phone number to your profile first.")
    code, otp = _issue_otp(db, current_user, "phone")
    # TODO: send via provider (e.g. Twilio) instead of returning dev_code
    return OTPRequestResponse(channel="phone", expires_at=otp.expires_at, dev_code=code)


@router.post(
    "/me/email/request-otp",
    response_model=OTPRequestResponse,
    summary="Request an OTP to verify the current user's email address"
)
def request_email_otp(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    code, otp = _issue_otp(db, current_user, "email")
    # TODO: send via provider (e.g. SES/SendGrid) instead of returning dev_code
    return OTPRequestResponse(channel="email", expires_at=otp.expires_at, dev_code=code)


def _verify_otp(db: Session, user: User, channel: str, submitted_code: str) -> None:
    otp = (
        db.query(OTPCode)
        .filter(
            OTPCode.user_id == user.id,
            OTPCode.channel == channel,
            OTPCode.is_used.is_(False),
        )
        .order_by(OTPCode.created_at.desc())
        .first()
    )
    if not otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active code. Request a new one.")

    # SQLite drops tzinfo on read, even though we stored an aware UTC datetime.
    expires_at = otp.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active code. Request a new one.")
    if not verify_password(submitted_code, otp.code_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect code.")
    otp.is_used = True


@router.post(
    "/me/phone/verify-otp",
    response_model=UserResponse,
    summary="Verify the current user's phone number with an OTP"
)
def verify_phone_otp(
    verify_data: OTPVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_otp(db, current_user, "phone", verify_data.code)
    current_user.phone_verified = True
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post(
    "/me/email/verify-otp",
    response_model=UserResponse,
    summary="Verify the current user's email address with an OTP"
)
def verify_email_otp(
    verify_data: OTPVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_otp(db, current_user, "email", verify_data.code)
    current_user.email_verified = True
    db.commit()
    db.refresh(current_user)
    return current_user


# ============================================================
# Seller profile — the opt-in add-on capability for an account
# ============================================================

@router.post(
    "/me/seller-profile",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Activate a seller profile on the current account"
)
def create_my_seller_profile(
    profile_data: SellerProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.has_seller_profile:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This account already has a seller profile.",
        )

    seller_profile = SellerProfile(
        user_id=current_user.id,
        business_name=profile_data.business_name,
    )
    db.add(seller_profile)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get(
    "/me/seller-profile",
    response_model=SellerProfileResponse,
    summary="Get the current account's seller profile"
)
def get_my_seller_profile(current_user: User = Depends(get_current_user)):
    if not current_user.has_seller_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This account has no seller profile yet.",
        )
    return current_user.seller_profile


@router.put(
    "/me/seller-profile",
    response_model=SellerProfileResponse,
    summary="Update the current account's seller profile"
)
def update_my_seller_profile(
    profile_data: SellerProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.has_seller_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This account has no seller profile yet.",
        )

    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user.seller_profile, field, value)

    db.commit()
    db.refresh(current_user.seller_profile)
    return current_user.seller_profile


@router.get(
    "/me/seller-documents",
    response_model=list[SellerDocumentResponse],
    summary="List the current account's uploaded seller verification documents"
)
def list_my_seller_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.has_seller_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This account has no seller profile yet.",
        )

    return (
        db.query(SellerDocument)
        .filter(SellerDocument.seller_profile_id == current_user.seller_profile.id)
        .order_by(SellerDocument.uploaded_at.desc())
        .all()
    )


@router.post(
    "/me/seller-documents",
    response_model=SellerDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a seller verification document"
)
async def upload_seller_document(
    doc_type: str = Query(..., description="e.g. id_proof, address_proof, business_license"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.has_seller_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Activate a seller profile before uploading verification documents.",
        )

    if not file.content_type or not (
        file.content_type.startswith("image/") or file.content_type == "application/pdf"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document must be an image or a PDF file.",
        )

    extension = os.path.splitext(file.filename)[1] or ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{extension}"
    upload_dir = os.path.join("static", "seller_docs")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {str(e)}",
        )

    seller_profile = current_user.seller_profile
    document = SellerDocument(
        seller_profile_id=seller_profile.id,
        doc_type=doc_type,
        file_url=f"http://localhost:8000/static/seller_docs/{unique_filename}",
    )
    db.add(document)

    # A fresh or resubmitted document moves the seller back into the review queue.
    if seller_profile.seller_status in ("unverified", "rejected"):
        seller_profile.seller_status = "pending"

    db.commit()
    db.refresh(document)
    return document


@router.get(
    "/users",
    response_model=UserAdminListResponse,
    summary="Get all users (admin only)"
)
def list_users(
    search: Optional[str] = Query(None, min_length=2),
    active: Optional[bool] = Query(None),
    admin_only: Optional[bool] = Query(None, alias="is_admin"),
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
    summary="Update a user's admin or active status (admin only)"
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


@router.get(
    "/users/{user_id}/seller-documents",
    response_model=list[SellerDocumentResponse],
    summary="View a seller's uploaded verification documents (admin only)"
)
def list_seller_documents_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if not user.has_seller_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This user has no seller profile.",
        )

    return (
        db.query(SellerDocument)
        .filter(SellerDocument.seller_profile_id == user.seller_profile.id)
        .order_by(SellerDocument.uploaded_at.desc())
        .all()
    )


@router.put(
    "/users/{user_id}/seller-verification",
    response_model=UserResponse,
    summary="Approve or reject a user's seller profile verification (admin only)"
)
def update_seller_verification(
    user_id: int,
    verification_data: SellerVerificationUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if not user.has_seller_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user has no seller profile to verify.",
        )

    user.seller_profile.seller_status = verification_data.seller_status
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
