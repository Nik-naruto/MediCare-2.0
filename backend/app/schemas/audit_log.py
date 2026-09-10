"""Audit Log Pydantic Schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class AuditLogBase(BaseModel):
    """Shared audit log attributes."""

    action: str = Field(..., max_length=100)
    resource: Optional[str] = Field(None, max_length=200)
    details: Optional[str] = None
    ip_address: Optional[str] = Field(None, max_length=45)


class AuditLogCreate(AuditLogBase):
    """Schema for logging a system audit event."""

    user_id: Optional[int] = None
    user_name: Optional[str] = Field(None, max_length=150)
    role: Optional[str] = Field(None, max_length=50)


class AuditLogResponse(AuditLogBase):
    """Schema for returning audit log record."""

    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    role: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
