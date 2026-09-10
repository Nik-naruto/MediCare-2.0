"""Patient Data Repository."""

from typing import Any, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.repositories.base import BaseRepository


class PatientRepository(BaseRepository[Patient]):
    """Repository handling database queries for Patients."""

    def __init__(self, db: Session):
        super().__init__(Patient, db)

    def get_by_user_id(self, user_id: int) -> Optional[Patient]:
        """Fetch patient record by associated user account ID."""
        stmt = select(Patient).where(Patient.user_id == user_id)
        return self.db.scalars(stmt).first()

    def get_all_filtered(
        self,
        allowed_patient_ids: Optional[List[int]] = None,
        search: Optional[str] = None,
        gender: Optional[Any] = None,
        blood_group: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[Patient], int]:
        """Fetch patients with domain authorization ID restrictions, DB-level search, filtering, sorting, and total count."""
        from sqlalchemy import func
        from app.models.user import User
        from app.core.pagination import apply_safe_sorting

        stmt = select(Patient)

        # Enforce domain ownership / scope restrictions
        if allowed_patient_ids is not None:
            if not allowed_patient_ids:
                return [], 0
            stmt = stmt.where(Patient.id.in_(allowed_patient_ids))

        # Join User for search attributes
        if search:
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.join(User, Patient.user_id == User.id).where(
                (User.full_name.ilike(search_pattern))
                | (User.email.ilike(search_pattern))
                | (User.phone.ilike(search_pattern))
            )

        if gender is not None:
            stmt = stmt.where(Patient.gender == gender)
        if blood_group:
            stmt = stmt.where(Patient.blood_group.ilike(f"%{blood_group.strip()}%"))

        # Count total matching records before offset/limit
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = self.db.scalar(count_stmt) or 0

        # Apply safe sorting
        allowlist = {
            "id": Patient.id,
            "created_at": Patient.created_at,
            "date_of_birth": Patient.date_of_birth,
            "gender": Patient.gender,
            "blood_group": Patient.blood_group,
        }
        stmt = apply_safe_sorting(stmt, Patient, sort_by, sort_order, allowlist, Patient.id.desc())

        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        patients = list(self.db.scalars(stmt).all())
        return patients, total_count
