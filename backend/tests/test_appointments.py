"""Pytest suite for verifying Appointment CRUD API endpoints."""

from app.models.enums import AppointmentStatus, UserRole


def test_appointment_crud_full_lifecycle(client):
    """Test full Appointment CRUD lifecycle."""
    # 1. Register admin user for schedule management
    admin_user = client.post("/api/v1/auth/register", json={"email": "admin.apt@medicare.com", "password": "password123", "full_name": "Admin Apt", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "admin.apt@medicare.com", "password": "password123"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Register doctor user & onboard doctor
    doc_user = client.post(
        "/api/v1/auth/register",
        json={"email": "apt.doc@medicare.com", "password": "password123", "full_name": "Dr. Mehta", "role": UserRole.DOCTOR.value},
    ).json()
    doctor = client.post(
        "/api/v1/doctors/",
        json={"user_id": doc_user["id"], "qualification": "MD", "specialty": "Neurology", "consultation_fee": 900.0, "room_no": "B-101"},
    ).json()

    # 3. Create schedule for Doctor on Tuesday (2026-09-15)
    client.post(
        "/api/v1/schedules/",
        json={"doctor_id": doctor["id"], "day_of_week": "Tuesday", "start_time": "09:00:00", "end_time": "17:00:00"},
        headers=admin_headers,
    )

    # 4. Register patient user & profile
    pat_user = client.post(
        "/api/v1/auth/register",
        json={"email": "apt.pat@medicare.com", "password": "password123", "full_name": "Vikram Singh", "role": UserRole.PATIENT.value},
    ).json()
    pat_token = client.post("/api/v1/auth/login", data={"username": "apt.pat@medicare.com", "password": "password123"}).json()["access_token"]
    pat_headers = {"Authorization": f"Bearer {pat_token}"}

    patient = client.post(
        "/api/v1/patients/",
        json={"user_id": pat_user["id"], "gender": "Male"},
        headers=pat_headers,
    ).json()

    # 5. POST /api/v1/appointments/ (Create by Patient for self)
    apt_payload = {
        "patient_id": patient["id"],
        "doctor_id": doctor["id"],
        "appointment_date": "2026-09-15",
        "start_time": "11:00:00",
        "reason": "Severe headache",
    }
    create_res = client.post("/api/v1/appointments/", json=apt_payload, headers=pat_headers)
    assert create_res.status_code == 201
    apt_id = create_res.json()["id"]

    # 6. GET /api/v1/appointments/ (List by Patient for self)
    list_res = client.get("/api/v1/appointments/", headers=pat_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 7. GET /api/v1/appointments/{apt_id} (Read single)
    read_res = client.get(f"/api/v1/appointments/{apt_id}", headers=pat_headers)
    assert read_res.status_code == 200
    assert read_res.json()["reason"] == "Severe headache"

    # 8. PUT /api/v1/appointments/{apt_id} (Update status)
    update_res = client.put(
        f"/api/v1/appointments/{apt_id}",
        json={"status": AppointmentStatus.CHECKED_IN.value},
        headers=pat_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "Checked In"

    # 9. DELETE /api/v1/appointments/{apt_id} (Delete)
    delete_res = client.delete(f"/api/v1/appointments/{apt_id}", headers=pat_headers)
    assert delete_res.status_code == 204

    # 10. Verify 404
    read_deleted = client.get(f"/api/v1/appointments/{apt_id}", headers=pat_headers)
    assert read_deleted.status_code == 404
