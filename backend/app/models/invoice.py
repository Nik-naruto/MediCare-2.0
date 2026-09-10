"""Invoice & InvoiceItem ORM Models."""

from datetime import date
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Date, Enum, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import PaymentStatus

if TYPE_CHECKING:
    from app.models.appointment import Appointment
    from app.models.patient import Patient


class Invoice(Base, TimestampMixin):
    """Billing Invoice header entity model."""

    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    appointment_id: Mapped[Optional[int]] = mapped_column(ForeignKey("appointments.id", ondelete="SET NULL"), unique=True, nullable=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    subtotal: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    tax: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    payment_status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.UNPAID)
    payment_method: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    transaction_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    appointment: Mapped[Optional["Appointment"]] = relationship("Appointment", back_populates="invoice")
    patient: Mapped["Patient"] = relationship("Patient", back_populates="invoices")
    items: Mapped[List["InvoiceItem"]] = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")

    @property
    def patient_name(self) -> Optional[str]:
        """Convenience property returning patient full name if relationship is loaded."""
        if self.patient and getattr(self.patient, "user", None):
            return self.patient.user.full_name
        return None


class InvoiceItem(Base, TimestampMixin):
    """Invoice line item entity model."""

    __tablename__ = "invoice_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Relationships
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")
