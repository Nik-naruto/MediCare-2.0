"""Billing & Invoices API Endpoints with Domain-Level Ownership & Role Protection."""

from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.pagination import PaginationParams, add_pagination_headers
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.enums import PaymentStatus
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoicePaymentUpdate, InvoiceResponse
from app.services.audit_log import AuditLogService
from app.services.invoice import InvoiceService

router = APIRouter()


@router.get("/status")
def invoices_status():
    """Placeholder health endpoint for invoices router."""
    return {"module": "invoices", "status": "active"}


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice_in: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a new billing invoice after role and relationship authorization."""
    invoice_service = InvoiceService(db)
    try:
        created_inv = invoice_service.create_invoice(invoice_in, current_user=current_user)
        AuditLogService(db).log_action(
            action="INVOICE_CREATE",
            user=current_user,
            resource=f"Invoice #{created_inv.id}",
            details=f"Generated invoice #{created_inv.id} for Patient #{created_inv.patient_id} (Total: ${created_inv.total_amount})",
        )
        return created_inv
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValueError as e:
        error_msg = str(e)
        if "does not belong" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_msg,
        )


@router.get("/", response_model=List[InvoiceResponse])
def read_invoices(
    response: Response,
    patient_id: Optional[int] = Query(None, description="Filter by patient ID"),
    payment_status: Optional[PaymentStatus] = Query(None, description="Filter by payment status"),
    search: Optional[str] = Query(None, description="Search transaction_id or payment_method"),
    date_from: Optional[date] = Query(None, description="Filter invoices from date"),
    date_to: Optional[date] = Query(None, description="Filter invoices to date"),
    params: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve list of invoices filtered by role domain ownership, DB-level search, filters, sorting, and pagination."""
    invoice_service = InvoiceService(db)
    try:
        invoices, total = invoice_service.list_invoices(
            current_user=current_user,
            patient_id=patient_id,
            payment_status=payment_status.value if hasattr(payment_status, "value") and payment_status else payment_status,
            search=search,
            date_from=date_from,
            date_to=date_to,
            skip=params.skip,
            limit=params.limit,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
        )
        add_pagination_headers(response, total, params.skip, params.limit)
        return invoices
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def read_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve a single invoice by ID with role domain ownership verification."""
    invoice_service = InvoiceService(db)
    try:
        return invoice_service.get_by_id(invoice_id, current_user=current_user)
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


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    payment_in: InvoicePaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record payment collection on an invoice after role domain ownership validation."""
    invoice_service = InvoiceService(db)
    try:
        updated_inv = invoice_service.collect_payment(invoice_id, payment_in, current_user=current_user)
        AuditLogService(db).log_action(
            action="INVOICE_UPDATE",
            user=current_user,
            resource=f"Invoice #{invoice_id}",
            details=f"Collected payment/updated status for Invoice #{invoice_id}",
        )
        return updated_inv
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


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an invoice by ID after role domain ownership validation."""
    invoice_service = InvoiceService(db)
    try:
        invoice_service.delete_invoice(invoice_id, current_user=current_user)
        AuditLogService(db).log_action(
            action="INVOICE_DELETE",
            user=current_user,
            resource=f"Invoice #{invoice_id}",
            details=f"Deleted Invoice #{invoice_id}",
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
