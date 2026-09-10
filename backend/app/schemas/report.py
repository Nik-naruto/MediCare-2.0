"""Report & Analytics Pydantic Schemas."""

from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field


class DepartmentRevenue(BaseModel):
    """Department revenue summary item."""

    department_id: Optional[int] = Field(None, description="Department ID or None if unassigned")
    name: str = Field(..., description="Department name")
    amount: float = Field(..., description="Total paid revenue amount")
    formatted_amount: str = Field(..., description="Formatted revenue display string (INR)")
    percentage: int = Field(..., description="Percentage of total paid revenue")


class PeakHourBucket(BaseModel):
    """Peak consultation time slot item."""

    label: str = Field(..., description="Time slot bucket label")
    count: int = Field(..., description="Total non-cancelled consultations count")


class ReportFilterInfo(BaseModel):
    """Filter parameters applied to report payload."""

    date_from: Optional[date] = Field(None, description="Start date filter applied")
    date_to: Optional[date] = Field(None, description="End date filter applied")
    month: Optional[int] = Field(None, description="Month filter applied (1-12)")
    year: Optional[int] = Field(None, description="Year filter applied")
    department_id: Optional[int] = Field(None, description="Department ID filter applied")
    period_label: str = Field(..., description="Human-readable dynamic period label")


class ReportSummaryResponse(BaseModel):
    """Master Analytics & Report Summary payload response."""

    total_paid_revenue: float = Field(..., description="Total aggregate paid revenue")
    formatted_total_revenue: str = Field(..., description="Formatted total revenue string")
    total_consultations: int = Field(..., description="Total non-cancelled consultations count")
    revenue_breakdown: List[DepartmentRevenue] = Field(..., description="Revenue grouped by department")
    peak_hours: List[PeakHourBucket] = Field(..., description="Peak consultation time slots sorted by volume")
    filter_info: ReportFilterInfo = Field(..., description="Details on period and filters applied")
