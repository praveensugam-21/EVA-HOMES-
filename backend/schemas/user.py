import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator

class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v:
            # Check for standard international phone format
            pattern = re.compile(r"^\+?1?[ -]?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}$")
            # Strip spaces/hyphens for validation
            clean_v = re.sub(r"[\s\-\(\)]", "", v)
            if not clean_v.isdigit() or len(clean_v) < 10 or len(clean_v) > 15:
                raise ValueError("Invalid phone number format")
        return v

class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit")
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleLogin(BaseModel):
    credential: str  # the ID token returned by Google Identity Services

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None

# ---- Self-service profile update (every account has these fields) ----
class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v:
            clean_v = re.sub(r"[\s\-\(\)]", "", v)
            if not clean_v.isdigit() or len(clean_v) < 10 or len(clean_v) > 15:
                raise ValueError("Invalid phone number format")
        return v

    @field_validator("bio")
    @classmethod
    def validate_bio(cls, v):
        if v and len(v) > 500:
            raise ValueError("Bio must be 500 characters or fewer")
        return v


# ---- Seller profile (the optional add-on capability) ----
class SellerProfileCreate(BaseModel):
    business_name: Optional[str] = None


class SellerProfileUpdate(BaseModel):
    business_name: Optional[str] = None


class SellerProfileResponse(BaseModel):
    business_name: Optional[str] = None
    seller_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    address: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    phone_verified: bool = False
    email_verified: bool = False
    created_at: datetime
    has_seller_profile: bool = False
    seller_profile: Optional[SellerProfileResponse] = None

    model_config = {"from_attributes": True}


class UserAdminListResponse(BaseModel):
    items: list[UserResponse]
    total: int


class UserAdminUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None


# ---- Seller documents ----
class SellerDocumentResponse(BaseModel):
    id: int
    doc_type: str
    file_url: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


# ---- Admin seller verification ----
class SellerVerificationUpdate(BaseModel):
    seller_status: str

    @field_validator("seller_status")
    @classmethod
    def validate_status(cls, v):
        allowed = {"unverified", "pending", "verified", "rejected"}
        if v not in allowed:
            raise ValueError(f"seller_status must be one of {sorted(allowed)}")
        return v


# ---- Security: change password ----
class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_must_be_strong(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit")
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter")
        return v


# ---- Phone / email OTP verification ----
# NOTE: no SMS/email provider is wired up yet — see models/otp_code.py.
# request-otp responses include the code directly (dev-mode only) so the
# flow is testable end-to-end before a real provider is plugged in.
class OTPRequestResponse(BaseModel):
    channel: str
    expires_at: datetime
    dev_code: Optional[str] = None


class OTPVerifyRequest(BaseModel):
    code: str
