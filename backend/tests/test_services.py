"""Pytest suite verifying Repository and Service Layer workflows offline (SQLite in-memory)."""

import pytest
from datetime import date, time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.enums import AppointmentStatus, PaymentStatus, UserRole
from app.schemas.appointment import AppointmentCreate
from app.schemas.department import DepartmentCreate
from app.schemas.doctor import DoctorCreate
from app.schemas.patient import PatientCreate
from app.schemas.schedule import DoctorScheduleCreate
from app.schemas.user import UserCreate
from app.services.appointment import AppointmentService
from app.services.department import DepartmentService
from app.services.doctor import DoctorService
from app.services.patient import PatientService
from app.services.schedule import DoctorScheduleService
from app.services.user import UserService


@pytest.fixture
def db_session():
    """Create in-memory SQLite database session for offline unit tests."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_user_service_create(db_session):
    """Test user creation business service."""
    user_service = UserService(db_session)
    user_schema = UserCreate(
        email="doctor.sharma@medicare.com",
        full_name="Dr. Rahul Sharma",
        password="password123",
        role=UserRole.DOCTOR,
    )
    user = user_service.create_user(user_schema, hashed_password="hashed_password123")
    assert user.id is not None
    assert user.email == "doctor.sharma@medicare.com"
    assert user.role == UserRole.DOCTOR


def test_user_service_duplicate_email_prevention(db_session):
    """Test business rule preventing duplicate email registration."""
    user_service = UserService(db_session)
    user_schema = UserCreate(
        email="duplicate@medicare.com",
        full_name="Duplicate User",
        password="password123",
    )
    user_service.create_user(user_schema, hashed_password="hashed_pass")
    with pytest.raises(ValueError, match="already exists"):
        user_service.create_user(user_schema, hashed_password="hashed_pass")


def test_appointment_booking_and_cancellation_workflow(db_session):
    """Test full workflow: create user -> onboard doctor -> create patient -> add schedule -> book appointment -> cancel."""
    user_service = UserService(db_session)
    doctor_service = DoctorService(db_session)
    patient_service = PatientService(db_session)
    schedule_service = DoctorScheduleService(db_session)
    appointment_service = AppointmentService(db_session)

    # 1. Create doctor user & profile
    doc_user = user_service.create_user(
        UserCreate(email="doc@medicare.com", full_name="Dr. Smith", password="password123", role=UserRole.DOCTOR),
        hashed_password="hash",
    )
    doctor = doctor_service.onboard_doctor(
        DoctorCreate(
            user_id=doc_user.id,
            qualification="MD",
            specialty="Cardiology",
            consultation_fee=800.0,
            room_no="A-101",
        )
    )

    # 2. Add Doctor Schedule for Thursday (2026-09-10)
    schedule_service.create_schedule_slot(
        DoctorScheduleCreate(
            doctor_id=doctor.id,
            day_of_week="Thursday",
            start_time=time(9, 0),
            end_time=time(17, 0),
        )
    )

    # 3. Create patient user & profile
    pat_user = user_service.create_user(
        UserCreate(email="pat@medicare.com", full_name="Aarav Gupta", password="password123", role=UserRole.PATIENT),
        hashed_password="hash",
    )
    patient = patient_service.register_patient_profile(PatientCreate(user_id=pat_user.id))

    # 4. Book appointment
    apt_schema = AppointmentCreate(
        patient_id=patient.id,
        doctor_id=doctor.id,
        appointment_date=date(2026, 9, 10),
        start_time=time(10, 0),
        fee=800.0,
        reason="Heart checkup",
    )
    appointment = appointment_service.book_appointment(apt_schema)
    assert appointment.id is not None
    assert appointment.status == AppointmentStatus.SCHEDULED
    assert appointment.payment_status == PaymentStatus.UNPAID

    # 5. Cancel appointment
    cancelled_apt = appointment_service.cancel_appointment(appointment.id)
    assert cancelled_apt.status == AppointmentStatus.CANCELLED
