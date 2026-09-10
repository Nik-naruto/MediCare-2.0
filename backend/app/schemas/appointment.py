"""Appointment Pydantic Schemas."""

from datetime import date, datetime, time
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AppointmentStatus, PaymentStatus
from app.schemas.doctor import DoctorResponse
from app.schemas.patient import PatientResponse


class AppointmentBase(BaseModel):
    """Shared appointment attributes."""

    appointment_date: date
    start_time: time
    end_time: Optional[time] = None
    reason: Optional[str] = None
    fee: float = Field(default=0.0, ge=0.0)


class AppointmentCreate(AppointmentBase):
    """Schema for booking a new appointment."""

    patient_id: int
    doctor_id: int


class AppointmentStatusUpdate(BaseModel):
    """Schema for updating appointment lifecycle status."""

    status: AppointmentStatus
    payment_status: Optional[PaymentStatus] = None


class AppointmentUpdate(BaseModel):
    """Schema for updating appointment details and scheduling parameters."""

    appointment_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    reason: Optional[str] = None
    fee: Optional[float] = Field(None, ge=0.0)
    status: Optional[AppointmentStatus] = None
    payment_status: Optional[PaymentStatus] = None
    patient_id: Optional[int] = None
    doctor_id: Optional[int] = None


class AppointmentResponse(AppointmentBase):
    """Schema for returning appointment details."""

    id: int
    patient_id: int
    doctor_id: int
    status: AppointmentStatus
    token_no: Optional[str] = None
    payment_status: PaymentStatus
    patient: Optional[PatientResponse] = None
    doctor: Optional[DoctorResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReceptionistDashboardResponse(BaseModel):
    """Schema for receptionist operational front-desk dashboard payload."""

    today_total_patients: int
    checked_in_waiting_count: int
    upcoming_arrivals_count: int
    today_collected_revenue: float
    formatted_collected_revenue: str
    target_date: date
    queue: list[AppointmentResponse]

