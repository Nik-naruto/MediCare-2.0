"""Patient Pydantic Schemas."""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Gender
from app.schemas.user import UserResponse


class PatientBase(BaseModel):
    """Shared patient attributes."""

    gender: Gender = Gender.MALE
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = Field(None, max_length=10)
    address: Optional[str] = None
    emergency_contact: Optional[str] = Field(None, max_length=150)
    allergies: Optional[str] = None


class PatientCreate(PatientBase):
    """Schema for onboard / self-register patient profile."""

    user_id: int


class PatientUpdate(BaseModel):
    """Schema for updating patient details."""

    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    allergies: Optional[str] = None


class PatientResponse(PatientBase):
    """Schema for returning patient response."""

    id: int
    user_id: int
    user: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
