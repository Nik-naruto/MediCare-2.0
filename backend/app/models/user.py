"""User ORM Model."""

from typing import TYPE_CHECKING, Optional
from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import UserRole

if TYPE_CHECKING:
    from app.models.doctor import Doctor
    from app.models.patient import Patient


class User(Base, TimestampMixin):
    """User account entity model."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.PATIENT)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    patient_profile: Mapped[Optional["Patient"]] = relationship("Patient", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor_profile: Mapped[Optional["Doctor"]] = relationship("Doctor", back_populates="user", uselist=False, cascade="all, delete-orphan")
