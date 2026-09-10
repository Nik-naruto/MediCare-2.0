"""Department Pydantic Schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class DepartmentBase(BaseModel):
    """Shared department attributes."""

    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    location: Optional[str] = None
    head_doctor_id: Optional[int] = None


class DepartmentCreate(DepartmentBase):
    """Schema for creating a new department."""

    pass


class DepartmentUpdate(BaseModel):
    """Schema for updating department details."""

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    location: Optional[str] = None
    head_doctor_id: Optional[int] = None


class DepartmentResponse(DepartmentBase):
    """Schema for returning department response."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
