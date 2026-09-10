"""Admin Financial & Operational Reports API Endpoints."""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.report import ReportSummaryResponse
from app.services.report import ReportService

router = APIRouter()


@router.get("/summary", response_model=ReportSummaryResponse)
def read_report_summary(
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter by month (1-12)"),
    year: Optional[int] = Query(None, ge=2000, le=2100, description="Filter by year (YYYY)"),
    date_from: Optional[date] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="End date filter (YYYY-MM-DD)"),
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Retrieve database-aggregated financial revenue and operational peak hours report summary.

    Strictly restricted to Admin user role.
    """
    service = ReportService(db)
    try:
        return service.get_summary(
            month=month,
            year=year,
            date_from=date_from,
            date_to=date_to,
            department_id=department_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
