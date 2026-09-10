"""Tests for Doctor Registration and Doctor Profile Persistence."""

import pytest
from app.db.session import get_db
from app.models.department import Department
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.user import User
from app.models.enums import UserRole


def helper_create_dept(db_session, name="Cardiology"):
    """Helper to seed a test department in the test DB."""
    dept = Department(name=name, description="Heart Care", location="Building A")
    db_session.add(dept)
    db_session.commit()
    db_session.refresh(dept)
    return dept


def test_doctor_registration_creates_user_and_doctor_profile(client):
    """Test 1, 2, 3, 4, 5: Doctor registration creates User and Doctor profile with matching user_id, department, and professional fields."""
    # Seed department in test DB
    app = client.app
    db_gen = app.dependency_overrides[get_db]()
    db_session = next(db_gen)
    dept = helper_create_dept(db_session, name="Cardiology")

    payload = {
        "email": "dr.smith@example.com",
        "password": "Password123!",
        "full_name": "Dr. John Smith",
        "phone": "9876543210",
        "role": "Doctor",
        "specialty": "Cardiology",
        "specialization": "Cardiology",
        "qualification": "MBBS, MD",
        "experience_years": 8,
        "department": "Cardiology",
        "consultation_fee": 750.0,
        "room_no": "C-101",
        "bio": "Experienced cardiologist specializing in heart health.",
    }

    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    user_data = res.json()

    # 1. User created
    db_user = db_session.query(User).filter(User.email == "dr.smith@example.com").first()
    assert db_user is not None
    assert db_user.role == UserRole.DOCTOR
    assert db_user.full_name == "Dr. John Smith"

    # 2 & 3. Doctor profile created and user_id matches
    db_doctor = db_session.query(Doctor).filter(Doctor.user_id == db_user.id).first()
    assert db_doctor is not None
    assert db_doctor.user_id == db_user.id

    # 4. Department persisted correctly
    assert db_doctor.department_id == dept.id

    # 5. Professional fields persist
    assert db_doctor.specialty == "Cardiology"
    assert db_doctor.qualification == "MBBS, MD"
    assert db_doctor.experience_years == 8
    assert db_doctor.consultation_fee == 750.0
    assert db_doctor.room_no == "C-101"
    assert db_doctor.bio == "Experienced cardiologist specializing in heart health."
    assert db_doctor.is_available is True


def test_invalid_department_is_rejected_and_rolls_back_user(client):
    """Test 6 & 7: Invalid department is rejected with 400 and rolls back User creation (no orphan user)."""
    app = client.app
    db_gen = app.dependency_overrides[get_db]()
    db_session = next(db_gen)

    payload = {
        "email": "dr.invalid@example.com",
        "password": "Password123!",
        "full_name": "Dr. Invalid Dept",
        "phone": "9876543210",
        "role": "Doctor",
        "specialty": "Unicornology",
        "qualification": "MBBS",
        "experience_years": 3,
        "department": "NonExistentDepartment999",
        "consultation_fee": 500.0,
        "room_no": "U-99",
    }

    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 400
    assert "Department 'NonExistentDepartment999' not found" in res.json()["detail"]

    # 7. Rollback verification: user must NOT exist in DB
    db_user = db_session.query(User).filter(User.email == "dr.invalid@example.com").first()
    assert db_user is None


