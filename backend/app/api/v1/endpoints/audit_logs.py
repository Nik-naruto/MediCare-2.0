"""Admin-Only Audit Logging & Compliance API Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.pagination import PaginationParams, add_pagination_headers

from app.core.security import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse
from app.services.audit_log import AuditLogService

router = APIRouter()


@router.get("/", response_model=List[AuditLogResponse])
def list_audit_logs(
    response: Response,
    user_id: Optional[int] = Query(None, description="Filter audit logs by actor User ID"),
    action: Optional[str] = Query(None, description="Filter audit logs by action substring"),
    resource: Optional[str] = Query(None, description="Filter audit logs by resource substring"),
    search: Optional[str] = Query(None, description="Search action, resource, details, or user_name"),
    date_from: Optional[str] = Query(None, description="Filter audit logs from timestamp (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter audit logs to timestamp (ISO format)"),
    params: PaginationParams = Depends(),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Retrieve system audit & compliance logs with DB-level search, filtering, sorting, and pagination (Admin Only)."""
    audit_service = AuditLogService(db)
    try:
        logs, total = audit_service.list_logs(
            user_id=user_id,
            action=action,
            resource=resource,
            search=search,
            date_from=date_from,
            date_to=date_to,
            skip=params.skip,
            limit=params.limit,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
        )
        add_pagination_headers(response, total, params.skip, params.limit)
        return logs
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/{audit_log_id}", response_model=AuditLogResponse)
def get_audit_log_by_id(
    audit_log_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Fetch details of a specific audit log record by ID (Admin Only)."""
    audit_service = AuditLogService(db)
    log_entry = audit_service.get_log_by_id(audit_log_id)
    if not log_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit log entry with ID {audit_log_id} not found.",
        )
    return log_entry
