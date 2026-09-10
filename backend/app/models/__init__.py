"""SQLAlchemy Models Registry Package."""

from app.db.base import Base
from app.models.enums import (
    AppointmentStatus,
    Gender,
    LabReportStatus,
    PaymentStatus,
    UserRole,
)
from app.models.user import User
from app.models.department import Department
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.schedule import DoctorSchedule
from app.models.appointment import Appointment
from app.models.medical_record import MedicalRecord
from app.models.prescription import Prescription, PrescriptionItem
from app.models.lab_report import LabReport
from app.models.invoice import Invoice, InvoiceItem
from app.models.notification import Notification
from app.models.audit_log import AuditLog

__all__ = [
    "Base",
    "UserRole",
    "AppointmentStatus",
    "PaymentStatus",
    "LabReportStatus",
    "Gender",
    "User",
    "Department",
    "Doctor",
    "Patient",
    "DoctorSchedule",
    "Appointment",
    "MedicalRecord",
    "Prescription",
    "PrescriptionItem",
    "LabReport",
    "Invoice",
    "InvoiceItem",
    "Notification",
    "AuditLog",
]
