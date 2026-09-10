"""Prescription & PrescriptionItem ORM Models."""

from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.appointment import Appointment
    from app.models.doctor import Doctor
    from app.models.patient import Patient


class Prescription(Base, TimestampMixin):
    """Electronic Prescription (e-Rx) header entity model."""

    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    appointment_id: Mapped[Optional[int]] = mapped_column(ForeignKey("appointments.id", ondelete="SET NULL"), unique=True, nullable=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    diagnosis: Mapped[str] = mapped_column(Text, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    appointment: Mapped[Optional["Appointment"]] = relationship("Appointment", back_populates="prescription")
    patient: Mapped["Patient"] = relationship("Patient", back_populates="prescriptions")
    doctor: Mapped["Doctor"] = relationship("Doctor", back_populates="prescriptions")
    items: Mapped[List["PrescriptionItem"]] = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")


class PrescriptionItem(Base, TimestampMixin):
    """Prescription medication line item entity model."""

    __tablename__ = "prescription_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    prescription_id: Mapped[int] = mapped_column(ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False)
    medicine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency: Mapped[str] = mapped_column(String(100), nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False, default=5)

    # Relationships
    prescription: Mapped["Prescription"] = relationship("Prescription", back_populates="items")
