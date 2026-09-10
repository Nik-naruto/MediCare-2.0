"""Pydantic Schemas Package Registry."""

from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate
from app.schemas.doctor import DoctorCreate, DoctorResponse, DoctorUpdate
from app.schemas.patient import PatientCreate, PatientResponse, PatientUpdate
from app.schemas.schedule import DoctorScheduleCreate, DoctorScheduleResponse, DoctorScheduleUpdate
from app.schemas.appointment import AppointmentCreate, AppointmentResponse, AppointmentStatusUpdate
from app.schemas.medical_record import MedicalRecordCreate, MedicalRecordResponse, MedicalRecordUpdate
from app.schemas.prescription import PrescriptionCreate, PrescriptionResponse, PrescriptionItemCreate, PrescriptionItemResponse
from app.schemas.lab_report import LabReportCreate, LabReportResponse, LabReportUpdate
from app.schemas.invoice import InvoiceCreate, InvoiceResponse, InvoicePaymentUpdate, InvoiceItemCreate, InvoiceItemResponse
from app.schemas.notification import NotificationCreate, NotificationResponse
from app.schemas.audit_log import AuditLogCreate, AuditLogResponse

__all__ = [
    "UserCreate",
    "UserResponse",
    "UserUpdate",
    "DepartmentCreate",
    "DepartmentResponse",
    "DepartmentUpdate",
    "DoctorCreate",
    "DoctorResponse",
    "DoctorUpdate",
    "PatientCreate",
    "PatientResponse",
    "PatientUpdate",
    "DoctorScheduleCreate",
    "DoctorScheduleResponse",
    "DoctorScheduleUpdate",
    "AppointmentCreate",
    "AppointmentResponse",
    "AppointmentStatusUpdate",
    "MedicalRecordCreate",
    "MedicalRecordResponse",
    "MedicalRecordUpdate",
    "PrescriptionCreate",
    "PrescriptionResponse",
    "PrescriptionItemCreate",
    "PrescriptionItemResponse",
    "LabReportCreate",
    "LabReportResponse",
    "LabReportUpdate",
    "InvoiceCreate",
    "InvoiceResponse",
    "InvoicePaymentUpdate",
    "InvoiceItemCreate",
    "InvoiceItemResponse",
    "NotificationCreate",
    "NotificationResponse",
    "AuditLogCreate",
    "AuditLogResponse",
]
