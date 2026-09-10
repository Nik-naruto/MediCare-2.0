"""Authentication & Authorization API Endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    get_current_user,
    get_optional_current_user,
    get_password_hash,
    require_admin,
    require_doctor,
)
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import (
    DevPasswordResetRequest,
    PasswordChangeRequest,
    UserCreate,
    UserResponse,
)
from app.services.audit_log import AuditLogService
from app.services.user import UserService


router = APIRouter()


@router.get("/status")
def auth_status():
    """Placeholder health endpoint for auth router."""
    return {"module": "auth", "status": "active"}


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    """Fetch profile of currently authenticated user."""
    return current_user


@router.get("/doctor-only", response_model=UserResponse)
def doctor_only_endpoint(current_user: User = Depends(require_doctor)):
    """Endpoint accessible only by Doctor or Admin roles."""
    return current_user


@router.get("/admin-only", response_model=UserResponse)
def admin_only_endpoint(current_user: User = Depends(require_admin)):
    """Endpoint accessible only by Admin role."""
    return current_user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Register a new user account (Patient, Doctor, Receptionist). Public registration cannot create Admin accounts."""
    if user_in.role == UserRole.ADMIN:
        from app.repositories.user import UserRepository
        user_repo = UserRepository(db)
        if user_repo.count_active_admins() > 0 and (not current_user or current_user.role != UserRole.ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Public registration cannot create Admin accounts.",
            )
    user_service = UserService(db)
    try:
        hashed_password = get_password_hash(user_in.password)
        created_user = user_service.create_user(user_in, hashed_password=hashed_password)
        AuditLogService(db).log_action(
            action="USER_REGISTER",
            user=current_user if current_user else created_user,
            resource=f"User #{created_user.id}",
            details=f"Registered account for email {created_user.email} with role {created_user.role.value}",
        )
        return created_user
    except ValueError as e:
        error_msg = str(e)
        if "already exists" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )


@router.post("/login", response_model=Token)
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Authenticate user with email and password, returning a JWT access token."""
    user_service = UserService(db)
    audit_service = AuditLogService(db)
    user = user_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        audit_service.log_action(
            action="LOGIN_FAILED",
            unauthenticated_actor=form_data.username,
            details=f"Failed login attempt for username {form_data.username}",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        audit_service.log_action(
            action="LOGIN_FAILED",
            user=user,
            details=f"Failed login attempt for inactive account {user.email}",
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    access_token = create_access_token(subject=user.id)
    audit_service.log_action(
        action="LOGIN_SUCCESS",
        user=user,
        resource=f"User #{user.id}",
        details=f"User {user.email} logged in successfully",
    )
    return Token(access_token=access_token, token_type="bearer")


@router.post("/change-password")
def change_password(
    pwd_in: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Allow an authenticated user to change their own password."""
    user_service = UserService(db)
    try:
        new_hashed_password = get_password_hash(pwd_in.new_password)
        user_service.change_password(
            user_id=current_user.id,
            current_password=pwd_in.current_password,
            new_hashed_password=new_hashed_password,
        )
        AuditLogService(db).log_action(
            action="PASSWORD_CHANGE",
            user=current_user,
            resource=f"User #{current_user.id}",
            details="User updated account password",
        )
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/dev-reset-password")
def dev_reset_password(
    reset_in: DevPasswordResetRequest,
    db: Session = Depends(get_db),
):
    """[DEVELOPMENT ONLY] Endpoint to reset an existing user's password by email."""
    from app.core.config import settings
    if not settings.ENABLE_DEV_ENDPOINTS or settings.ENVIRONMENT.lower() == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Development password reset endpoint is disabled in production environment.",
        )
    user_service = UserService(db)
    try:
        new_hashed_password = get_password_hash(reset_in.new_password)
        user_service.dev_reset_password(
            email=reset_in.email,
            new_hashed_password=new_hashed_password,
        )
        AuditLogService(db).log_action(
            action="DEV_PASSWORD_RESET",
            unauthenticated_actor=reset_in.email,
            details=f"Development password reset for email {reset_in.email}",
        )
        return {"message": f"Password reset successfully for {reset_in.email}"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
