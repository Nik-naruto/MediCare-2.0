"""Pytest suite for verifying Role-Based Authorization (RBAC) 401 vs 403 behaviors."""

import pytest
from app.models.enums import UserRole


def test_rbac_doctor_access_doctor_endpoint_success(client):
    """Test valid Doctor token accessing Doctor-authorized endpoint returns 200 OK."""
    # Register & login doctor
    client.post("/api/v1/auth/register", json={
        "email": "doc.rbac@medicare.com",
        "password": "password123",
        "full_name": "Dr. RBAC Doctor",
        "role": UserRole.DOCTOR.value,
    })
    token = client.post("/api/v1/auth/login", data={"username": "doc.rbac@medicare.com", "password": "password123"}).json()["access_token"]

    res = client.get("/api/v1/auth/doctor-only", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["role"] == "Doctor"


def test_rbac_patient_access_doctor_endpoint_forbidden_403(client):
    """Test valid Patient token accessing Doctor-only endpoint returns 403 Forbidden."""
    # Register & login patient
    client.post("/api/v1/auth/register", json={
        "email": "pat.rbac@medicare.com",
        "password": "password123",
        "full_name": "Patient RBAC",
        "role": UserRole.PATIENT.value,
    })
    token = client.post("/api/v1/auth/login", data={"username": "pat.rbac@medicare.com", "password": "password123"}).json()["access_token"]

    res = client.get("/api/v1/auth/doctor-only", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert "Operation not permitted" in res.json()["detail"]


def test_rbac_no_token_unauthorized_401(client):
    """Test accessing protected endpoint without token returns 401 Unauthorized."""
    res = client.get("/api/v1/auth/doctor-only")
    assert res.status_code == 401


def test_rbac_invalid_token_unauthorized_401(client):
    """Test accessing protected endpoint with invalid token returns 401 Unauthorized."""
    res = client.get("/api/v1/auth/doctor-only", headers={"Authorization": "Bearer invalid_token_xyz"})
    assert res.status_code == 401
    assert "Could not validate credentials" in res.json()["detail"]


def test_rbac_admin_access_success(client):
    """Test Admin token accessing Doctor-only and Admin-only endpoints returns 200 OK."""
    # Register & login admin
    client.post("/api/v1/auth/register", json={
        "email": "admin.rbac@medicare.com",
        "password": "password123",
        "full_name": "Admin RBAC",
        "role": UserRole.ADMIN.value,
    })
    token = client.post("/api/v1/auth/login", data={"username": "admin.rbac@medicare.com", "password": "password123"}).json()["access_token"]

    # Admin accesses doctor-only endpoint -> 200 OK
    doc_res = client.get("/api/v1/auth/doctor-only", headers={"Authorization": f"Bearer {token}"})
    assert doc_res.status_code == 200

    # Admin accesses admin-only endpoint -> 200 OK
    admin_res = client.get("/api/v1/auth/admin-only", headers={"Authorization": f"Bearer {token}"})
    assert admin_res.status_code == 200


def test_rbac_doctor_access_admin_endpoint_forbidden_403(client):
    """Test valid Doctor token accessing Admin-only endpoint returns 403 Forbidden."""
    client.post("/api/v1/auth/register", json={
        "email": "doc2.rbac@medicare.com",
        "password": "password123",
        "full_name": "Dr. Two",
        "role": UserRole.DOCTOR.value,
    })
    token = client.post("/api/v1/auth/login", data={"username": "doc2.rbac@medicare.com", "password": "password123"}).json()["access_token"]

    res = client.get("/api/v1/auth/admin-only", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert "Operation not permitted" in res.json()["detail"]