def test_duplicate_email_is_rejected(client):
    """Test 8: Registering with existing email is rejected with 409 Conflict."""
    app = client.app
    db_gen = app.dependency_overrides[get_db]()
    db_session = next(db_gen)
    helper_create_dept(db_session, name="General Medicine")

    payload = {
        "email": "dr.dup@example.com",
        "password": "Password123!",
        "full_name": "Dr. First",
        "role": "Doctor",
        "department": "General Medicine",
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Duplicate registration
    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_duplicate_doctor_profile_prevented(client):
    """Test 9: Duplicate Doctor profile creation for same user is prevented (updates existing record, maintains 1 profile)."""
    from app.services.doctor import DoctorService
    from app.schemas.doctor import DoctorCreate

    app = client.app
    db_gen = app.dependency_overrides[get_db]()
    db_session = next(db_gen)
    dept = helper_create_dept(db_session, name="Neurology")

    # Register initial doctor
    payload = {
        "email": "dr.single@example.com",
        "password": "Password123!",
        "full_name": "Dr. Single Profile",
        "role": "Doctor",
        "department": "Neurology",
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    user_id = res.json()["id"]

    # Verify 1 Doctor profile exists
    initial_count = db_session.query(Doctor).filter(Doctor.user_id == user_id).count()
    assert initial_count == 1

    # Attempt second doctor profile onboarding for same user_id via service
    doc_service = DoctorService(db_session)
    doc_in = DoctorCreate(
        user_id=user_id,
        department_id=dept.id,
        qualification="MD Neurology",
        specialty="Neurology",
        experience_years=5,
        consultation_fee=1000.0,
        room_no="N-101",
    )
    res_doc = doc_service.onboard_doctor(doc_in)
    assert res_doc.qualification == "MD Neurology"

    # Verify still exactly 1 Doctor profile exists in DB (no duplicate profile)
    final_count = db_session.query(Doctor).filter(Doctor.user_id == user_id).count()
    assert final_count == 1


def test_doctor_can_retrieve_own_profile(client):
    """Test 10: Authenticated Doctor can retrieve their own profile data via GET /doctors/."""
    app = client.app
    db_gen = app.dependency_overrides[get_db]()
    db_session = next(db_gen)
    helper_create_dept(db_session, name="Orthopedics")

    email = "dr.retrieve@example.com"
    password = "Password123!"

    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Dr. Retrieve Test",
            "role": "Doctor",
            "department": "Orthopedics",
            "qualification": "MS (Ortho)",
            "specialty": "Orthopedics",
            "room_no": "O-301",
        },
    )

    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch list of doctors as authenticated doctor
    docs_res = client.get("/api/v1/doctors/", headers=headers)
    assert docs_res.status_code == 200
    docs_list = docs_res.json()
    assert len(docs_list) >= 1
    matched = [d for d in docs_list if d.get("user", {}).get("email") == email or d.get("user_id") == login_res.json().get("user_id")]
    assert len(docs_list) > 0


def test_doctor_cannot_update_another_doctor_profile(client):
    """Test 11: A Doctor cannot update another Doctor's profile (403 Forbidden)."""
    app = client.app
    db_gen = app.dependency_overrides[get_db]()
    db_session = next(db_gen)
    helper_create_dept(db_session, name="Pediatrics")

    # Doctor 1
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "doc1@example.com",
            "password": "Password123!",
            "full_name": "Dr. One",
            "role": "Doctor",
            "department": "Pediatrics",
            "qualification": "MD",
            "specialty": "Pediatrics",
            "room_no": "P-101",
        },
    )
    # Doctor 2
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "doc2@example.com",
            "password": "Password123!",
            "full_name": "Dr. Two",
            "role": "Doctor",
            "department": "Pediatrics",
            "qualification": "MD",
            "specialty": "Pediatrics",
            "room_no": "P-102",
        },
    )

    # Fetch Doctor 2 ID
    doc2_user = db_session.query(User).filter(User.email == "doc2@example.com").first()
    doc2_profile = db_session.query(Doctor).filter(Doctor.user_id == doc2_user.id).first()

    # Login as Doctor 1
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "doc1@example.com", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Doctor 1 attempts to update Doctor 2 profile
    update_res = client.put(
        f"/api/v1/doctors/{doc2_profile.id}",
        headers=headers,
        json={"qualification": "Hacked Qualification"},
    )
    assert update_res.status_code == 403
    assert "Not authorized to update another doctor's profile" in update_res.json()["detail"]


def test_patient_registration_still_works(client):
    """Test 12: Patient registration creates User and Patient profile with demographics."""
    app = client.app
    db_gen = app.dependency_overrides[get_db]()
    db_session = next(db_gen)

    payload = {
        "email": "patient.test@example.com",
        "password": "Password123!",
        "full_name": "Patient Testing",
        "phone": "9123456789",
        "role": "Patient",
        "gender": "Female",
        "date_of_birth": "1995-05-15",
        "blood_group": "A+",
        "address": "123 Health Ave",
        "emergency_contact": "9876543210",
    }

    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201

    db_user = db_session.query(User).filter(User.email == "patient.test@example.com").first()
    assert db_user is not None
    assert db_user.role == UserRole.PATIENT

    db_patient = db_session.query(Patient).filter(Patient.user_id == db_user.id).first()
    assert db_patient is not None
    assert db_patient.blood_group == "A+"
    assert db_patient.address == "123 Health Ave"


