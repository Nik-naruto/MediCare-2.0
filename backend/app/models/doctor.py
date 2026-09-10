"""Doctor ORM Model."""

from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.appointment import Appointment
    from app.models.department import Department
    from app.models.prescription import Prescription
    from app.models.schedule import DoctorSchedule
    from app.models.user import User


class Doctor(Base, TimestampMixin):
    """Doctor specialist entity model."""

    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    department_id: Mapped[Optional[int]] = mapped_column(ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    medical_registration_number: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    qualification: Mapped[str] = mapped_column(String(200), nullable=False)
    specialty: Mapped[str] = mapped_column(String(100), nullable=False)
    experience_years: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    consultation_fee: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    room_no: Mapped[str] = mapped_column(String(50), nullable=False)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    profile_photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_available: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="doctor_profile")
    department: Mapped[Optional["Department"]] = relationship("Department", back_populates="doctors", foreign_keys=[department_id])
    schedules: Mapped[List["DoctorSchedule"]] = relationship("DoctorSchedule", back_populates="doctor", cascade="all, delete-orphan")
    appointments: Mapped[List["Appointment"]] = relationship("Appointment", back_populates="doctor")
    prescriptions: Mapped[List["Prescription"]] = relationship("Prescription", back_populates="doctor")
