"""Pathology & Lab Diagnostics API Endpoints with Domain-Level Ownership & Role Protection."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.pagination import PaginationParams, add_pagination_headers
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.enums import LabReportStatus
from app.models.user import User
from app.schemas.lab_report import LabReportCreate, LabReportResponse, LabReportUpdate
from app.services.audit_log import AuditLogService
from app.services.lab_report import LabReportService

router = APIRouter()


@router.get("/status")
def lab_reports_status():
    """Placeholder health endpoint for lab reports router."""
    return {"module": "lab_reports", "status": "active"}


@router.post("/", response_model=LabReportResponse, status_code=status.HTTP_201_CREATED)
def create_lab_report(
    report_in: LabReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Request a new pathology lab report for a patient after role and relationship authorization."""
    lab_service = LabReportService(db)
    try:
        created_lab = lab_service.request_lab_report(report_in, current_user=current_user)
        AuditLogService(db).log_action(
            action="LAB_REPORT_CREATE",
            user=current_user,
            resource=f"LabReport #{created_lab.id}",
            details=f"Requested lab report '{created_lab.test_name}' for Patient #{created_lab.patient_id}",
        )
        return created_lab
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


@router.get("/", response_model=List[LabReportResponse])
def read_lab_reports(
    response: Response,
    patient_id: Optional[int] = Query(None, description="Filter by patient ID"),
    status_filter: Optional[LabReportStatus] = Query(None, alias="status", description="Filter by lab report status"),
    search: Optional[str] = Query(None, description="Search test_name, prescribed_by, or result_summary"),
    params: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve list of lab reports filtered by role domain ownership, DB-level search, filters, sorting, and pagination."""
    lab_service = LabReportService(db)
    try:
        reports, total = lab_service.list_reports(
            current_user=current_user,
            patient_id=patient_id,
            status=status_filter.value if hasattr(status_filter, "value") and status_filter else status_filter,
            search=search,
            skip=params.skip,
            limit=params.limit,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
        )
        add_pagination_headers(response, total, params.skip, params.limit)
        return reports
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get("/{report_id}", response_model=LabReportResponse)
def read_lab_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single lab report by ID with role domain ownership verification."""
    lab_service = LabReportService(db)
    try:
        return lab_service.get_by_id(report_id, current_user=current_user)
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


@router.put("/{report_id}", response_model=LabReportResponse)
def update_lab_report(
    report_id: int,
    report_in: LabReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update lab report status or results after role domain ownership validation."""
    lab_service = LabReportService(db)
    try:
        updated_lab = lab_service.update_report(report_id, report_in, current_user=current_user)
        AuditLogService(db).log_action(
            action="LAB_REPORT_UPDATE",
            user=current_user,
            resource=f"LabReport #{report_id}",
            details=f"Updated status/results for LabReport #{report_id}",
        )
        return updated_lab
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


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lab_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a lab report by ID after role domain ownership validation."""
    lab_service = LabReportService(db)
    try:
        lab_service.delete_report(report_id, current_user=current_user)
        AuditLogService(db).log_action(
            action="LAB_REPORT_DELETE",
            user=current_user,
            resource=f"LabReport #{report_id}",
            details=f"Deleted LabReport #{report_id}",
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
