"""Pytest suite for verifying Doctor Schedule Role Authorization & Server-Side Shift Validation."""

from app.models.enums import UserRole


def test_doctor_schedule_authorization_and_validation(client):
    """Comprehensive test suite for Doctor Schedule authorization, day/shift validation, and security rules."""
    # 1. Setup Doctor A & Doctor B
    doc_user_a = client.post("/api/v1/auth/register", json={"email": "sched.doc.a@medicare.com", "password": "password123", "full_name": "Dr. Sched A", "role": UserRole.DOCTOR.value}).json()
    doc_token_a = client.post("/api/v1/auth/login", data={"username": "sched.doc.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc_a = {"Authorization": f"Bearer {doc_token_a}"}
    doctor_a = client.post("/api/v1/doctors/", json={"user_id": doc_user_a["id"], "qualification": "MD", "specialty": "Cardiology", "consultation_fee": 1000.0, "room_no": "A-1"}).json()

    doc_user_b = client.post("/api/v1/auth/register", json={"email": "sched.doc.b@medicare.com", "password": "password123", "full_name": "Dr. Sched B", "role": UserRole.DOCTOR.value}).json()
    doc_token_b = client.post("/api/v1/auth/login", data={"username": "sched.doc.b@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc_b = {"Authorization": f"Bearer {doc_token_b}"}
    doctor_b = client.post("/api/v1/doctors/", json={"user_id": doc_user_b["id"], "qualification": "MD", "specialty": "Neurology", "consultation_fee": 1200.0, "room_no": "B-2"}).json()

    # 2. Setup Patient, Receptionist, Admin
    pat_user = client.post("/api/v1/auth/register", json={"email": "sched.pat@medicare.com", "password": "password123", "full_name": "Patient Sched", "role": UserRole.PATIENT.value}).json()
    pat_token = client.post("/api/v1/auth/login", data={"username": "sched.pat@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat = {"Authorization": f"Bearer {pat_token}"}

    rec_user = client.post("/api/v1/auth/register", json={"email": "sched.rec@medicare.com", "password": "password123", "full_name": "Rec Sched", "role": UserRole.RECEPTIONIST.value}).json()
    rec_token = client.post("/api/v1/auth/login", data={"username": "sched.rec@medicare.com", "password": "password123"}).json()["access_token"]
    headers_rec = {"Authorization": f"Bearer {rec_token}"}

    admin_user = client.post("/api/v1/auth/register", json={"email": "sched.admin@medicare.com", "password": "password123", "full_name": "Admin Sched", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "sched.admin@medicare.com", "password": "password123"}).json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # 5. Doctor A can create own schedule -> 201 Created
    sched_a_res = client.post("/api/v1/schedules/", json={"doctor_id": doctor_a["id"], "day_of_week": "Monday", "start_time": "09:00:00", "end_time": "13:00:00"}, headers=headers_doc_a)
    assert sched_a_res.status_code == 201
    sched_a_id = sched_a_res.json()["id"]

    # 1. Patient can view schedules -> 200 OK
    assert client.get("/api/v1/schedules/", headers=headers_pat).status_code == 200
    assert client.get(f"/api/v1/schedules/{sched_a_id}", headers=headers_pat).status_code == 200

    # 2. Patient cannot create schedule -> 403 Forbidden
    assert client.post("/api/v1/schedules/", json={"doctor_id": doctor_a["id"], "day_of_week": "Monday", "start_time": "14:00:00", "end_time": "18:00:00"}, headers=headers_pat).status_code == 403

    # 3. Patient cannot update schedule -> 403 Forbidden
    assert client.put(f"/api/v1/schedules/{sched_a_id}", json={"start_time": "10:00:00"}, headers=headers_pat).status_code == 403

    # 4. Patient cannot delete schedule -> 403 Forbidden
    assert client.delete(f"/api/v1/schedules/{sched_a_id}", headers=headers_pat).status_code == 403

    # 6. Doctor A can update own schedule -> 200 OK
    upd_sched_a = client.put(f"/api/v1/schedules/{sched_a_id}", json={"start_time": "08:30:00"}, headers=headers_doc_a)
    assert upd_sched_a.status_code == 200

    # 9. Doctor A cannot create schedule for Doctor B -> 403 Forbidden
    assert client.post("/api/v1/schedules/", json={"doctor_id": doctor_b["id"], "day_of_week": "Monday", "start_time": "09:00:00", "end_time": "13:00:00"}, headers=headers_doc_a).status_code == 403

    # Doctor B creates schedule for Doctor B
    sched_b_res = client.post("/api/v1/schedules/", json={"doctor_id": doctor_b["id"], "day_of_week": "Monday", "start_time": "09:00:00", "end_time": "13:00:00"}, headers=headers_doc_b)
    assert sched_b_res.status_code == 201
    sched_b_id = sched_b_res.json()["id"]

    # 8. Doctor A cannot modify or delete Doctor B's schedule -> 403 Forbidden
    assert client.put(f"/api/v1/schedules/{sched_b_id}", json={"start_time": "10:00:00"}, headers=headers_doc_a).status_code == 403
    assert client.delete(f"/api/v1/schedules/{sched_b_id}", headers=headers_doc_a).status_code == 403

    # 10. Receptionist can manage schedules -> 201 Created / 200 OK
    rec_sched = client.post("/api/v1/schedules/", json={"doctor_id": doctor_a["id"], "day_of_week": "Tuesday", "start_time": "10:00:00", "end_time": "14:00:00"}, headers=headers_rec)
    assert rec_sched.status_code == 201

    # 11. Admin can manage all schedules -> 201 / 204
    adm_sched = client.post("/api/v1/schedules/", json={"doctor_id": doctor_b["id"], "day_of_week": "Tuesday", "start_time": "10:00:00", "end_time": "14:00:00"}, headers=headers_admin)
    assert adm_sched.status_code == 201
    assert client.delete(f"/api/v1/schedules/{adm_sched.json()['id']}", headers=headers_admin).status_code == 204

    # 7. Doctor B can delete own schedule -> 204 No Content
    assert client.delete(f"/api/v1/schedules/{sched_b_id}", headers=headers_doc_b).status_code == 204

    # ================= SCHEDULE VALIDATION TESTS =================
    # 15. start_time >= end_time -> 400 Bad Request
    inv_time = client.post("/api/v1/schedules/", json={"doctor_id": doctor_a["id"], "day_of_week": "Wednesday", "start_time": "14:00:00", "end_time": "10:00:00"}, headers=headers_doc_a)
    assert inv_time.status_code == 400
    assert "start_time must be strictly before end_time" in inv_time.json()["detail"]

    # 16. overlapping schedule for same doctor/day -> 400 Bad Request
    # Doctor A already has Monday 08:30 - 13:00 (sched_a_id)
    overlap = client.post("/api/v1/schedules/", json={"doctor_id": doctor_a["id"], "day_of_week": "Monday", "start_time": "12:00:00", "end_time": "16:00:00"}, headers=headers_doc_a)
    assert overlap.status_code == 400
    assert "overlapping schedule" in overlap.json()["detail"]

    # 17. valid adjacent schedules -> allowed
    adjacent = client.post("/api/v1/schedules/", json={"doctor_id": doctor_a["id"], "day_of_week": "Monday", "start_time": "14:00:00", "end_time": "18:00:00"}, headers=headers_doc_a)
    assert adjacent.status_code == 201

    # ================= AUTHENTICATION & SECURITY =================
    # 12. Missing JWT -> 401 Unauthorized
    assert client.get(f"/api/v1/schedules/{sched_a_id}").status_code == 401

    # 13. Invalid JWT -> 401 Unauthorized
    assert client.get(f"/api/v1/schedules/{sched_a_id}", headers={"Authorization": "Bearer bad_token"}).status_code == 401

    # 14. Non-existent schedule -> 404 Not Found
    assert client.get("/api/v1/schedules/99999", headers=headers_admin).status_code == 404
