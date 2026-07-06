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

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None

