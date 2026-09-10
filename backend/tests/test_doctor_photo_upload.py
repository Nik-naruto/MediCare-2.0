"""Tests for Doctor Profile Photo Upload & Management System."""

import io
import pytest
from fastapi import status
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.models.doctor import Doctor
from app.core.security import get_password_hash


TINY_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x02\x00"
    b"\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\aeB`"
)

TINY_JPEG_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xd9"


def get_test_db(client):
    """Retrieve test DB session from client app dependency overrides."""
    db_gen = client.app.dependency_overrides[get_db]()
    return next(db_gen)


def setup_test_doctor(client, email_prefix, role="Doctor"):
    """Helper to seed user and doctor profile in test DB."""
    db_session = get_test_db(client)

    user = User(
        email=f"{email_prefix}@medicare.demo",
        hashed_password=get_password_hash("Password123!"),
        full_name=f"Dr. {email_prefix.title()}",
        role=UserRole(role),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    doctor_id = None
    if role == "Doctor":
        doctor = Doctor(
            user_id=user.id,
            specialty="Cardiology",
            qualification="MBBS, MD",
            experience_years=10,
            consultation_fee=500.0,
            room_no="101",
            bio="Test Bio",
        )
        db_session.add(doctor)
        db_session.commit()
        db_session.refresh(doctor)
        doctor_id = doctor.id

    login_res = client.post("/api/v1/auth/login", data={"username": user.email, "password": "Password123!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    return {"user_id": user.id, "doctor_id": doctor_id, "headers": headers, "email": user.email}


def test_missing_photo_returns_null(client):
    doc1 = setup_test_doctor(client, "missing_photo_doc")
    res = client.get(f"/api/v1/doctors/{doc1['doctor_id']}")
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["profile_photo_url"] is None


def test_doctor_can_upload_own_photo(client):
    doc1 = setup_test_doctor(client, "upload_own_doc")
    files = {"file": ("test_avatar.png", io.BytesIO(TINY_PNG_BYTES), "image/png")}
    res = client.post(f"/api/v1/doctors/{doc1['doctor_id']}/upload-photo", headers=doc1["headers"], files=files)

    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["profile_photo_url"] is not None
    assert data["profile_photo_url"].startswith("/uploads/doctors/")
    assert data["profile_photo_url"].endswith(".png")

    get_res = client.get(f"/api/v1/doctors/{doc1['doctor_id']}")
    assert get_res.json()["profile_photo_url"] == data["profile_photo_url"]


def test_doctor_cannot_upload_for_another_doctor(client):
    doc1 = setup_test_doctor(client, "doc_one")
    doc2 = setup_test_doctor(client, "doc_two")

    files = {"file": ("hacked.png", io.BytesIO(TINY_PNG_BYTES), "image/png")}
    res = client.post(f"/api/v1/doctors/{doc2['doctor_id']}/upload-photo", headers=doc1["headers"], files=files)
    assert res.status_code == status.HTTP_403_FORBIDDEN


def test_patient_and_receptionist_cannot_upload(client):
    doc = setup_test_doctor(client, "doc_target")
    patient = setup_test_doctor(client, "patient_actor", role="Patient")
    rec = setup_test_doctor(client, "rec_actor", role="Receptionist")

    files1 = {"file": ("p.png", io.BytesIO(TINY_PNG_BYTES), "image/png")}
    res_p = client.post(f"/api/v1/doctors/{doc['doctor_id']}/upload-photo", headers=patient["headers"], files=files1)
    assert res_p.status_code == status.HTTP_403_FORBIDDEN

    files2 = {"file": ("r.png", io.BytesIO(TINY_PNG_BYTES), "image/png")}
    res_r = client.post(f"/api/v1/doctors/{doc['doctor_id']}/upload-photo", headers=rec["headers"], files=files2)
    assert res_r.status_code == status.HTTP_403_FORBIDDEN


def test_admin_can_upload_doctor_photo(client):
    doc = setup_test_doctor(client, "doc_for_admin")
    admin = setup_test_doctor(client, "admin_actor", role="Admin")

    files = {"file": ("admin_upload.jpg", io.BytesIO(TINY_JPEG_BYTES), "image/jpeg")}
    res = client.post(f"/api/v1/doctors/{doc['doctor_id']}/upload-photo", headers=admin["headers"], files=files)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["profile_photo_url"].endswith(".jpg")


def test_invalid_file_type_rejected(client):
    doc = setup_test_doctor(client, "doc_invalid_type")
    fake_script = b"<script>alert('xss')</script>"
    files = {"file": ("malicious.png", io.BytesIO(fake_script), "image/png")}
    res = client.post(f"/api/v1/doctors/{doc['doctor_id']}/upload-photo", headers=doc["headers"], files=files)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "Unsupported image format" in res.json()["detail"]


def test_oversized_file_rejected(client):
    doc = setup_test_doctor(client, "doc_oversized")
    big_file = TINY_PNG_BYTES + b"0" * (6 * 1024 * 1024)
    files = {"file": ("huge.png", io.BytesIO(big_file), "image/png")}
    res = client.post(f"/api/v1/doctors/{doc['doctor_id']}/upload-photo", headers=doc["headers"], files=files)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "exceeds maximum allowed limit" in res.json()["detail"]


def test_replace_and_delete_photo(client):
    doc = setup_test_doctor(client, "doc_replace_del")

    # 1. Upload Photo A
    files1 = {"file": ("photo_a.png", io.BytesIO(TINY_PNG_BYTES), "image/png")}
    res1 = client.post(f"/api/v1/doctors/{doc['doctor_id']}/upload-photo", headers=doc["headers"], files=files1)
    photo_a_url = res1.json()["profile_photo_url"]

    # 2. Replace with Photo B
    files2 = {"file": ("photo_b.jpg", io.BytesIO(TINY_JPEG_BYTES), "image/jpeg")}
    res2 = client.post(f"/api/v1/doctors/{doc['doctor_id']}/upload-photo", headers=doc["headers"], files=files2)
    photo_b_url = res2.json()["profile_photo_url"]

    assert photo_a_url != photo_b_url
    assert photo_b_url.endswith(".jpg")

    # 3. Delete Photo
    res_del = client.delete(f"/api/v1/doctors/{doc['doctor_id']}/photo", headers=doc["headers"])
    assert res_del.status_code == status.HTTP_200_OK
    assert res_del.json()["profile_photo_url"] is None
