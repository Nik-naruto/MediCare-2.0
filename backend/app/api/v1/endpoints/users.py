"""Administrative User Management API Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.pagination import PaginationParams, add_pagination_headers

from app.core.security import get_current_user, require_admin
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserResponse,
    UserRoleUpdate,
    UserStatusUpdate,
    UserUpdate,
)
from app.services.audit_log import AuditLogService
from app.services.user import UserService

router = APIRouter()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new user account with any role (Admin Only)."""
    from app.core.security import get_password_hash
    user_service = UserService(db)
    try:
        hashed_password = get_password_hash(user_in.password)
        created_user = user_service.create_user(user_in, hashed_password=hashed_password)
        AuditLogService(db).log_action(
            action="USER_CREATE",
            user=current_user,
            resource=f"User #{created_user.id}",
            details=f"Admin created user {created_user.email} with role {created_user.role.value}",
        )
        return created_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )


@router.get("/", response_model=List[UserResponse])
def list_users(
    response: Response,
    search: Optional[str] = Query(None, description="Search by full_name, email, or phone"),
    role: Optional[UserRole] = Query(None, description="Filter users by role"),
    is_active: Optional[bool] = Query(None, description="Filter users by active status"),
    params: PaginationParams = Depends(),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all registered users with DB-level search, filtering, sorting, and pagination (Admin Only)."""
    user_service = UserService(db)
    users, total = user_service.list_users(
        search=search,
        role=role,
        is_active=is_active,
        skip=params.skip,
        limit=params.limit,
        sort_by=params.sort_by,
        sort_order=params.sort_order,
    )
    add_pagination_headers(response, total, params.skip, params.limit)
    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Fetch details of a specific user by ID (Admin Only)."""
    user_service = UserService(db)
    user = user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user basic details. Admins can update any user; non-admin users can update only their own full_name and phone."""
    is_admin = current_user.role == UserRole.ADMIN
    if not is_admin:
        if current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only update your own user profile.",
            )
        # Non-admin users can ONLY update full_name and phone
        user_in = UserUpdate(
            full_name=user_in.full_name,
            phone=user_in.phone,
        )

    user_service = UserService(db)
    try:
        updated_user = user_service.update_user(user_id, user_in)
        AuditLogService(db).log_action(
            action="USER_UPDATE",
            user=current_user,
            resource=f"User #{user_id}",
            details=f"Updated profile details for User #{user_id}",
        )
        return updated_user
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.put("/{user_id}/role", response_model=UserResponse)
def change_user_role(
    user_id: int,
    role_in: UserRoleUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Change role of a user (Admin Only). Enforces last active admin protection."""
    user_service = UserService(db)
    try:
        updated_user = user_service.change_user_role(user_id, role_in.role)
        AuditLogService(db).log_action(
            action="USER_ROLE_CHANGE",
            user=current_user,
            resource=f"User #{user_id}",
            details=f"Admin changed role of User #{user_id} to {role_in.role.value}",
        )
        return updated_user
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.put("/{user_id}/status", response_model=UserResponse)
@router.patch("/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    status_in: UserStatusUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Activate or deactivate a user account (Admin Only). Enforces last active admin protection."""
    user_service = UserService(db)
    try:
        updated_user = user_service.set_user_status(user_id, status_in.is_active)
        AuditLogService(db).log_action(
            action="USER_STATUS_CHANGE",
            user=current_user,
            resource=f"User #{user_id}",
            details=f"Admin set account status of User #{user_id} to active={status_in.is_active}",
        )
        return updated_user
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)


@router.delete("/{user_id}", response_model=UserResponse)
def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Soft-deactivate user account to preserve historical medical data and audit trails (Admin Only)."""
    user_service = UserService(db)
    try:
        deleted_user = user_service.delete_user(user_id)
        AuditLogService(db).log_action(
            action="USER_DELETE",
            user=current_user,
            resource=f"User #{user_id}",
            details=f"Admin soft-deactivated User #{user_id}",
        )
        return deleted_user
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
