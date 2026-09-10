"""Notification Pydantic Schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class NotificationBase(BaseModel):
    """Shared notification attributes."""

    title: str = Field(..., max_length=200)
    message: str
    notification_type: str = Field(default="INFO", max_length=50)


class NotificationCreate(NotificationBase):
    """Schema for sending a user notification."""

    user_id: int


class NotificationResponse(NotificationBase):
    """Schema for returning notification response."""

    id: int
    user_id: int
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
