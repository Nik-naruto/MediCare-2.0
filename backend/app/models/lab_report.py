"""Lab Report ORM Model."""

from datetime import date
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Date, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import LabReportStatus

if TYPE_CHECKING:
    from app.models.patient import Patient


class LabReport(Base, TimestampMixin):
    """Pathology Lab Test diagnostic report entity model."""

    __tablename__ = "lab_reports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    test_name: Mapped[str] = mapped_column(String(200), nullable=False)
    prescribed_by: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    lab_technician: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    request_date: Mapped[date] = mapped_column(Date, nullable=False)
    completion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[LabReportStatus] = mapped_column(Enum(LabReportStatus), nullable=False, default=LabReportStatus.PENDING)
    results_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    patient: Mapped["Patient"] = relationship("Patient", back_populates="lab_reports")
