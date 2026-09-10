"""Report & Analytics Data Repository."""

from datetime import date
from typing import Dict, List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.department import Department
from app.models.doctor import Doctor
from app.models.enums import AppointmentStatus, PaymentStatus
from app.models.invoice import Invoice


class ReportRepository:
    """Repository executing database-level aggregation queries for reports."""

    def __init__(self, db: Session):
        self.db = db

    def get_all_departments(self) -> List[Department]:
        """Fetch all clinical departments for complete breakdown coverage."""
        stmt = select(Department).order_by(Department.name.asc())
        return list(self.db.scalars(stmt).all())

    def get_revenue_by_department(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        department_id: Optional[int] = None,
    ) -> List[Tuple[Optional[int], Optional[str], float]]:
        """
        Aggregate total paid revenue grouped by department directly in database.

        Returns list of tuples: (dept_id, dept_name, sum_total_amount)
        """
        stmt = (
            select(
                Department.id.label("dept_id"),
                Department.name.label("dept_name"),
                func.coalesce(func.sum(Invoice.total_amount), 0.0).label("revenue"),
            )
            .select_from(Invoice)
            .outerjoin(Appointment, Invoice.appointment_id == Appointment.id)
            .outerjoin(Doctor, Appointment.doctor_id == Doctor.id)
            .outerjoin(Department, Doctor.department_id == Department.id)
            .where(Invoice.payment_status == PaymentStatus.PAID)
        )

        if date_from is not None:
            stmt = stmt.where(Invoice.invoice_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(Invoice.invoice_date <= date_to)

        if department_id is not None:
            # Filter specifically by department
            stmt = stmt.where(
                (Doctor.department_id == department_id) | (Department.id == department_id)
            )

        stmt = stmt.group_by(Department.id, Department.name)
        results = self.db.execute(stmt).all()

        return [(r.dept_id, r.dept_name, float(r.revenue or 0.0)) for r in results]

    def get_total_paid_revenue(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        department_id: Optional[int] = None,
    ) -> float:
        """Calculate total aggregate paid revenue in database."""
        stmt = (
            select(func.coalesce(func.sum(Invoice.total_amount), 0.0))
            .select_from(Invoice)
            .where(Invoice.payment_status == PaymentStatus.PAID)
        )

        if date_from is not None:
            stmt = stmt.where(Invoice.invoice_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(Invoice.invoice_date <= date_to)

        if department_id is not None:
            stmt = (
                stmt.outerjoin(Appointment, Invoice.appointment_id == Appointment.id)
                .outerjoin(Doctor, Appointment.doctor_id == Doctor.id)
                .where(Doctor.department_id == department_id)
            )

        val = self.db.scalar(stmt)
        return float(val or 0.0)

    def get_consultation_time_distribution(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        department_id: Optional[int] = None,
    ) -> List[Tuple[Any, int]]:
        """
        Fetch start times and counts for non-cancelled appointments for peak hours calculation.

        Returns list of (start_time, count) tuples.
        """
        stmt = (
            select(
                Appointment.start_time,
                func.count(Appointment.id).label("cnt"),
            )
            .select_from(Appointment)
            .where(Appointment.status != AppointmentStatus.CANCELLED)
        )

        if date_from is not None:
            stmt = stmt.where(Appointment.appointment_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(Appointment.appointment_date <= date_to)

        if department_id is not None:
            stmt = stmt.outerjoin(Doctor, Appointment.doctor_id == Doctor.id).where(
                Doctor.department_id == department_id
            )

        stmt = stmt.group_by(Appointment.start_time)
        results = self.db.execute(stmt).all()

        return [(r[0], int(r[1] or 0)) for r in results]

    def get_total_consultations_count(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        department_id: Optional[int] = None,
    ) -> int:
        """Count total non-cancelled appointments in database."""
        stmt = (
            select(func.count(Appointment.id))
            .select_from(Appointment)
            .where(Appointment.status != AppointmentStatus.CANCELLED)
        )

        if date_from is not None:
            stmt = stmt.where(Appointment.appointment_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(Appointment.appointment_date <= date_to)

        if department_id is not None:
            stmt = stmt.outerjoin(Doctor, Appointment.doctor_id == Doctor.id).where(
                Doctor.department_id == department_id
            )

        val = self.db.scalar(stmt)
        return int(val or 0)
