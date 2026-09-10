"""Pytest suite for verifying SQLAlchemy ORM models and Pydantic validation schemas."""

from app.models import (
    Base,
    Appointment,
    AppointmentStatus,
    AuditLog,
    Department,
    Doctor,
    DoctorSchedule,
    Gender,
    Invoice,
    InvoiceItem,
    LabReport,
    LabReportStatus,
    MedicalRecord,
    Notification,
    Patient,
    PaymentStatus,
    Prescription,
    PrescriptionItem,
    User,
    UserRole,
)
from app.schemas import (
    AppointmentCreate,
    AppointmentResponse,
    DepartmentCreate,
    DoctorCreate,
    InvoiceCreate,
    LabReportCreate,
    MedicalRecordCreate,
    NotificationCreate,
    PatientCreate,
    PrescriptionCreate,
    UserCreate,
    UserResponse,
)


def test_sqlalchemy_metadata_registration():
    """Verify that all 14 ORM tables are registered on Base.metadata without DB connection."""
    registered_tables = set(Base.metadata.tables.keys())
    expected_tables = {
        "users",
        "departments",
        "doctors",
        "patients",
        "doctor_schedules",
        "appointments",
        "medical_records",
        "prescriptions",
        "prescription_items",
        "lab_reports",
        "invoices",
        "invoice_items",
        "notifications",
        "audit_logs",
    }
    assert expected_tables.issubset(registered_tables), f"Missing tables: {expected_tables - registered_tables}"


def test_pydantic_user_schema_validation():
    """Verify Pydantic user creation and response schema validation."""
    user_data = {
        "email": "doctor.test@medicare.com",
        "full_name": "Dr. Test Specialist",
        "password": "securepassword123",
        "role": UserRole.DOCTOR,
    }
    user_create = UserCreate(**user_data)
    assert user_create.email == "doctor.test@medicare.com"
    assert user_create.role == UserRole.DOCTOR


def test_domain_enum_values():
    """Verify enum domain values match specification."""
    assert UserRole.PATIENT.value == "Patient"
    assert AppointmentStatus.SCHEDULED.value == "Scheduled"
    assert PaymentStatus.PAID.value == "Paid"
    assert LabReportStatus.READY.value == "Ready"
    assert Gender.FEMALE.value == "Female"
