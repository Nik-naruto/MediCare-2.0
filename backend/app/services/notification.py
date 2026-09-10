"""Notification Business Service with Domain-Level Ownership & Role Authorization."""

from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.enums import UserRole
from app.models.notification import Notification
from app.models.user import User
from app.repositories.notification import NotificationRepository
from app.schemas.notification import NotificationCreate


class NotificationService:
    """Business service governing Notification delivery logic and domain authorization."""

    def __init__(self, db: Session):
        self.db = db
        self.notification_repo = NotificationRepository(db)

    def create_notification(self, schema: NotificationCreate, current_user: Optional[User] = None) -> Notification:
        """Create and queue notification for a user after role authorization."""
        if current_user:
            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to create notifications.")

            if current_user.role == UserRole.DOCTOR:
                raise PermissionError("Access denied: Doctors are not permitted to create notifications.")

            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to create notifications.")

        new_notification = Notification(
            user_id=schema.user_id,
            title=schema.title,
            message=schema.message,
            notification_type=schema.notification_type,
            is_read=False,
        )
        return self.notification_repo.create(new_notification)

    def list_notifications(
        self,
        current_user: Optional[User] = None,
        notification_type: Optional[str] = None,
        is_read: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[Notification], int]:
        """Fetch list of notifications filtered by user ownership, DB-level search, filters, sorting, and pagination."""
        if not current_user:
            return [], 0

        target_user_id = current_user.id
        return self.notification_repo.get_all_filtered(
            user_id=target_user_id,
            notification_type=notification_type,
            is_read=is_read,
            search=search,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    def get_by_id(self, notification_id: int, current_user: Optional[User] = None) -> Notification:
        """Fetch notification by ID with user ownership verification."""
        notification = self.notification_repo.get_by_id(notification_id)
        if not notification:
            raise ValueError(f"Notification with ID {notification_id} not found.")

        if current_user:
            if current_user.role != UserRole.ADMIN:
                if notification.user_id != current_user.id:
                    raise PermissionError("Access denied: You are not authorized to view another user's notification.")

        return notification

    def update_notification(
        self, notification_id: int, is_read: bool = True, current_user: Optional[User] = None
    ) -> Notification:
        """Update notification read status after user ownership validation."""
        notification = self.get_by_id(notification_id, current_user=current_user)

        return self.notification_repo.update(notification, {"is_read": is_read})

    def delete_notification(self, notification_id: int, current_user: Optional[User] = None) -> bool:
        """Delete notification by ID after role permission and user ownership validation."""
        if current_user:
            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to delete notifications.")

            if current_user.role == UserRole.DOCTOR:
                raise PermissionError("Access denied: Doctors are not permitted to delete notifications.")

            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to delete notifications.")

        notification = self.get_by_id(notification_id, current_user=current_user)

        return self.notification_repo.delete(notification.id)
