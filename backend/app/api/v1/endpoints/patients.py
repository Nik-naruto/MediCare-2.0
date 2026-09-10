"""Patients Management API Endpoints with Domain-Level Ownership Protection."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.pagination import PaginationParams, add_pagination_headers
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.enums import Gender
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientResponse, PatientUpdate
from app.services.audit_log import AuditLogService
from app.services.patient import PatientService

router = APIRouter()


@router.get("/status")
def patients_status():
    """Placeholder health endpoint for patients router."""
    return {"module": "patients", "status": "active"}


@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_in: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new Patient profile linked to an existing User account."""
    patient_service = PatientService(db)
    try:
        created_patient = patient_service.register_patient_profile(patient_in, current_user=current_user)
        AuditLogService(db).log_action(
            action="PATIENT_CREATE",
            user=current_user,
            resource=f"Patient #{created_patient.id}",
            details=f"Registered patient profile for User #{created_patient.user_id}",
        )
        return created_patient
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
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


@router.get("/", response_model=List[PatientResponse])
def read_patients(
    response: Response,
    search: Optional[str] = Query(None, description="Search patient name, email, or phone"),
    gender: Optional[Gender] = Query(None, description="Filter by gender"),
    blood_group: Optional[str] = Query(None, description="Filter by blood group"),
    params: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve list of patients filtered by domain ownership, DB-level search, filters, sorting, and pagination."""
    patient_service = PatientService(db)
    patients, total = patient_service.list_patients(
        current_user=current_user,
        search=search,
        gender=gender.value if hasattr(gender, "value") and gender else gender,
        blood_group=blood_group,
        skip=params.skip,
        limit=params.limit,
        sort_by=params.sort_by,
        sort_order=params.sort_order,
    )
    add_pagination_headers(response, total, params.skip, params.limit)
    return patients


@router.get("/{patient_id}", response_model=PatientResponse)
def read_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single patient profile by ID with ownership enforcement."""
    patient_service = PatientService(db)
    try:
        return patient_service.get_by_id(patient_id, current_user=current_user)
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


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    patient_in: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update patient profile details after ownership validation."""
    patient_service = PatientService(db)
    try:
        updated_patient = patient_service.update_patient(patient_id, patient_in, current_user=current_user)
        AuditLogService(db).log_action(
            action="PATIENT_UPDATE",
            user=current_user,
            resource=f"Patient #{patient_id}",
            details=f"Updated profile details for Patient #{patient_id}",
        )
        return updated_patient
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


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a patient profile by ID after ownership validation."""
    patient_service = PatientService(db)
    try:
        patient_service.delete_patient(patient_id, current_user=current_user)
        AuditLogService(db).log_action(
            action="PATIENT_DELETE",
            user=current_user,
            resource=f"Patient #{patient_id}",
            details=f"Deleted profile for Patient #{patient_id}",
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
