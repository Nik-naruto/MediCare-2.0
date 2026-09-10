"""Medical Record Pydantic Schemas."""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class MedicalRecordBase(BaseModel):
    """Shared medical record attributes."""

    title: str = Field(..., max_length=200)
    category: str = Field(..., max_length=100)
    doctor_name: Optional[str] = Field(None, max_length=150)
    summary: Optional[str] = None
    document_url: Optional[str] = Field(None, max_length=500)
    record_date: date


class MedicalRecordCreate(MedicalRecordBase):
    """Schema for adding a new clinical medical record."""

    patient_id: int


class MedicalRecordUpdate(BaseModel):
    """Schema for updating a medical record."""

    title: Optional[str] = None
    category: Optional[str] = None
    doctor_name: Optional[str] = None
    summary: Optional[str] = None
    document_url: Optional[str] = None
    record_date: Optional[date] = None


class MedicalRecordResponse(MedicalRecordBase):
    """Schema for returning medical record details."""

    id: int
    patient_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
