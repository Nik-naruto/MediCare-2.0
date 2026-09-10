"""Invoice Data Repository."""

from datetime import date
from typing import Any, List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.invoice import Invoice
from app.repositories.base import BaseRepository


class InvoiceRepository(BaseRepository[Invoice]):
    """Repository handling database queries for Invoices."""

    def __init__(self, db: Session):
        super().__init__(Invoice, db)

    def get_by_patient_id(self, patient_id: int) -> List[Invoice]:
        """Fetch all invoices generated for a patient."""
        stmt = select(Invoice).where(Invoice.patient_id == patient_id)
        return list(self.db.scalars(stmt).all())

    def get_by_patient_ids(self, patient_ids: List[int]) -> List[Invoice]:
        """Fetch invoices belonging to a list of patient IDs."""
        if not patient_ids:
            return []
        stmt = select(Invoice).where(Invoice.patient_id.in_(patient_ids))
        return list(self.db.scalars(stmt).all())

    def get_by_appointment_id(self, appointment_id: int) -> Optional[Invoice]:
        """Fetch invoice generated for a specific appointment."""
        stmt = select(Invoice).where(Invoice.appointment_id == appointment_id)
        return self.db.scalars(stmt).first()

    def get_by_id(self, id: int) -> Optional[Invoice]:
        """Fetch single invoice by ID with eager patient relationship loading."""
        from sqlalchemy.orm import selectinload
        from app.models.patient import Patient
        from app.models.user import User
        stmt = select(Invoice).where(Invoice.id == id).options(selectinload(Invoice.patient).selectinload(Patient.user))
        return self.db.scalars(stmt).first()

    def get_today_collected_revenue(self, target_date: date) -> float:
        """Calculate total paid revenue for a target date."""
        from app.models.enums import PaymentStatus
        stmt = (
            select(func.coalesce(func.sum(Invoice.total_amount), 0.0))
            .where(
                Invoice.payment_status == PaymentStatus.PAID,
                Invoice.invoice_date == target_date,
            )
        )
        val = self.db.scalar(stmt)
        return float(val or 0.0)

    def get_all_filtered(
        self,
        allowed_patient_ids: Optional[List[int]] = None,
        patient_id: Optional[int] = None,
        payment_status: Optional[Any] = None,
        search: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[Invoice], int]:
        """Fetch invoices with domain ownership authorization, DB-level search, filtering, sorting, and pagination."""
        from sqlalchemy import func
        from sqlalchemy.orm import selectinload
        from app.models.patient import Patient
        from app.models.user import User
        from app.core.pagination import apply_safe_sorting

        stmt = select(Invoice).options(selectinload(Invoice.patient).selectinload(Patient.user))

        # Enforce domain ownership authorization
        if allowed_patient_ids is not None:
            if not allowed_patient_ids:
                return [], 0
            stmt = stmt.where(Invoice.patient_id.in_(allowed_patient_ids))

        if patient_id is not None:
            stmt = stmt.where(Invoice.patient_id == patient_id)
        if payment_status is not None:
            stmt = stmt.where(Invoice.payment_status == payment_status)
        if date_from is not None:
            stmt = stmt.where(Invoice.invoice_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(Invoice.invoice_date <= date_to)

        if search:
            search_pattern = f"%{search.strip()}%"
            p_user = (
                select(Patient.id)
                .join(User, Patient.user_id == User.id)
                .where(User.full_name.ilike(search_pattern))
                .scalar_subquery()
            )
            search_cond = (
                (Invoice.transaction_id.ilike(search_pattern))
                | (Invoice.payment_method.ilike(search_pattern))
                | (Invoice.patient_id.in_(p_user))
            )
            if search.strip().isdigit():
                search_cond = search_cond | (Invoice.id == int(search.strip()))
            stmt = stmt.where(search_cond)

        # Count total matching records before offset/limit
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = self.db.scalar(count_stmt) or 0

        # Apply safe sorting
        allowlist = {
            "id": Invoice.id,
            "invoice_date": Invoice.invoice_date,
            "total_amount": Invoice.total_amount,
            "payment_status": Invoice.payment_status,
            "created_at": Invoice.created_at,
        }
        stmt = apply_safe_sorting(stmt, Invoice, sort_by, sort_order, allowlist, Invoice.invoice_date.desc())

        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        invoices = list(self.db.scalars(stmt).all())
        return invoices, total_count
