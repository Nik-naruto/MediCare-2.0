"""Doctor Schedule Pydantic Schemas."""

from datetime import datetime, time
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


def validate_custom_slots_str(v: Optional[str]) -> Optional[str]:
    """Validate that custom_slots string contains at most 10 unique, valid time slots."""
    if not v:
        return None
    slots = [s.strip() for s in v.split(",") if s.strip()]
    if len(slots) > 10:
        raise ValueError("A doctor can configure a maximum of 10 appointment slots per day.")
    if len(slots) != len(set(slots)):
        raise ValueError("Duplicate time slots are not allowed.")
    return ",".join(slots)


class DoctorScheduleBase(BaseModel):
    """Shared schedule attributes."""

    day_of_week: str = Field(..., max_length=20)
    start_time: time
    end_time: time
    slot_duration_minutes: int = Field(default=15, ge=5, le=120)
    custom_slots: Optional[str] = None
    is_active: bool = True

    @field_validator("custom_slots")
    @classmethod
    def validate_custom_slots(cls, v: Optional[str]) -> Optional[str]:
        return validate_custom_slots_str(v)


class DoctorScheduleCreate(DoctorScheduleBase):
    """Schema for creating a doctor schedule shift."""

    doctor_id: int


class DoctorScheduleUpdate(BaseModel):
    """Schema for updating schedule details."""

    day_of_week: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    slot_duration_minutes: Optional[int] = None
    custom_slots: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("custom_slots")
    @classmethod
    def validate_custom_slots(cls, v: Optional[str]) -> Optional[str]:
        return validate_custom_slots_str(v)


class DoctorScheduleResponse(DoctorScheduleBase):
    """Schema for returning doctor schedule response."""

    id: int
    doctor_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

