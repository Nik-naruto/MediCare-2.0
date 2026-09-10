"""Appointment ORM Model."""

from datetime import date, time
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Date, Enum, Float, ForeignKey, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import AppointmentStatus, PaymentStatus

if TYPE_CHECKING:
    from app.models.doctor import Doctor
    from app.models.invoice import Invoice
    from app.models.patient import Patient
    from app.models.prescription import Prescription


class Appointment(Base, TimestampMixin):
    """Appointment consultation entity model."""

    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    status: Mapped[AppointmentStatus] = mapped_column(Enum(AppointmentStatus), nullable=False, default=AppointmentStatus.SCHEDULED)
    token_no: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fee: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    payment_status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.UNPAID)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="appointments")
    doctor: Mapped["Doctor"] = relationship("Doctor", back_populates="appointments")
    prescription: Mapped[Optional["Prescription"]] = relationship("Prescription", back_populates="appointment", uselist=False)
    invoice: Mapped[Optional["Invoice"]] = relationship("Invoice", back_populates="appointment", uselist=False)
