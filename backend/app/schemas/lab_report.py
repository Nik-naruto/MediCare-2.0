"""Lab Report Pydantic Schemas."""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import LabReportStatus


class LabReportBase(BaseModel):
    """Shared lab report attributes."""

    test_name: str = Field(..., max_length=200)
    prescribed_by: Optional[str] = Field(None, max_length=150)
    lab_technician: Optional[str] = Field(None, max_length=150)
    request_date: date
    completion_date: Optional[date] = None
    status: LabReportStatus = LabReportStatus.PENDING
    results_summary: Optional[str] = None
    document_url: Optional[str] = Field(None, max_length=500)


class LabReportCreate(LabReportBase):
    """Schema for requesting a new lab diagnostic test."""

    patient_id: int


class LabReportUpdate(BaseModel):
    """Schema for updating lab report results."""

    lab_technician: Optional[str] = None
    completion_date: Optional[date] = None
    status: Optional[LabReportStatus] = None
    results_summary: Optional[str] = None
    document_url: Optional[str] = None


class LabReportResponse(LabReportBase):
    """Schema for returning lab report response."""

    id: int
    patient_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
