"""Lab Report Data Repository."""

from typing import Any, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lab_report import LabReport
from app.repositories.base import BaseRepository


class LabReportRepository(BaseRepository[LabReport]):
    """Repository handling database queries for Pathology Lab Reports."""

    def __init__(self, db: Session):
        super().__init__(LabReport, db)

    def get_by_patient_id(self, patient_id: int) -> List[LabReport]:
        """Fetch all lab diagnostic reports for a patient."""
        stmt = select(LabReport).where(LabReport.patient_id == patient_id)
        return list(self.db.scalars(stmt).all())

    def get_by_patient_ids(self, patient_ids: List[int]) -> List[LabReport]:
        """Fetch lab reports belonging to a list of patient IDs."""
        if not patient_ids:
            return []
        stmt = select(LabReport).where(LabReport.patient_id.in_(patient_ids))
        return list(self.db.scalars(stmt).all())

    def get_all_filtered(
        self,
        allowed_patient_ids: Optional[List[int]] = None,
        patient_id: Optional[int] = None,
        status: Optional[Any] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[LabReport], int]:
        """Fetch lab reports with domain ownership authorization, DB-level search, filtering, sorting, and pagination."""
        from sqlalchemy import func
        from app.core.pagination import apply_safe_sorting

        stmt = select(LabReport)

        # Enforce domain ownership authorization
        if allowed_patient_ids is not None:
            if not allowed_patient_ids:
                return [], 0
            stmt = stmt.where(LabReport.patient_id.in_(allowed_patient_ids))

        if patient_id is not None:
            stmt = stmt.where(LabReport.patient_id == patient_id)
        if status is not None:
            stmt = stmt.where(LabReport.status == status)

        if search:
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                (LabReport.test_name.ilike(search_pattern))
                | (LabReport.prescribed_by.ilike(search_pattern))
                | (LabReport.results_summary.ilike(search_pattern))
            )


        # Count total matching records before offset/limit
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = self.db.scalar(count_stmt) or 0

        # Apply safe sorting
        allowlist = {
            "id": LabReport.id,
            "request_date": LabReport.request_date,
            "completion_date": LabReport.completion_date,
            "test_name": LabReport.test_name,
            "status": LabReport.status,
            "created_at": LabReport.created_at,
        }

        stmt = apply_safe_sorting(stmt, LabReport, sort_by, sort_order, allowlist, LabReport.request_date.desc())

        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        reports = list(self.db.scalars(stmt).all())
        return reports, total_count
