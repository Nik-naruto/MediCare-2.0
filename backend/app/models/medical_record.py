"""Medical Record ORM Model."""

from datetime import date
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.patient import Patient


class MedicalRecord(Base, TimestampMixin):
    """Electronic Health Record (EHR) entity model."""

    __tablename__ = "medical_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    doctor_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    record_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="medical_records")
