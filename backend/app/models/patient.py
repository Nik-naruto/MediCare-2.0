"""Patient ORM Model."""

from datetime import date
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Date, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import Gender

if TYPE_CHECKING:
    from app.models.appointment import Appointment
    from app.models.invoice import Invoice
    from app.models.lab_report import LabReport
    from app.models.medical_record import MedicalRecord
    from app.models.prescription import Prescription
    from app.models.user import User


class Patient(Base, TimestampMixin):
    """Patient entity model."""

    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    gender: Mapped[Gender] = mapped_column(Enum(Gender), nullable=False, default=Gender.MALE)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    emergency_contact: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    allergies: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="patient_profile")
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="patient")
    medical_records: Mapped[List["MedicalRecord"]] = relationship("MedicalRecord", back_populates="patient")
    prescriptions: Mapped[List["Prescription"]] = relationship("Prescription", back_populates="patient")
    lab_reports: Mapped[List["LabReport"]] = relationship("LabReport", back_populates="patient")
    invoices: Mapped[List["Invoice"]] = relationship("Invoice", back_populates="patient")
