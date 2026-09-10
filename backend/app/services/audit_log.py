import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.schemas.audit_log import AuditLogCreate

logger = logging.getLogger(__name__)

SENSITIVE_KEYS = {"password", "hashed_password", "access_token", "refresh_token", "secret", "token"}


class AuditLogService:
    """Business service governing Audit & Compliance Logging."""

    def __init__(self, db: Session):
        self.db = db
        self.audit_repo = AuditLogRepository(db)

    def log_event(self, schema: AuditLogCreate) -> AuditLog:
        """Persist a security or compliance event directly."""
        log_entry = AuditLog(
            user_id=schema.user_id,
            user_name=schema.user_name,
            role=schema.role,
            action=schema.action,
            resource=schema.resource,
            details=schema.details,
            ip_address=schema.ip_address,
        )
        return self.audit_repo.create(log_entry)

    def log_action(
        self,
        action: str,
        user: Optional[User] = None,
        resource: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
        unauthenticated_actor: Optional[str] = None,
    ) -> Optional[AuditLog]:
        """Safely record an audit event without corrupting primary business transactions."""
        try:
            user_id = user.id if user else None
            user_name = user.full_name if user else unauthenticated_actor
            role = user.role.value if (user and hasattr(user.role, "value")) else (str(user.role) if user else None)

            # Scrub sensitive keywords from details string
            clean_details = details
            if clean_details:
                for key in SENSITIVE_KEYS:
                    if key in clean_details.lower():
                        clean_details = "[Redacted Sensitive Credentials]"
                        break

            schema = AuditLogCreate(
                user_id=user_id,
                user_name=user_name,
                role=role,
                action=action,
                resource=resource,
                details=clean_details,
                ip_address=ip_address,
            )
            return self.log_event(schema)
        except Exception as e:
            logger.warning(f"Failed to record audit log for action '{action}': {e}")
            return None

    def list_logs(
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
        """Fetch audit log records with DB-level search, filters, sorting, and pagination (Admin Only)."""
        if date_from and date_to and date_from > date_to:
            raise ValueError("date_from cannot be after date_to.")

        return self.audit_repo.get_all_filtered(
            user_id=user_id,
            action=action,
            resource=resource,
            search=search,
            date_from=date_from,
            date_to=date_to,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    def get_log_by_id(self, log_id: int) -> Optional[AuditLog]:
        """Retrieve a specific audit log entry by ID (Admin Only)."""
        return self.audit_repo.get_by_id(log_id)
