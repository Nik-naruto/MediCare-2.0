"""Doctor Data Repository."""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.doctor import Doctor
from app.repositories.base import BaseRepository


class DoctorRepository(BaseRepository[Doctor]):
    """Repository handling database queries for Doctors."""

    def __init__(self, db: Session):
        super().__init__(Doctor, db)

    def get_by_user_id(self, user_id: int) -> Optional[Doctor]:
        """Fetch doctor profile by associated user account ID."""
        stmt = select(Doctor).where(Doctor.user_id == user_id)
        return self.db.scalars(stmt).first()

    def get_by_department(self, department_id: int) -> List[Doctor]:
        """Fetch all doctors assigned to a specific department."""
        stmt = select(Doctor).where(Doctor.department_id == department_id)
        return list(self.db.scalars(stmt).all())

    def get_available_doctors(self) -> List[Doctor]:
        """Fetch all currently available doctors."""
        stmt = select(Doctor).where(Doctor.is_available.is_(True))
        return list(self.db.scalars(stmt).all())

    def get_all_filtered(
        self,
        search: Optional[str] = None,
        department_id: Optional[int] = None,
        specialty: Optional[str] = None,
        is_available: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[Doctor], int]:
        """Fetch doctors with DB-level search, filtering, sorting, pagination, and total count calculation."""
        from sqlalchemy import func
        from app.models.user import User
        from app.core.pagination import apply_safe_sorting

        stmt = select(Doctor)

        # Join User for name search
        if search:
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.join(User, Doctor.user_id == User.id).where(
                (User.full_name.ilike(search_pattern))
                | (Doctor.specialty.ilike(search_pattern))
                | (Doctor.qualification.ilike(search_pattern))
            )

        if department_id is not None:
            stmt = stmt.where(Doctor.department_id == department_id)
        if specialty:
            stmt = stmt.where(Doctor.specialty.ilike(f"%{specialty.strip()}%"))
        if is_available is not None:
            stmt = stmt.where(Doctor.is_available == is_available)

        # Count total matching records before offset/limit
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = self.db.scalar(count_stmt) or 0

        # Apply safe sorting
        allowlist = {
            "id": Doctor.id,
            "created_at": Doctor.created_at,
            "experience_years": Doctor.experience_years,
            "consultation_fee": Doctor.consultation_fee,
            "specialty": Doctor.specialty,
            "is_available": Doctor.is_available,
        }
        stmt = apply_safe_sorting(stmt, Doctor, sort_by, sort_order, allowlist, Doctor.id.asc())

        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        doctors = list(self.db.scalars(stmt).all())
        return doctors, total_count
