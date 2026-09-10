"""Services Package Registry."""

from app.services.user import UserService
from app.services.department import DepartmentService
from app.services.doctor import DoctorService
from app.services.patient import PatientService
from app.services.schedule import DoctorScheduleService
from app.services.appointment import AppointmentService
from app.services.medical_record import MedicalRecordService
from app.services.prescription import PrescriptionService
from app.services.lab_report import LabReportService
from app.services.invoice import InvoiceService
from app.services.notification import NotificationService
from app.services.audit_log import AuditLogService

__all__ = [
    "UserService",
    "DepartmentService",
    "DoctorService",
    "PatientService",
    "DoctorScheduleService",
    "AppointmentService",
    "MedicalRecordService",
    "PrescriptionService",
    "LabReportService",
    "InvoiceService",
    "NotificationService",
    "AuditLogService",
]
