"""Clinical Departments API Endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.pagination import PaginationParams, add_pagination_headers
from app.core.security import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate
from app.services.department import DepartmentService

router = APIRouter()


@router.get("/status")
def departments_status():
    """Placeholder health endpoint for departments router."""
    return {"module": "departments", "status": "active"}


@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_in: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new clinical department (Admin Only)."""
    dept_service = DepartmentService(db)
    try:
        return dept_service.create_department(dept_in)
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


@router.get("/", response_model=List[DepartmentResponse])
def read_departments(
    response: Response,
    search: Optional[str] = Query(None, description="Search department name or description"),
    params: PaginationParams = Depends(),
    db: Session = Depends(get_db),
):
    """Retrieve list of all clinical departments with DB-level search, sorting, and pagination."""
    dept_service = DepartmentService(db)
    departments, total = dept_service.list_all(
        search=search,
        skip=params.skip,
        limit=params.limit,
        sort_by=params.sort_by,
        sort_order=params.sort_order,
    )
    add_pagination_headers(response, total, params.skip, params.limit)
    return departments


@router.get("/{department_id}", response_model=DepartmentResponse)
def read_department(department_id: int, db: Session = Depends(get_db)):
    """Retrieve a single department by ID."""
    dept_service = DepartmentService(db)
    dept = dept_service.get_by_id(department_id)
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {department_id} not found",
        )
    return dept


@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    dept_in: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update department details (Admin Only)."""
    dept_service = DepartmentService(db)
    try:
        return dept_service.update_department(department_id, dept_in)
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg or "does not exist" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=error_msg,
        )


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a department by ID (Admin Only)."""
    dept_service = DepartmentService(db)
    try:
        dept_service.delete_department(department_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

