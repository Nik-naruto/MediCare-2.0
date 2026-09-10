"""Report & Analytics Service Layer."""

import calendar
from datetime import date, datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from app.repositories.report import ReportRepository
from app.schemas.report import (
    DepartmentRevenue,
    PeakHourBucket,
    ReportFilterInfo,
    ReportSummaryResponse,
)


def get_bucket_label(hour: int) -> str:
    """Map hour of day (0-23) to standard peak consultation bucket label."""
    if 8 <= hour < 10:
        return "08:00 AM - 10:00 AM (Early Morning)"
    if 10 <= hour < 12:
        return "10:00 AM - 12:00 PM (Morning Peak)"
    if 12 <= hour < 14:
        return "12:00 PM - 02:00 PM (Midday)"
    if 14 <= hour < 16:
        return "02:00 PM - 04:00 PM (Afternoon Peak)"
    if 16 <= hour < 18:
        return "04:00 PM - 06:00 PM (Late Afternoon)"
    if 18 <= hour < 21:
        return "06:00 PM - 09:00 PM (Evening Peak)"
    return "Off-Peak Hours"


class ReportService:
    """Service encapsulating hospital analytics and DB-driven report processing."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = ReportRepository(db)

    def get_summary(
        self,
        month: Optional[int] = None,
        year: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        department_id: Optional[int] = None,
    ) -> ReportSummaryResponse:
        """
        Generate complete DB-aggregated report payload with validated period filters.
        """
        # Validate date range and filter inputs
        parsed_from, parsed_to, period_label = self._parse_and_validate_period(
            month=month,
            year=year,
            date_from=date_from,
            date_to=date_to,
        )

        # 1. Total Paid Revenue & Department Breakdown
        db_dept_revenues = self.repo.get_revenue_by_department(
            date_from=parsed_from,
            date_to=parsed_to,
            department_id=department_id,
        )
        total_revenue = self.repo.get_total_paid_revenue(
            date_from=parsed_from,
            date_to=parsed_to,
            department_id=department_id,
        )

        all_depts = self.repo.get_all_departments()

        # Map department names to revenue
        dept_revenue_map: Dict[str, float] = {}
        # Pre-initialize all existing departments with 0.0 unless filtering by a specific department
        if department_id is None:
            for dept in all_depts:
                dept_revenue_map[dept.name] = 0.0

        for d_id, d_name, amount in db_dept_revenues:
            name = d_name if d_name else "Unassigned"
            dept_revenue_map[name] = (dept_revenue_map.get(name, 0.0)) + amount

        # Build list of DepartmentRevenue schemas
        revenue_list: List[DepartmentRevenue] = []
        for name, amount in dept_revenue_map.items():
            pct = round((amount / total_revenue) * 100) if total_revenue > 0 else 0
            formatted = f"₹{amount:,.0f}" if amount == int(amount) else f"₹{amount:,.2f}"
            revenue_list.append(
                DepartmentRevenue(
                    department_id=next((d.id for d in all_depts if d.name == name), None),
                    name=name,
                    amount=amount,
                    formatted_amount=formatted,
                    percentage=pct,
                )
            )

        # Sort breakdown by revenue descending
        revenue_list.sort(key=lambda r: r.amount, reverse=True)

        # 2. Peak Consultation Hours
        time_distrib = self.repo.get_consultation_time_distribution(
            date_from=parsed_from,
            date_to=parsed_to,
            department_id=department_id,
        )
        total_consultations = self.repo.get_total_consultations_count(
            date_from=parsed_from,
            date_to=parsed_to,
            department_id=department_id,
        )

        bucket_counts: Dict[str, int] = {}
        for start_time, cnt in time_distrib:
            if start_time:
                hour = start_time.hour if hasattr(start_time, "hour") else 0
                label = get_bucket_label(hour)
                bucket_counts[label] = bucket_counts.get(label, 0) + cnt

        peak_hours_list = [
            PeakHourBucket(label=lbl, count=cnt)
            for lbl, cnt in bucket_counts.items()
        ]
        # Sort peak hours by count descending
        peak_hours_list.sort(key=lambda p: p.count, reverse=True)

        formatted_total = f"₹{total_revenue:,.0f}" if total_revenue == int(total_revenue) else f"₹{total_revenue:,.2f}"

        return ReportSummaryResponse(
            total_paid_revenue=total_revenue,
            formatted_total_revenue=formatted_total,
            total_consultations=total_consultations,
            revenue_breakdown=revenue_list,
            peak_hours=peak_hours_list,
            filter_info=ReportFilterInfo(
                date_from=parsed_from,
                date_to=parsed_to,
                month=month,
                year=year,
                department_id=department_id,
                period_label=period_label,
            ),
        )

    def _parse_and_validate_period(
        self,
        month: Optional[int] = None,
        year: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> tuple[Optional[date], Optional[date], str]:
        """Validate and resolve filter inputs into date boundaries and period label."""
        if month is not None:
            if month < 1 or month > 12:
                raise ValueError("Month filter must be an integer between 1 and 12.")
            target_year = year if year is not None else datetime.now().year
            last_day = calendar.monthrange(target_year, month)[1]
            p_from = date(target_year, month, 1)
            p_to = date(target_year, month, last_day)
            month_name = calendar.month_name[month]
            label = f"{month_name} {target_year} Revenue Breakdown"
            return p_from, p_to, label

        if date_from is not None or date_to is not None:
            if date_from and date_to and date_from > date_to:
                raise ValueError("date_from cannot be after date_to.")
            label = "Custom Period Revenue Breakdown"
            if date_from and date_to:
                label = f"Revenue Breakdown ({date_from.isoformat()} to {date_to.isoformat()})"
            elif date_from:
                label = f"Revenue Breakdown (From {date_from.isoformat()})"
            elif date_to:
                label = f"Revenue Breakdown (Until {date_to.isoformat()})"
            return date_from, date_to, label

        if year is not None:
            p_from = date(year, 1, 1)
            p_to = date(year, 12, 31)
            label = f"Annual Revenue Breakdown ({year})"
            return p_from, p_to, label

        return None, None, "All-Time Hospital Revenue Breakdown"
