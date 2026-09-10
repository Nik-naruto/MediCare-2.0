"""Appointment Data Repository."""

from datetime import date, time
from typing import List, Optional
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus
from app.repositories.base import BaseRepository


class AppointmentRepository(BaseRepository[Appointment]):
    """Repository handling database queries for Appointments."""

    def __init__(self, db: Session):
        super().__init__(Appointment, db)

    def get_by_patient(self, patient_id: int) -> List[Appointment]:
        """Fetch all appointments booked by a patient."""
        stmt = select(Appointment).where(Appointment.patient_id == patient_id)
        return list(self.db.scalars(stmt).all())

    def get_receptionist_dashboard_metrics(self, target_date: date) -> tuple[int, int, int]:
        """Fetch total today's appointments, checked in/waiting count, and upcoming arrivals count."""
        from sqlalchemy import func
        stmt_total = select(func.count(Appointment.id)).where(
            Appointment.appointment_date == target_date,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
        total_cnt = self.db.scalar(stmt_total) or 0

        stmt_checked_in = select(func.count(Appointment.id)).where(
            Appointment.appointment_date == target_date,
            Appointment.status.in_([AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_CONSULTATION]),
        )
        checked_in_cnt = self.db.scalar(stmt_checked_in) or 0

        stmt_upcoming = select(func.count(Appointment.id)).where(
            Appointment.appointment_date == target_date,
            Appointment.status == AppointmentStatus.SCHEDULED,
        )
        upcoming_cnt = self.db.scalar(stmt_upcoming) or 0

        return total_cnt, checked_in_cnt, upcoming_cnt

    def get_today_queue(self, target_date: date, limit: int = 20) -> List[Appointment]:
        """Fetch today's active front desk queue appointments with eager relationships."""
        from sqlalchemy.orm import selectinload
        from app.models.patient import Patient
        from app.models.doctor import Doctor
        from app.models.user import User

        stmt = (
            select(Appointment)
            .where(Appointment.appointment_date == target_date)
            .where(Appointment.status != AppointmentStatus.CANCELLED)
            .options(
                selectinload(Appointment.patient).selectinload(Patient.user),
                selectinload(Appointment.doctor).selectinload(Doctor.user),
            )
            .order_by(Appointment.start_time.asc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_by_doctor(self, doctor_id: int) -> List[Appointment]:
        """Fetch all appointments assigned to a doctor."""
        stmt = select(Appointment).where(Appointment.doctor_id == doctor_id)
        return list(self.db.scalars(stmt).all())

    def get_by_doctor_and_date(self, doctor_id: int, appointment_date: date) -> List[Appointment]:
        """Fetch doctor's appointments for a specific date."""
        stmt = select(Appointment).where(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == appointment_date,
        )
        return list(self.db.scalars(stmt).all())

    def get_doctor_appointments_in_range(
        self, doctor_id: int, date_from: date, date_to: date
    ) -> List[Appointment]:
        """Fetch all active (non-cancelled) appointments for a doctor within a date range."""
        stmt = select(Appointment).where(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= date_from,
            Appointment.appointment_date <= date_to,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
        return list(self.db.scalars(stmt).all())


    def check_existing_booking(
        self, doctor_id: int, appointment_date: date, start_time: time
    ) -> Optional[Appointment]:
        """Check if a doctor slot is already booked."""
        stmt = select(Appointment).where(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == appointment_date,
            Appointment.start_time == start_time,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
        return self.db.scalars(stmt).first()

    def get_overlapping_doctor_appointment(
        self,
        doctor_id: int,
        appointment_date: date,
        start_time: time,
        end_time: time,
        exclude_id: Optional[int] = None,
    ) -> Optional[Appointment]:
        """Check for active overlapping appointments for a doctor."""
        stmt = select(Appointment).where(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == appointment_date,
            Appointment.status != AppointmentStatus.CANCELLED,
            Appointment.start_time < end_time,
            or_(
                Appointment.end_time > start_time,
                Appointment.end_time.is_(None),
            ),
        )
        if exclude_id is not None:
            stmt = stmt.where(Appointment.id != exclude_id)
        return self.db.scalars(stmt).first()

    def get_overlapping_patient_appointment(
        self,
        patient_id: int,
        appointment_date: date,
        start_time: time,
        end_time: time,
        exclude_id: Optional[int] = None,
    ) -> Optional[Appointment]:
        """Check for active overlapping appointments for a patient."""
        stmt = select(Appointment).where(
            Appointment.patient_id == patient_id,
            Appointment.appointment_date == appointment_date,
            Appointment.status != AppointmentStatus.CANCELLED,
            Appointment.start_time < end_time,
            or_(
                Appointment.end_time > start_time,
                Appointment.end_time.is_(None),
            ),
        )
        if exclude_id is not None:
            stmt = stmt.where(Appointment.id != exclude_id)
        return self.db.scalars(stmt).first()

    def has_appointment(self, doctor_id: int, patient_id: int) -> bool:
        """Check if any appointment relationship exists between a doctor and patient."""
        stmt = select(Appointment).where(
            Appointment.doctor_id == doctor_id,
            Appointment.patient_id == patient_id,
        )
        return self.db.scalars(stmt).first() is not None

    def get_patient_ids_for_doctor(self, doctor_id: int) -> List[int]:
        """Fetch distinct patient IDs having appointments with a doctor."""
        stmt = select(Appointment.patient_id).where(Appointment.doctor_id == doctor_id).distinct()
        return list(self.db.scalars(stmt).all())

    def get_all_filtered(
        self,
        allowed_patient_id: Optional[int] = None,
        allowed_doctor_id: Optional[int] = None,
        patient_id: Optional[int] = None,
        doctor_id: Optional[int] = None,
        status: Optional[AppointmentStatus] = None,
        search: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[Appointment], int]:
        """Fetch appointments with domain ownership scope enforcement, DB-level search, filtering, sorting, and pagination."""
        from sqlalchemy import func
        from app.models.patient import Patient
        from app.models.doctor import Doctor
        from app.models.user import User
        from app.core.pagination import apply_safe_sorting

        stmt = select(Appointment)

        # Enforce domain ownership authorization
        if allowed_patient_id is not None:
            stmt = stmt.where(Appointment.patient_id == allowed_patient_id)
        if allowed_doctor_id is not None:
            stmt = stmt.where(Appointment.doctor_id == allowed_doctor_id)

        # Explicit user filters
        if patient_id is not None:
            stmt = stmt.where(Appointment.patient_id == patient_id)
        if doctor_id is not None:
            stmt = stmt.where(Appointment.doctor_id == doctor_id)
        if status is not None:
            stmt = stmt.where(Appointment.status == status)
        if date_from is not None:
            stmt = stmt.where(Appointment.appointment_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(Appointment.appointment_date <= date_to)

        if search:
            search_pattern = f"%{search.strip()}%"
            # Join patient user and doctor user for search
            p_user = select(Patient.id).join(User, Patient.user_id == User.id).where(User.full_name.ilike(search_pattern)).scalar_subquery()
            d_user = select(Doctor.id).join(User, Doctor.user_id == User.id).where(User.full_name.ilike(search_pattern)).scalar_subquery()
            stmt = stmt.where(
                (Appointment.reason.ilike(search_pattern))
                | (Appointment.patient_id.in_(p_user))
                | (Appointment.doctor_id.in_(d_user))
            )

        # Count total matching records before offset/limit
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = self.db.scalar(count_stmt) or 0

        # Apply safe sorting
        allowlist = {
            "id": Appointment.id,
            "appointment_date": Appointment.appointment_date,
            "start_time": Appointment.start_time,
            "status": Appointment.status,
            "created_at": Appointment.created_at,
        }
        stmt = apply_safe_sorting(stmt, Appointment, sort_by, sort_order, allowlist, [Appointment.appointment_date.desc(), Appointment.start_time.desc()])

        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        appointments = list(self.db.scalars(stmt).all())
        return appointments, total_count
