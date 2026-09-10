"""Appointments Management API Endpoints with Domain-Level Data Ownership, Schedule Engine & Role Protection."""

from datetime import date
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.pagination import PaginationParams, add_pagination_headers
from app.core.security import get_current_user, require_receptionist
from app.db.session import get_db
from app.models.enums import AppointmentStatus
from app.models.user import User
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentStatusUpdate,
    AppointmentUpdate,
    ReceptionistDashboardResponse,
)
from app.services.appointment import AppointmentService
from app.services.audit_log import AuditLogService

router = APIRouter()


@router.get("/status")
def appointments_status():
    """Placeholder health endpoint for appointments router."""
    return {"module": "appointments", "status": "active"}


@router.get("/receptionist-dashboard", response_model=ReceptionistDashboardResponse)
def get_receptionist_dashboard(
    target_date: Optional[date] = Query(None, description="Operational target date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_receptionist),
):
    """Retrieve database-aggregated operational front-desk metrics and queue summary (Receptionist & Admin)."""
    appointment_service = AppointmentService(db)
    try:
        return appointment_service.get_receptionist_dashboard(target_date=target_date, current_user=current_user)
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def book_appointment(
    appointment_in: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Book a new consultation appointment with domain ownership and scheduling engine validation."""
    appointment_service = AppointmentService(db)
    try:
        created_apt = appointment_service.book_appointment(appointment_in, current_user=current_user)
        AuditLogService(db).log_action(
            action="APPOINTMENT_CREATE",
            user=current_user,
            resource=f"Appointment #{created_apt.id}",
            details=f"Booked appointment #{created_apt.id} for Patient #{created_apt.patient_id} with Doctor #{created_apt.doctor_id}",
        )
        return created_apt
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
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


@router.get("/", response_model=List[AppointmentResponse])
def read_appointments(
    response: Response,
    patient_id: Optional[int] = Query(None, description="Filter by patient ID"),
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    status: Optional[AppointmentStatus] = Query(None, description="Filter by appointment status"),
    search: Optional[str] = Query(None, description="Search reason, patient name, or doctor name"),
    date_from: Optional[date] = Query(None, description="Filter appointments from date"),
    date_to: Optional[date] = Query(None, description="Filter appointments to date"),
    params: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve list of appointments filtered by role domain ownership, DB-level search, filters, sorting, and pagination."""
    appointment_service = AppointmentService(db)
    try:
        appointments, total = appointment_service.list_appointments(
            current_user=current_user,
            patient_id=patient_id,
            doctor_id=doctor_id,
            status=status,
            search=search,
            date_from=date_from,
            date_to=date_to,
            skip=params.skip,
            limit=params.limit,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
        )
        add_pagination_headers(response, total, params.skip, params.limit)
        return appointments
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def read_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single appointment by ID with role domain ownership enforcement."""
    appointment_service = AppointmentService(db)
    try:
        return appointment_service.get_by_id(appointment_id, current_user=current_user)
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


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    appointment_in: Union[AppointmentUpdate, AppointmentStatusUpdate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update appointment details or status after schedule and domain ownership validation."""
    appointment_service = AppointmentService(db)
    try:
        updated_apt = appointment_service.update_appointment(appointment_id, appointment_in, current_user=current_user)
        is_cancel = getattr(appointment_in, "status", None) and str(getattr(appointment_in, "status")).lower() in ["cancelled", "appointmentstatus.cancelled"]
        action_name = "APPOINTMENT_CANCEL" if is_cancel else "APPOINTMENT_UPDATE"
        AuditLogService(db).log_action(
            action=action_name,
            user=current_user,
            resource=f"Appointment #{appointment_id}",
            details=f"Updated status/details for Appointment #{appointment_id}",
        )
        return updated_apt
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
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


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel / Delete an appointment by ID after role domain ownership validation."""
    appointment_service = AppointmentService(db)
    try:
        appointment_service.delete_appointment(appointment_id, current_user=current_user)
        AuditLogService(db).log_action(
            action="APPOINTMENT_DELETE",
            user=current_user,
            resource=f"Appointment #{appointment_id}",
            details=f"Deleted appointment #{appointment_id}",
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
