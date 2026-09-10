"""Department ORM Model."""

from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.doctor import Doctor


class Department(Base, TimestampMixin):
    """Clinical Department entity model."""

    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    head_doctor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    doctors: Mapped[List["Doctor"]] = relationship("Doctor", back_populates="department", foreign_keys="[Doctor.department_id]")
    head_doctor: Mapped[Optional["Doctor"]] = relationship("Doctor", foreign_keys=[head_doctor_id])
