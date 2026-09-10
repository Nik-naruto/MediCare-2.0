"""Pytest suite for verifying Patient CRUD API endpoints with authentication."""

from app.models.enums import Gender, UserRole


def test_patient_crud_full_lifecycle(client):
    """Test full Patient CRUD lifecycle with authenticated user."""
    # 1. Register user & login
    email = "patient.crud@medicare.com"
    pwd = "securepassword123"
    user_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": pwd,
            "full_name": "Rohan Gupta",
            "role": UserRole.PATIENT.value,
        },
    )
    user_id = user_res.json()["id"]

    login_res = client.post("/api/v1/auth/login", data={"username": email, "password": pwd})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. POST /api/v1/patients/ (Create profile for self)
    create_res = client.post(
        "/api/v1/patients/",
        json={
            "user_id": user_id,
            "gender": Gender.MALE.value,
            "date_of_birth": "1995-05-15",
            "blood_group": "O+",
            "address": "123 Healthcare Way",
            "emergency_contact": "+919876543210",
            "allergies": "Penicillin",
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    patient_id = create_res.json()["id"]

    # 3. GET /api/v1/patients/ (List - returns own profile)
    list_res = client.get("/api/v1/patients/", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["id"] == patient_id

    # 4. GET /api/v1/patients/{patient_id} (Read single)
    read_res = client.get(f"/api/v1/patients/{patient_id}", headers=headers)
    assert read_res.status_code == 200
    assert read_res.json()["blood_group"] == "O+"

    # 5. PUT /api/v1/patients/{patient_id} (Update)
    update_res = client.put(
        f"/api/v1/patients/{patient_id}",
        json={"blood_group": "AB+", "allergies": "Dust, Penicillin"},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["blood_group"] == "AB+"

    # 6. DELETE /api/v1/patients/{patient_id} (Delete)
    delete_res = client.delete(f"/api/v1/patients/{patient_id}", headers=headers)
    assert delete_res.status_code == 204

    # 7. GET /api/v1/patients/{patient_id} (Verify 404)
    read_deleted = client.get(f"/api/v1/patients/{patient_id}", headers=headers)
    assert read_deleted.status_code == 404