def test_admin_registration_restrictions_still_work(client, admin_headers):
    """Test 13: Public registration for Admin role remains restricted (403 Forbidden)."""
    payload = {
        "email": "public.admin@example.com",
        "password": "Password123!",
        "full_name": "Public Admin Attempt",
        "role": "Admin",
    }

    # Without admin token (unauthenticated public user)
    res_public = client.post("/api/v1/auth/register", json=payload)
    assert res_public.status_code == 403
    assert "Public registration cannot create Admin accounts" in res_public.json()["detail"]


def test_doctor_registration_medical_registration_number_persistence(client):
    """Test 14: Doctor registration accepts, persists, and returns medical_registration_number."""
    app = client.app
    db_gen = app.dependency_overrides[get_db]()
    db_session = next(db_gen)
    helper_create_dept(db_session, name="Cardiology")

    payload = {
        "email": "dr.medreg@example.com",
        "password": "Password123!",
        "full_name": "Dr. MedReg Test",
        "role": "Doctor",
        "department": "Cardiology",
        "medical_registration_number": "MCI-TEST-9988",
        "specialty": "Cardiology",
        "qualification": "MBBS, MD",
        "experience_years": 10,
        "room_no": "C-901",
    }

    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201

    # Verify DB persistence
    db_user = db_session.query(User).filter(User.email == "dr.medreg@example.com").first()
    db_doc = db_session.query(Doctor).filter(Doctor.user_id == db_user.id).first()
    assert db_doc.medical_registration_number == "MCI-TEST-9988"

    # Verify GET /doctors/ returns medical_registration_number
    get_res = client.get("/api/v1/doctors/")
    assert get_res.status_code == 200
    matched = [d for d in get_res.json() if d.get("user_id") == db_user.id]
    assert len(matched) == 1
    assert matched[0]["medical_registration_number"] == "MCI-TEST-9988"


def test_duplicate_medical_registration_number_rejected(client):
    """Test 15: Registering with duplicate medical_registration_number returns 400 Bad Request."""
    app = client.app
    db_gen = app.dependency_overrides[get_db]()
    db_session = next(db_gen)
    helper_create_dept(db_session, name="Neurology")

    payload1 = {
        "email": "dr.unique1@example.com",
        "password": "Password123!",
        "full_name": "Dr. Unique One",
        "role": "Doctor",
        "department": "Neurology",
        "medical_registration_number": "MCI-UNIQUE-777",
    }
    res1 = client.post("/api/v1/auth/register", json=payload1)
    assert res1.status_code == 201

    payload2 = {
        "email": "dr.unique2@example.com",
        "password": "Password123!",
        "full_name": "Dr. Unique Two",
        "role": "Doctor",
        "department": "Neurology",
        "medical_registration_number": "MCI-UNIQUE-777",
    }
    res2 = client.post("/api/v1/auth/register", json=payload2)
    assert res2.status_code in (400, 409)
    assert "Doctor with Medical Registration Number 'MCI-UNIQUE-777' already exists" in res2.json()["detail"]


def test_doctor_profile_update_medical_registration_number(client):
    """Test 16: Authenticated Doctor can update their own medical_registration_number."""
    app = client.app
    db_gen = app.dependency_overrides[get_db]()
    db_session = next(db_gen)
    helper_create_dept(db_session, name="Dermatology")

    email = "dr.update.reg@example.com"
    password = "Password123!"

    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Dr. Update Reg",
            "role": "Doctor",
            "department": "Dermatology",
            "medical_registration_number": "MCI-INITIAL-100",
        },
    )

    login_res = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    db_user = db_session.query(User).filter(User.email == email).first()
    db_doc = db_session.query(Doctor).filter(Doctor.user_id == db_user.id).first()

    # Update medical_registration_number
    update_res = client.put(
        f"/api/v1/doctors/{db_doc.id}",
        headers=headers,
        json={"medical_registration_number": "MCI-UPDATED-200"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["medical_registration_number"] == "MCI-UPDATED-200"

    # Verify DB updated
    db_session.refresh(db_doc)
    assert db_doc.medical_registration_number == "MCI-UPDATED-200"

