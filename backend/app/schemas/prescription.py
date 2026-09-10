"""Prescription & PrescriptionItem Pydantic Schemas."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class PrescriptionItemBase(BaseModel):
    """Shared prescription line item attributes."""

    medicine_name: str = Field(..., max_length=200)
    dosage: str = Field(..., max_length=100)
    frequency: str = Field(..., max_length=100)
    duration_days: int = Field(default=5, ge=1)


class PrescriptionItemCreate(PrescriptionItemBase):
    """Schema for adding medication item."""

    pass


class PrescriptionItemResponse(PrescriptionItemBase):
    """Schema for returning medication item."""

    id: int
    prescription_id: int

    model_config = ConfigDict(from_attributes=True)


class PrescriptionBase(BaseModel):
    """Shared prescription header attributes."""

    diagnosis: str
    notes: Optional[str] = None


class PrescriptionCreate(PrescriptionBase):
    """Schema for creating a digital e-Prescription."""

    patient_id: int
    doctor_id: int
    appointment_id: Optional[int] = None
    items: List[PrescriptionItemCreate] = []


from app.schemas.doctor import DoctorResponse
from app.schemas.patient import PatientResponse


class PrescriptionResponse(PrescriptionBase):
    """Schema for returning full prescription details."""

    id: int
    appointment_id: Optional[int] = None
    patient_id: int
    doctor_id: int
    patient: Optional[PatientResponse] = None
    doctor: Optional[DoctorResponse] = None
    items: List[PrescriptionItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

