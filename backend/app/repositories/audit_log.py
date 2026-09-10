"""Audit Log Data Repository."""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    """Repository handling database queries for Audit Logs."""

    def __init__(self, db: Session):
        super().__init__(AuditLog, db)

    def get_by_user_id(self, user_id: int) -> List[AuditLog]:
        """Fetch audit log trails for a specific user."""
        stmt = select(AuditLog).where(AuditLog.user_id == user_id).order_by(AuditLog.created_at.desc())
        return list(self.db.scalars(stmt).all())

    def get_all_filtered(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource: Optional[str] = None,
        search: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[AuditLog], int]:
        """Fetch audit logs with DB-level search, filtering, sorting, pagination, and total count calculation."""
        from sqlalchemy import func
        from app.core.pagination import apply_safe_sorting

        stmt = select(AuditLog)

        if user_id is not None:
            stmt = stmt.where(AuditLog.user_id == user_id)
        if action:
            stmt = stmt.where(AuditLog.action.ilike(f"%{action.strip()}%"))
        if resource:
            stmt = stmt.where(AuditLog.resource.ilike(f"%{resource.strip()}%"))
        if date_from:
            stmt = stmt.where(AuditLog.created_at >= date_from)
        if date_to:
            stmt = stmt.where(AuditLog.created_at <= date_to)

        if search:
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                (AuditLog.action.ilike(search_pattern))
                | (AuditLog.resource.ilike(search_pattern))
                | (AuditLog.details.ilike(search_pattern))
                | (AuditLog.user_name.ilike(search_pattern))
            )

        # Count total matching records before offset/limit
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = self.db.scalar(count_stmt) or 0

        # Apply safe sorting
        allowlist = {
            "id": AuditLog.id,
            "created_at": AuditLog.created_at,
            "action": AuditLog.action,
            "resource": AuditLog.resource,
        }
        stmt = apply_safe_sorting(stmt, AuditLog, sort_by, sort_order, allowlist, AuditLog.created_at.desc())

        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        logs = list(self.db.scalars(stmt).all())
        return logs, total_count
