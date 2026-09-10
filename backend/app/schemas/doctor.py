"""Doctor Pydantic Schemas."""

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserResponse


class DoctorBase(BaseModel):
    """Shared doctor attributes."""

    medical_registration_number: Optional[str] = Field(None, max_length=100)
    qualification: str = Field(..., max_length=200)
    specialty: str = Field(..., max_length=100)
    experience_years: int = Field(default=0, ge=0)
    consultation_fee: float = Field(default=0.0, ge=0.0)
    room_no: str = Field(..., max_length=50)
    bio: Optional[str] = None
    profile_photo_url: Optional[str] = Field(None, max_length=500)
    is_available: bool = True
    department_id: Optional[int] = None


class DoctorCreate(DoctorBase):
    """Schema for creating a doctor profile."""

    user_id: int


class DoctorUpdate(BaseModel):
    """Schema for updating doctor details."""

    medical_registration_number: Optional[str] = Field(None, max_length=100)
    qualification: Optional[str] = None
    specialty: Optional[str] = None
    experience_years: Optional[int] = None
    consultation_fee: Optional[float] = None
    room_no: Optional[str] = None
    bio: Optional[str] = None
    profile_photo_url: Optional[str] = Field(None, max_length=500)
    is_available: Optional[bool] = None
    department_id: Optional[int] = None


class DoctorResponse(DoctorBase):
    """Schema for returning doctor response."""

    id: int
    user_id: int
    user: Optional[UserResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TimeSlotAvailability(BaseModel):
    """Schema for individual time slot availability."""

    start_time: str
    end_time: str
    is_available: bool


class DayAvailability(BaseModel):
    """Schema for daily schedule availability."""

    date: date
    day_of_week: str
    is_working_day: bool
    slots: List[TimeSlotAvailability] = []


class DoctorAvailabilityResponse(BaseModel):
    """Schema for doctor availability response across date range."""

    doctor_id: int
    date_from: date
    date_to: date
    schedule: List[DayAvailability]

