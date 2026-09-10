"""Doctor Schedule Data Repository."""

from datetime import time
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.schedule import DoctorSchedule
from app.repositories.base import BaseRepository


class DoctorScheduleRepository(BaseRepository[DoctorSchedule]):
    """Repository handling database queries for Doctor Schedules."""

    def __init__(self, db: Session):
        super().__init__(DoctorSchedule, db)

    def get_by_doctor_id(self, doctor_id: int) -> List[DoctorSchedule]:
        """Fetch all schedule rules for a specific doctor."""
        stmt = select(DoctorSchedule).where(DoctorSchedule.doctor_id == doctor_id)
        return list(self.db.scalars(stmt).all())

    def get_by_doctor_and_day(self, doctor_id: int, day_of_week: str) -> List[DoctorSchedule]:
        """Fetch active schedule rules for a doctor on a specific day of week."""
        stmt = select(DoctorSchedule).where(
            DoctorSchedule.doctor_id == doctor_id,
            DoctorSchedule.day_of_week.ilike(day_of_week),
            DoctorSchedule.is_active.is_(True),
        )
        return list(self.db.scalars(stmt).all())

    def get_overlapping_schedule(
        self,
        doctor_id: int,
        day_of_week: str,
        start_time: time,
        end_time: time,
        exclude_id: Optional[int] = None,
    ) -> Optional[DoctorSchedule]:
        """Check if doctor has an overlapping schedule on the specified day of week."""
        stmt = select(DoctorSchedule).where(
            DoctorSchedule.doctor_id == doctor_id,
            DoctorSchedule.day_of_week.ilike(day_of_week),
            DoctorSchedule.is_active.is_(True),
            DoctorSchedule.start_time < end_time,
            DoctorSchedule.end_time > start_time,
        )
        if exclude_id is not None:
            stmt = stmt.where(DoctorSchedule.id != exclude_id)
        return self.db.scalars(stmt).first()

    def get_all_filtered(
        self,
        search: Optional[str] = None,
        doctor_id: Optional[int] = None,
        day_of_week: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
    ) -> tuple[List[DoctorSchedule], int]:
        """Fetch doctor schedule shifts with DB-level search, filtering, sorting, pagination, and total count."""
        from sqlalchemy import func
        from app.core.pagination import apply_safe_sorting

        stmt = select(DoctorSchedule)

        if search:
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.where(DoctorSchedule.day_of_week.ilike(search_pattern))

        if doctor_id is not None:
            stmt = stmt.where(DoctorSchedule.doctor_id == doctor_id)
        if day_of_week:
            stmt = stmt.where(DoctorSchedule.day_of_week.ilike(f"%{day_of_week.strip()}%"))
        if is_active is not None:
            stmt = stmt.where(DoctorSchedule.is_active == is_active)

        # Count total matching records before offset/limit
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = self.db.scalar(count_stmt) or 0

        # Apply safe sorting
        allowlist = {
            "id": DoctorSchedule.id,
            "day_of_week": DoctorSchedule.day_of_week,
            "start_time": DoctorSchedule.start_time,
            "end_time": DoctorSchedule.end_time,
            "created_at": DoctorSchedule.created_at,
        }
        stmt = apply_safe_sorting(stmt, DoctorSchedule, sort_by, sort_order, allowlist, DoctorSchedule.id.asc())

        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        schedules = list(self.db.scalars(stmt).all())
        return schedules, total_count
