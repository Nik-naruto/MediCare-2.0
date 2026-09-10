"""User Pydantic Schemas."""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import Gender, UserRole


class UserBase(BaseModel):
    """Shared user attributes."""

    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    role: UserRole = UserRole.PATIENT
    is_active: bool = True


class UserCreate(UserBase):
    """Schema for creating a new user account with optional patient demographics or doctor professional attributes."""

    password: str = Field(..., min_length=6, max_length=128)

    # Patient specific fields
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = Field(None, max_length=10)
    address: Optional[str] = None
    emergency_contact: Optional[str] = Field(None, max_length=150)

    # Doctor specific fields
    medical_registration_number: Optional[str] = Field(None, max_length=100)
    specialty: Optional[str] = Field(None, max_length=100)
    specialization: Optional[str] = Field(None, max_length=100)
    qualification: Optional[str] = Field(None, max_length=200)
    experience_years: Optional[int] = Field(None, ge=0)
    department: Optional[str] = Field(None, max_length=100)
    department_id: Optional[int] = None
    consultation_fee: Optional[float] = Field(None, ge=0.0)
    room_no: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = None



class UserUpdate(BaseModel):
    """Schema for updating user details."""

    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


class UserRoleUpdate(BaseModel):
    """Schema for updating a user's role."""

    role: UserRole


class UserStatusUpdate(BaseModel):
    """Schema for activating or deactivating a user account."""

    is_active: bool


class PasswordChangeRequest(BaseModel):
    """Schema for authenticated user password change request."""

    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)


class DevPasswordResetRequest(BaseModel):
    """Development-only schema for resetting user password by email."""

    email: EmailStr
    new_password: str = Field(..., min_length=6, max_length=128)


class UserResponse(UserBase):
    """Schema for returning user information."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
