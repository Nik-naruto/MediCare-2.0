"""Pytest suite for verifying Doctor CRUD API endpoints."""

from app.models.enums import UserRole


def test_doctor_crud_full_lifecycle(client):
    """Test full Doctor CRUD lifecycle: POST -> GET list -> GET id -> PUT -> DELETE -> GET 404."""
    # 1. Register user
    user_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "doctor.crud@medicare.com",
            "password": "securepassword123",
            "full_name": "Dr. Sunita Rao",
            "role": UserRole.DOCTOR.value,
        },
    )
    user_id = user_res.json()["id"]

    # 2. POST /api/v1/doctors/ (Create)
    create_res = client.post(
        "/api/v1/doctors/",
        json={
            "user_id": user_id,
            "qualification": "MBBS, MD",
            "specialty": "Cardiology",
            "experience_years": 12,
            "consultation_fee": 1000.0,
            "room_no": "C-204",
            "is_available": True,
        },
    )
    assert create_res.status_code == 201
    doctor_id = create_res.json()["id"]

    # 3. GET /api/v1/doctors/ (List)
    list_res = client.get("/api/v1/doctors/")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 4. GET /api/v1/doctors/{doctor_id} (Read single)
    read_res = client.get(f"/api/v1/doctors/{doctor_id}")
    assert read_res.status_code == 200
    assert read_res.json()["specialty"] == "Cardiology"

    # 5. PUT /api/v1/doctors/{doctor_id} (Update)
    update_res = client.put(
        f"/api/v1/doctors/{doctor_id}",
        json={"consultation_fee": 1200.0, "is_available": False},
    )
    assert update_res.status_code == 200
    assert update_res.json()["consultation_fee"] == 1200.0
    assert update_res.json()["is_available"] is False

    # 6. DELETE /api/v1/doctors/{doctor_id} (Delete)
    delete_res = client.delete(f"/api/v1/doctors/{doctor_id}")
    assert delete_res.status_code == 204

    # 7. GET /api/v1/doctors/{doctor_id} (Verify 404)
    read_deleted = client.get(f"/api/v1/doctors/{doctor_id}")
    assert read_deleted.status_code == 404
