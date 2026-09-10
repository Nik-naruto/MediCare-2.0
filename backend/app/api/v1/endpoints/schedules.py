"""Doctor Schedules API Endpoints with Role Protection & Shift Validation."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.pagination import PaginationParams, add_pagination_headers

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.schedule import DoctorScheduleCreate, DoctorScheduleResponse, DoctorScheduleUpdate
from app.services.audit_log import AuditLogService
from app.services.schedule import DoctorScheduleService

router = APIRouter()


@router.get("/status")
def schedules_status():
    """Placeholder health endpoint for doctor schedules router."""
    return {"module": "schedules", "status": "active"}


@router.post("/", response_model=DoctorScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(
    schedule_in: DoctorScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new doctor availability schedule shift."""
    schedule_service = DoctorScheduleService(db)
    try:
        created_sched = schedule_service.create_schedule_slot(schedule_in, current_user=current_user)
        AuditLogService(db).log_action(
            action="SCHEDULE_CREATE",
            user=current_user,
            resource=f"Schedule #{created_sched.id}",
            details=f"Created schedule shift for Doctor #{created_sched.doctor_id} on {created_sched.day_of_week}",
        )
        return created_sched
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValueError as e:
        error_msg = str(e)
        if "does not exist" in error_msg.lower() or "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )


@router.get("/", response_model=List[DoctorScheduleResponse])
def read_schedules(
    response: Response,
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    day_of_week: Optional[str] = Query(None, description="Filter by day of week"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search day of week"),
    params: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve list of doctor schedule shifts with DB-level search, filtering, sorting, and pagination."""
    schedule_service = DoctorScheduleService(db)
    schedules, total = schedule_service.list_schedules(
        doctor_id=doctor_id,
        day_of_week=day_of_week,
        is_active=is_active,
        search=search,
        current_user=current_user,
        skip=params.skip,
        limit=params.limit,
        sort_by=params.sort_by,
        sort_order=params.sort_order,
    )
    add_pagination_headers(response, total, params.skip, params.limit)
    return schedules


@router.get("/{schedule_id}", response_model=DoctorScheduleResponse)
def read_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single doctor schedule shift by ID."""
    schedule_service = DoctorScheduleService(db)
    try:
        return schedule_service.get_by_id(schedule_id, current_user=current_user)
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


@router.put("/{schedule_id}", response_model=DoctorScheduleResponse)
def update_schedule(
    schedule_id: int,
    schedule_in: DoctorScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update doctor schedule shift details."""
    schedule_service = DoctorScheduleService(db)
    try:
        updated_sched = schedule_service.update_schedule(schedule_id, schedule_in, current_user=current_user)
        AuditLogService(db).log_action(
            action="SCHEDULE_UPDATE",
            user=current_user,
            resource=f"Schedule #{schedule_id}",
            details=f"Updated details for Schedule #{schedule_id}",
        )
        return updated_sched
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


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a doctor schedule shift by ID."""
    schedule_service = DoctorScheduleService(db)
    try:
        schedule_service.delete_schedule(schedule_id, current_user=current_user)
        AuditLogService(db).log_action(
            action="SCHEDULE_DELETE",
            user=current_user,
            resource=f"Schedule #{schedule_id}",
            details=f"Deleted Schedule #{schedule_id}",
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
