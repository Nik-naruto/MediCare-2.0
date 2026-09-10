"""Invoice & InvoiceItem Pydantic Schemas."""

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PaymentStatus


class InvoiceItemBase(BaseModel):
    """Shared invoice line item attributes."""

    description: str = Field(..., max_length=255)
    amount: float = Field(default=0.0, ge=0.0)


class InvoiceItemCreate(InvoiceItemBase):
    """Schema for adding invoice line item."""

    pass


class InvoiceItemResponse(InvoiceItemBase):
    """Schema for returning invoice line item."""

    id: int
    invoice_id: int

    model_config = ConfigDict(from_attributes=True)


class InvoiceBase(BaseModel):
    """Shared invoice header attributes."""

    invoice_date: date
    subtotal: float = Field(default=0.0, ge=0.0)
    tax: float = Field(default=0.0, ge=0.0)
    total_amount: float = Field(default=0.0, ge=0.0)
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    payment_method: Optional[str] = Field(None, max_length=100)
    transaction_id: Optional[str] = Field(None, max_length=100)


class InvoiceCreate(InvoiceBase):
    """Schema for generating a new billing invoice."""

    patient_id: int
    appointment_id: Optional[int] = None
    items: List[InvoiceItemCreate] = []


class InvoicePaymentUpdate(BaseModel):
    """Schema for recording invoice payment collection."""

    payment_status: PaymentStatus
    payment_method: str = Field(..., max_length=100)
    transaction_id: Optional[str] = Field(None, max_length=100)


class InvoiceResponse(InvoiceBase):
    """Schema for returning invoice details."""

    id: int
    patient_id: int
    patient_name: Optional[str] = None
    appointment_id: Optional[int] = None
    items: List[InvoiceItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
