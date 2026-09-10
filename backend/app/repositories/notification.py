"""Notification Data Repository."""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    """Repository handling database queries for User Notifications."""

    def __init__(self, db: Session):
        super().__init__(Notification, db)

    def get_by_user_id(self, user_id: int) -> List[Notification]:
        """Fetch all notifications for a specific user."""
        stmt = select(Notification).where(Notification.user_id == user_id)
        return list(self.db.scalars(stmt).all())

    def get_all_filtered(
        self,
        user_id: int,
        notification_type: Optional[str] = None,
        is_read: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[Notification], int]:
        """Fetch user notifications with ownership enforcement, DB-level search, filtering, sorting, and pagination."""
        from sqlalchemy import func
        from app.core.pagination import apply_safe_sorting

        stmt = select(Notification).where(Notification.user_id == user_id)

        if notification_type:
            stmt = stmt.where(Notification.notification_type.ilike(f"%{notification_type.strip()}%"))
        if is_read is not None:
            stmt = stmt.where(Notification.is_read == is_read)

        if search:
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                (Notification.title.ilike(search_pattern))
                | (Notification.message.ilike(search_pattern))
            )

        # Count total matching records before offset/limit
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = self.db.scalar(count_stmt) or 0

        # Apply safe sorting
        allowlist = {
            "id": Notification.id,
            "created_at": Notification.created_at,
            "notification_type": Notification.notification_type,
            "is_read": Notification.is_read,
        }
        stmt = apply_safe_sorting(stmt, Notification, sort_by, sort_order, allowlist, Notification.created_at.desc())

        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        notifications = list(self.db.scalars(stmt).all())
        return notifications, total_count
