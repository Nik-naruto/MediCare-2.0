"""Repositories Package Registry."""

from app.repositories.base import BaseRepository
from app.repositories.user import UserRepository
from app.repositories.department import DepartmentRepository
from app.repositories.doctor import DoctorRepository
from app.repositories.patient import PatientRepository
from app.repositories.schedule import DoctorScheduleRepository
from app.repositories.appointment import AppointmentRepository
from app.repositories.medical_record import MedicalRecordRepository
from app.repositories.prescription import PrescriptionRepository
from app.repositories.lab_report import LabReportRepository
from app.repositories.invoice import InvoiceRepository
from app.repositories.notification import NotificationRepository
from app.repositories.audit_log import AuditLogRepository

__all__ = [
    "BaseRepository",
    "UserRepository",
    "DepartmentRepository",
    "DoctorRepository",
    "PatientRepository",
    "DoctorScheduleRepository",
    "AppointmentRepository",
    "MedicalRecordRepository",
    "PrescriptionRepository",
    "LabReportRepository",
    "InvoiceRepository",
    "NotificationRepository",
    "AuditLogRepository",
]
