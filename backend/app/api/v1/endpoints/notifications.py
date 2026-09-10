"""Notification System API Endpoints with Domain-Level Ownership & Role Protection."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.pagination import PaginationParams, add_pagination_headers

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.notification import NotificationCreate, NotificationResponse
from app.services.audit_log import AuditLogService
from app.services.notification import NotificationService

router = APIRouter()


@router.get("/status")
def notifications_status():
    """Placeholder health endpoint for notifications router."""
    return {"module": "notifications", "status": "active"}


@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def create_notification(
    notification_in: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new notification alert for a user after role authorization."""
    notification_service = NotificationService(db)
    try:
        created_notif = notification_service.create_notification(notification_in, current_user=current_user)
        AuditLogService(db).log_action(
            action="NOTIFICATION_CREATE",
            user=current_user,
            resource=f"Notification #{created_notif.id}",
            details=f"Created notification '{created_notif.title}' for User #{created_notif.user_id}",
        )
        return created_notif
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get("/", response_model=List[NotificationResponse])
def read_notifications(
    response: Response,
    notification_type: Optional[str] = Query(None, description="Filter by notification type"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    search: Optional[str] = Query(None, description="Search title or message"),
    params: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve list of notifications filtered by user ownership, DB-level search, filters, sorting, and pagination."""
    notification_service = NotificationService(db)
    try:
        notifications, total = notification_service.list_notifications(
            current_user=current_user,
            notification_type=notification_type,
            is_read=is_read,
            search=search,
            skip=params.skip,
            limit=params.limit,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
        )
        add_pagination_headers(response, total, params.skip, params.limit)
        return notifications
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get("/{notification_id}", response_model=NotificationResponse)
def read_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single notification by ID with user ownership verification."""
    notification_service = NotificationService(db)
    try:
        return notification_service.get_by_id(notification_id, current_user=current_user)
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.put("/{notification_id}", response_model=NotificationResponse)
def update_notification(
    notification_id: int,
    is_read: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark notification as read/unread after user ownership validation."""
    notification_service = NotificationService(db)
    try:
        updated_notif = notification_service.update_notification(notification_id, is_read=is_read, current_user=current_user)
        AuditLogService(db).log_action(
            action="NOTIFICATION_UPDATE",
            user=current_user,
            resource=f"Notification #{notification_id}",
            details=f"Updated notification #{notification_id} read status to {is_read}",
        )
        return updated_notif
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification by ID after role domain ownership validation."""
    notification_service = NotificationService(db)
    try:
        notification_service.delete_notification(notification_id, current_user=current_user)
        AuditLogService(db).log_action(
            action="NOTIFICATION_DELETE",
            user=current_user,
            resource=f"Notification #{notification_id}",
            details=f"Deleted Notification #{notification_id}",
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
