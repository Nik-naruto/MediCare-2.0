"""Electronic Medical Records API Endpoints with Domain-Level Ownership & Role Protection."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.pagination import PaginationParams, add_pagination_headers

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.medical_record import MedicalRecordCreate, MedicalRecordResponse, MedicalRecordUpdate
from app.services.audit_log import AuditLogService
from app.services.medical_record import MedicalRecordService

router = APIRouter()


@router.get("/status")
def medical_records_status():
    """Placeholder health endpoint for medical records router."""
    return {"module": "medical_records", "status": "active"}


@router.post("/", response_model=MedicalRecordResponse, status_code=status.HTTP_201_CREATED)
def create_medical_record(
    record_in: MedicalRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new medical record for a patient after role and relationship authorization."""
    record_service = MedicalRecordService(db)
    try:
        created_rec = record_service.create_medical_record(record_in, current_user=current_user)
        AuditLogService(db).log_action(
            action="MEDICAL_RECORD_CREATE",
            user=current_user,
            resource=f"MedicalRecord #{created_rec.id}",
            details=f"Created medical record #{created_rec.id} for Patient #{created_rec.patient_id}",
        )
        return created_rec
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


@router.get("/", response_model=List[MedicalRecordResponse])
def read_medical_records(
    response: Response,
    patient_id: Optional[int] = Query(None, description="Filter by patient ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search title, category, doctor_name, diagnosis"),
    params: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve list of medical records filtered by role domain ownership, DB-level search, filters, sorting, and pagination."""
    record_service = MedicalRecordService(db)
    try:
        records, total = record_service.list_records(
            current_user=current_user,
            patient_id=patient_id,
            category=category,
            search=search,
            skip=params.skip,
            limit=params.limit,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
        )
        add_pagination_headers(response, total, params.skip, params.limit)
        return records
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get("/{record_id}", response_model=MedicalRecordResponse)
def read_medical_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single medical record by ID with role domain ownership verification."""
    record_service = MedicalRecordService(db)
    try:
        return record_service.get_by_id(record_id, current_user=current_user)
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


@router.put("/{record_id}", response_model=MedicalRecordResponse)
def update_medical_record(
    record_id: int,
    record_in: MedicalRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update medical record details after role domain ownership validation."""
    record_service = MedicalRecordService(db)
    try:
        updated_rec = record_service.update_record(record_id, record_in, current_user=current_user)
        AuditLogService(db).log_action(
            action="MEDICAL_RECORD_UPDATE",
            user=current_user,
            resource=f"MedicalRecord #{record_id}",
            details=f"Updated details for MedicalRecord #{record_id}",
        )
        return updated_rec
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


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medical_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a medical record by ID after role domain ownership validation."""
    record_service = MedicalRecordService(db)
    try:
        record_service.delete_record(record_id, current_user=current_user)
        AuditLogService(db).log_action(
            action="MEDICAL_RECORD_DELETE",
            user=current_user,
            resource=f"MedicalRecord #{record_id}",
            details=f"Deleted MedicalRecord #{record_id}",
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
