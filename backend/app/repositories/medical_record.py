"""Medical Record Data Repository."""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.medical_record import MedicalRecord
from app.repositories.base import BaseRepository


class MedicalRecordRepository(BaseRepository[MedicalRecord]):
    """Repository handling database queries for Electronic Health Records (EHR)."""

    def __init__(self, db: Session):
        super().__init__(MedicalRecord, db)

    def get_by_patient_id(self, patient_id: int) -> List[MedicalRecord]:
        """Fetch all medical records for a specific patient."""
        stmt = select(MedicalRecord).where(MedicalRecord.patient_id == patient_id)
        return list(self.db.scalars(stmt).all())

    def get_by_patient_ids(self, patient_ids: List[int]) -> List[MedicalRecord]:
        """Fetch medical records belonging to a list of patient IDs."""
        if not patient_ids:
            return []
        stmt = select(MedicalRecord).where(MedicalRecord.patient_id.in_(patient_ids))
        return list(self.db.scalars(stmt).all())

    def get_all_filtered(
        self,
        allowed_patient_ids: Optional[List[int]] = None,
        patient_id: Optional[int] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[MedicalRecord], int]:
        """Fetch medical records with domain authorization ID restrictions, DB-level search, filtering, sorting, and total count."""
        from sqlalchemy import func
        from app.core.pagination import apply_safe_sorting

        stmt = select(MedicalRecord)

        # Enforce domain ownership authorization
        if allowed_patient_ids is not None:
            if not allowed_patient_ids:
                return [], 0
            stmt = stmt.where(MedicalRecord.patient_id.in_(allowed_patient_ids))

        if patient_id is not None:
            stmt = stmt.where(MedicalRecord.patient_id == patient_id)
        if category:
            stmt = stmt.where(MedicalRecord.category.ilike(f"%{category.strip()}%"))

        if search:
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                (MedicalRecord.title.ilike(search_pattern))
                | (MedicalRecord.category.ilike(search_pattern))
                | (MedicalRecord.doctor_name.ilike(search_pattern))
                | (MedicalRecord.summary.ilike(search_pattern))
            )


        # Count total matching records before offset/limit
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = self.db.scalar(count_stmt) or 0

        # Apply safe sorting
        allowlist = {
            "id": MedicalRecord.id,
            "record_date": MedicalRecord.record_date,
            "title": MedicalRecord.title,
            "category": MedicalRecord.category,
            "created_at": MedicalRecord.created_at,
        }
        stmt = apply_safe_sorting(stmt, MedicalRecord, sort_by, sort_order, allowlist, MedicalRecord.record_date.desc())

        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        records = list(self.db.scalars(stmt).all())
        return records, total_count
