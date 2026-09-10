"""Invoice Business Service with Domain-Level Ownership & Relationship Authorization."""

from typing import Any, List, Optional
from sqlalchemy.orm import Session

from app.models.enums import UserRole
from app.models.invoice import Invoice, InvoiceItem
from app.models.user import User
from app.repositories.appointment import AppointmentRepository
from app.repositories.doctor import DoctorRepository
from app.repositories.invoice import InvoiceRepository
from app.repositories.patient import PatientRepository
from app.schemas.invoice import InvoiceCreate, InvoicePaymentUpdate


class InvoiceService:
    """Business service governing Invoice creation, billing domain ownership, and payment collections."""

    def __init__(self, db: Session):
        self.db = db
        self.invoice_repo = InvoiceRepository(db)
        self.patient_repo = PatientRepository(db)
        self.doctor_repo = DoctorRepository(db)
        self.appointment_repo = AppointmentRepository(db)

    def get_patient_for_user(self, user_id: int):
        """Fetch patient profile associated with a user ID."""
        return self.patient_repo.get_by_user_id(user_id)

    def get_doctor_for_user(self, user_id: int):
        """Fetch doctor profile associated with a user ID."""
        return self.doctor_repo.get_by_user_id(user_id)

    def doctor_has_patient_relationship(self, doctor_id: int, patient_id: int) -> bool:
        """Check if doctor has an appointment relationship with patient."""
        return self.appointment_repo.has_appointment(doctor_id, patient_id)

    def create_invoice(self, schema: InvoiceCreate, current_user: Optional[User] = None) -> Invoice:
        """Create new invoice header and calculate totals after role and relationship authorization."""
        if current_user:
            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to create invoices.")

            if current_user.role == UserRole.DOCTOR:
                raise PermissionError("Access denied: Doctors are not permitted to create invoices.")

        patient = self.patient_repo.get_by_id(schema.patient_id)
        if not patient:
            raise ValueError(f"Patient ID {schema.patient_id} not found.")

        if schema.appointment_id:
            appointment = self.appointment_repo.get_by_id(schema.appointment_id)
            if not appointment:
                raise ValueError(f"Appointment ID {schema.appointment_id} not found.")
            if appointment.patient_id != schema.patient_id:
                raise ValueError(f"Appointment ID {schema.appointment_id} does not belong to Patient ID {schema.patient_id}.")

        items = [
            InvoiceItem(
                description=item.description,
                amount=item.amount,
            )
            for item in schema.items
        ]

        subtotal = sum(item.amount for item in items) if items else schema.subtotal
        total_amount = subtotal + schema.tax

        new_invoice = Invoice(
            appointment_id=schema.appointment_id,
            patient_id=schema.patient_id,
            invoice_date=schema.invoice_date,
            subtotal=subtotal,
            tax=schema.tax,
            total_amount=total_amount,
            payment_status=schema.payment_status,
            payment_method=schema.payment_method,
            transaction_id=schema.transaction_id,
            items=items,
        )
        return self.invoice_repo.create(new_invoice)

    def list_invoices(
        self,
        current_user: Optional[User] = None,
        patient_id: Optional[int] = None,
        payment_status: Optional[str] = None,
        search: Optional[str] = None,
        date_from: Optional[Any] = None,
        date_to: Optional[Any] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[Invoice], int]:
        """Fetch list of invoices filtered by role domain ownership, DB-level search, filters, sorting, and pagination."""
        allowed_patient_ids: Optional[List[int]] = None

        if date_from and date_to and date_from > date_to:
            raise ValueError("date_from cannot be after date_to.")

        if current_user:
            if current_user.role == UserRole.PATIENT:
                patient = self.get_patient_for_user(current_user.id)
                if not patient:
                    return [], 0
                allowed_patient_ids = [patient.id]

            elif current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor:
                    return [], 0
                allowed_patient_ids = self.appointment_repo.get_patient_ids_for_doctor(doctor.id)
                if not allowed_patient_ids:
                    return [], 0

            # RECEPTIONIST and ADMIN roles retain full access

        return self.invoice_repo.get_all_filtered(
            allowed_patient_ids=allowed_patient_ids,
            patient_id=patient_id,
            payment_status=payment_status,
            search=search,
            date_from=date_from,
            date_to=date_to,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    def get_by_id(self, invoice_id: int, current_user: Optional[User] = None) -> Invoice:
        """Fetch invoice by ID with role domain ownership verification."""
        invoice = self.invoice_repo.get_by_id(invoice_id)
        if not invoice:
            raise ValueError(f"Invoice with ID {invoice_id} not found.")

        if current_user:
            if current_user.role == UserRole.PATIENT:
                patient = self.get_patient_for_user(current_user.id)
                if not patient or invoice.patient_id != patient.id:
                    raise PermissionError("Access denied: You are not authorized to view another patient's invoice.")

            elif current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor or not self.doctor_has_patient_relationship(doctor.id, invoice.patient_id):
                    raise PermissionError("Access denied: No active appointment relationship with this patient.")

            # RECEPTIONIST and ADMIN roles are allowed to view any invoice

        return invoice

    def collect_payment(
        self, invoice_id: int, schema: InvoicePaymentUpdate, current_user: Optional[User] = None
    ) -> Invoice:
        """Record payment collection on an invoice after role and ownership verification."""
        if current_user:
            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to collect or update payment status.")

            if current_user.role == UserRole.DOCTOR:
                raise PermissionError("Access denied: Doctors are not permitted to collect payments.")

        invoice = self.get_by_id(invoice_id, current_user=current_user)

        update_data = {
            "payment_status": schema.payment_status,
            "payment_method": schema.payment_method,
            "transaction_id": schema.transaction_id,
        }
        return self.invoice_repo.update(invoice, update_data)

    def delete_invoice(self, invoice_id: int, current_user: Optional[User] = None) -> bool:
        """Delete invoice by ID after role permission and domain ownership validation."""
        if current_user:
            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to delete invoices.")

            if current_user.role == UserRole.DOCTOR:
                raise PermissionError("Access denied: Doctors are not permitted to delete invoices.")

        invoice = self.get_by_id(invoice_id, current_user=current_user)

        return self.invoice_repo.delete(invoice.id)
