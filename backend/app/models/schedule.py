"""Doctor Schedule ORM Model."""

from datetime import time
from typing import TYPE_CHECKING, Optional
from sqlalchemy import ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.doctor import Doctor


class DoctorSchedule(Base, TimestampMixin):
    """Doctor availability shift schedule entity model."""

    __tablename__ = "doctor_schedules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    day_of_week: Mapped[str] = mapped_column(String(20), nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    slot_duration_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    custom_slots: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    doctor: Mapped["Doctor"] = relationship("Doctor", back_populates="schedules")

