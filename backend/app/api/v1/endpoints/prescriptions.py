"""Digital Prescriptions (e-Rx) API Endpoints with Domain-Level Ownership & Role Protection."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.pagination import PaginationParams, add_pagination_headers

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.prescription import PrescriptionBase, PrescriptionCreate, PrescriptionResponse
from app.services.audit_log import AuditLogService
from app.services.prescription import PrescriptionService

router = APIRouter()


@router.get("/status")
def prescriptions_status():
    """Placeholder health endpoint for prescriptions router."""
    return {"module": "prescriptions", "status": "active"}


@router.post("/", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
def create_prescription(
    prescription_in: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new digital prescription with line items after role and relationship authorization."""
    prescription_service = PrescriptionService(db)
    try:
        created_rx = prescription_service.create_prescription(prescription_in, current_user=current_user)
        AuditLogService(db).log_action(
            action="PRESCRIPTION_CREATE",
            user=current_user,
            resource=f"Prescription #{created_rx.id}",
            details=f"Issued prescription #{created_rx.id} for Patient #{created_rx.patient_id}",
        )
        return created_rx
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


@router.get("/", response_model=List[PrescriptionResponse])
def read_prescriptions(
    response: Response,
    patient_id: Optional[int] = Query(None, description="Filter by patient ID"),
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    search: Optional[str] = Query(None, description="Search diagnosis or notes"),
    params: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve list of prescriptions filtered by role domain ownership, DB-level search, filters, sorting, and pagination."""
    prescription_service = PrescriptionService(db)
    try:
        prescriptions, total = prescription_service.list_prescriptions(
            current_user=current_user,
            patient_id=patient_id,
            doctor_id=doctor_id,
            search=search,
            skip=params.skip,
            limit=params.limit,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
        )
        add_pagination_headers(response, total, params.skip, params.limit)
        return prescriptions
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get("/{prescription_id}", response_model=PrescriptionResponse)
def read_prescription(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single prescription by ID with role domain ownership verification."""
    prescription_service = PrescriptionService(db)
    try:
        return prescription_service.get_by_id(prescription_id, current_user=current_user)
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


@router.put("/{prescription_id}", response_model=PrescriptionResponse)
def update_prescription(
    prescription_id: int,
    prescription_in: PrescriptionBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update prescription diagnosis or notes after role domain ownership validation."""
    prescription_service = PrescriptionService(db)
    try:
        updated_rx = prescription_service.update_prescription(prescription_id, prescription_in, current_user=current_user)
        AuditLogService(db).log_action(
            action="PRESCRIPTION_UPDATE",
            user=current_user,
            resource=f"Prescription #{prescription_id}",
            details=f"Updated details for Prescription #{prescription_id}",
        )
        return updated_rx
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


@router.delete("/{prescription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prescription(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a prescription by ID after role domain ownership validation."""
    prescription_service = PrescriptionService(db)
    try:
        prescription_service.delete_prescription(prescription_id, current_user=current_user)
        AuditLogService(db).log_action(
            action="PRESCRIPTION_DELETE",
            user=current_user,
            resource=f"Prescription #{prescription_id}",
            details=f"Deleted Prescription #{prescription_id}",
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
