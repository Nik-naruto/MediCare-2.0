"""Doctors Management API Endpoints."""

from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.pagination import PaginationParams, add_pagination_headers

from app.db.session import get_db
from app.core.security import get_current_user, get_optional_current_user, require_doctor
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.doctor import (
    DoctorAvailabilityResponse,
    DoctorCreate,
    DoctorResponse,
    DoctorUpdate,
)
from app.services.audit_log import AuditLogService
from app.services.doctor import DoctorService

router = APIRouter()


@router.get("/status")
def doctors_status():
    """Placeholder health endpoint for doctors router."""
    return {"module": "doctors", "status": "active"}


@router.post("/", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(
    doctor_in: DoctorCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Onboard a new Doctor profile linked to an existing User account."""
    doctor_service = DoctorService(db)
    try:
        created_doctor = doctor_service.onboard_doctor(doctor_in)
        AuditLogService(db).log_action(
            action="DOCTOR_CREATE",
            user=current_user,
            resource=f"Doctor #{created_doctor.id}",
            details=f"Onboarded doctor profile for User #{created_doctor.user_id} with specialty {created_doctor.specialty}",
        )
        return created_doctor
    except ValueError as e:
        error_msg = str(e)
        if "does not exist" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=error_msg,
        )


@router.get("/", response_model=List[DoctorResponse])
def read_doctors(
    response: Response,
    search: Optional[str] = Query(None, description="Search doctor name, specialty, or qualification"),
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    specialty: Optional[str] = Query(None, description="Filter by specialty"),
    is_available: Optional[bool] = Query(None, description="Filter by availability status"),
    params: PaginationParams = Depends(),
    db: Session = Depends(get_db),
):
    """Retrieve list of doctors with DB-level search, filtering, sorting, and pagination."""
    doctor_service = DoctorService(db)
    doctors, total = doctor_service.list_doctors(
        search=search,
        department_id=department_id,
        specialty=specialty,
        is_available=is_available,
        skip=params.skip,
        limit=params.limit,
        sort_by=params.sort_by,
        sort_order=params.sort_order,
    )
    add_pagination_headers(response, total, params.skip, params.limit)
    return doctors


@router.get("/me", response_model=DoctorResponse)
def read_current_doctor(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor),
):
    """Retrieve profile of currently authenticated doctor."""
    doctor_service = DoctorService(db)
    doctor = doctor_service.get_by_user_id(current_user.id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found for authenticated account.",
        )
    return doctor


@router.put("/me", response_model=DoctorResponse)
def update_current_doctor(
    doctor_in: DoctorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor),
):
    """Update profile details of currently authenticated doctor."""
    doctor_service = DoctorService(db)
    doctor = doctor_service.get_by_user_id(current_user.id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found for authenticated account.",
        )
    try:
        updated_doctor = doctor_service.update_doctor(doctor.id, doctor_in)
        AuditLogService(db).log_action(
            action="DOCTOR_UPDATE",
            user=current_user,
            resource=f"Doctor #{doctor.id}",
            details=f"Doctor updated own profile details (Doctor #{doctor.id})",
        )
        return updated_doctor
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )


@router.get("/{doctor_id}/availability", response_model=DoctorAvailabilityResponse)
def get_doctor_availability(
    doctor_id: int,
    date_from: date = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """Retrieve doctor's calculated slot availability across date range."""
    doctor_service = DoctorService(db)
    try:
        return doctor_service.get_doctor_availability(
            doctor_id=doctor_id,
            date_from=date_from,
            date_to=date_to,
        )
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )


@router.get("/{doctor_id}", response_model=DoctorResponse)
def read_doctor(doctor_id: int, db: Session = Depends(get_db)):
    """Retrieve a single doctor profile by ID."""
    doctor_service = DoctorService(db)
    doctor = doctor_service.get_by_id(doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with ID {doctor_id} not found",
        )
    return doctor


@router.put("/{doctor_id}", response_model=DoctorResponse)
def update_doctor(
    doctor_id: int,
    doctor_in: DoctorUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Update doctor profile details."""
    doctor_service = DoctorService(db)
    doctor = doctor_service.get_by_id(doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with ID {doctor_id} not found",
        )

    # Security check: If authenticated, enforce role & ownership protections
    if current_user:
        if current_user.role == UserRole.DOCTOR:
            if doctor.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to update another doctor's profile.",
                )
        elif current_user.role not in (UserRole.ADMIN, UserRole.DOCTOR):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update doctor clinical profiles.",
            )

    try:
        updated_doctor = doctor_service.update_doctor(doctor_id, doctor_in)
        AuditLogService(db).log_action(
            action="DOCTOR_UPDATE",
            user=current_user,
            resource=f"Doctor #{doctor_id}",
            details=f"Updated profile details for Doctor #{doctor_id}",
        )
        return updated_doctor
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )


@router.post("/{doctor_id}/upload-photo", response_model=DoctorResponse)
async def upload_doctor_photo(
    doctor_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload or update doctor profile photo. Only doctor (own profile) or Admin allowed."""
    doctor_service = DoctorService(db)
    doctor = doctor_service.get_by_id(doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with ID {doctor_id} not found",
        )

    # Authorization Check
    if current_user.role == UserRole.DOCTOR:
        if doctor.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update photo for another doctor's profile.",
            )
    elif current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update doctor profile photo.",
        )

    # Read and validate file content
    content = await file.read()
    max_size = 5 * 1024 * 1024  # 5 MB
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum allowed limit of 5 MB.",
        )

    # Magic Bytes Validation
    ext = None
    if len(content) >= 4:
        if content.startswith(b"\xff\xd8\xff"):
            ext = ".jpg"
        elif content.startswith(b"\x89PNG"):
            ext = ".png"
        elif content.startswith(b"RIFF") and b"WEBP" in content[8:16]:
            ext = ".webp"

    if not ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image format. Only JPEG, PNG, and WebP images are allowed.",
        )

    try:
        updated_doctor = doctor_service.update_doctor_photo(doctor_id, content, ext)
        AuditLogService(db).log_action(
            action="DOCTOR_PHOTO_UPLOAD",
            user=current_user,
            resource=f"Doctor #{doctor_id}",
            details=f"Uploaded profile photo for Doctor #{doctor_id}",
        )
        return updated_doctor
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{doctor_id}/photo", response_model=DoctorResponse)
def delete_doctor_photo(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete doctor profile photo and restore initials fallback."""
    doctor_service = DoctorService(db)
    doctor = doctor_service.get_by_id(doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with ID {doctor_id} not found",
        )

    # Authorization Check
    if current_user.role == UserRole.DOCTOR:
        if doctor.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete photo for another doctor's profile.",
            )
    elif current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete doctor profile photo.",
        )

    try:
        updated_doctor = doctor_service.delete_doctor_photo(doctor_id)
        AuditLogService(db).log_action(
            action="DOCTOR_PHOTO_DELETE",
            user=current_user,
            resource=f"Doctor #{doctor_id}",
            details=f"Deleted profile photo for Doctor #{doctor_id}",
        )
        return updated_doctor
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Delete a doctor profile by ID."""
    doctor_service = DoctorService(db)
    try:
        doctor_service.delete_doctor(doctor_id)
        AuditLogService(db).log_action(
            action="DOCTOR_DELETE",
            user=current_user,
            resource=f"Doctor #{doctor_id}",
            details=f"Deleted profile for Doctor #{doctor_id}",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
