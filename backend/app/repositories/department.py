"""Department Data Repository."""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.department import Department
from app.repositories.base import BaseRepository


class DepartmentRepository(BaseRepository[Department]):
    """Repository handling database queries for Clinical Departments."""

    def __init__(self, db: Session):
        super().__init__(Department, db)

    def get_by_name(self, name: str) -> Optional[Department]:
        """Fetch a department by unique name."""
        stmt = select(Department).where(Department.name == name)
        return self.db.scalars(stmt).first()

    def get_all_filtered(
        self,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
    ) -> tuple[list[Department], int]:
        """Fetch departments with DB-level search, sorting, pagination, and total count calculation."""
        from sqlalchemy import func
        from app.core.pagination import apply_safe_sorting

        stmt = select(Department)

        if search:
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                (Department.name.ilike(search_pattern))
                | (Department.description.ilike(search_pattern))
            )

        # Count total matching records before offset/limit
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = self.db.scalar(count_stmt) or 0

        # Apply safe sorting
        allowlist = {
            "id": Department.id,
            "name": Department.name,
            "created_at": Department.created_at,
        }
        stmt = apply_safe_sorting(stmt, Department, sort_by, sort_order, allowlist, Department.name.asc())

        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        departments = list(self.db.scalars(stmt).all())
        return departments, total_count
