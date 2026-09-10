"""Pytest suite for verifying Doctor -> Patient Domain-Level Relationship Authorization."""

from app.models.enums import Gender, UserRole

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def test_doctor_patient_authorization_rules(client):
    """Test Doctor domain authorization rules based on Appointment relationships."""
    # 1. Setup Doctor A
    doc_user_a = client.post("/api/v1/auth/register", json={
        "email": "doc.a@medicare.com", "password": "password123", "full_name": "Dr. Doctor A", "role": UserRole.DOCTOR.value
    }).json()
    doc_token_a = client.post("/api/v1/auth/login", data={"username": "doc.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc_a = {"Authorization": f"Bearer {doc_token_a}"}

    doctor_a = client.post("/api/v1/doctors/", json={
        "user_id": doc_user_a["id"], "qualification": "MD", "specialty": "Cardiology", "consultation_fee": 1000.0, "room_no": "A-1"
    }).json()

    # Create Doctor Schedules for Doctor A
    for day in DAYS_OF_WEEK:
        client.post("/api/v1/schedules/", json={"doctor_id": doctor_a["id"], "day_of_week": day, "start_time": "08:00:00", "end_time": "20:00:00"}, headers=headers_doc_a)

    # 2. Setup Patient A
    pat_user_a = client.post("/api/v1/auth/register", json={
        "email": "pat.a@medicare.com", "password": "password123", "full_name": "Patient Alpha", "role": UserRole.PATIENT.value
    }).json()
    pat_token_a = client.post("/api/v1/auth/login", data={"username": "pat.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_a = {"Authorization": f"Bearer {pat_token_a}"}

    patient_a = client.post("/api/v1/patients/", json={"user_id": pat_user_a["id"], "gender": Gender.MALE.value}, headers=headers_pat_a).json()

    # 3. Setup Patient B (no appointment initially with Doctor A)
    pat_user_b = client.post("/api/v1/auth/register", json={
        "email": "pat.b@medicare.com", "password": "password123", "full_name": "Patient Beta", "role": UserRole.PATIENT.value
    }).json()
    pat_token_b = client.post("/api/v1/auth/login", data={"username": "pat.b@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_b = {"Authorization": f"Bearer {pat_token_b}"}

    patient_b = client.post("/api/v1/patients/", json={"user_id": pat_user_b["id"], "gender": Gender.FEMALE.value}, headers=headers_pat_b).json()

    # 4. Setup Admin User
    admin_user = client.post("/api/v1/auth/register", json={
        "email": "admin.docauth@medicare.com", "password": "password123", "full_name": "Admin User", "role": UserRole.ADMIN.value
    }).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "admin.docauth@medicare.com", "password": "password123"}).json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # --- BEFORE APPOINTMENT ---
    # Doctor A CANNOT GET Patient A profile (no appointment yet) -> 403 Forbidden
    res_no_apt = client.get(f"/api/v1/patients/{patient_a['id']}", headers=headers_doc_a)
    assert res_no_apt.status_code == 403
    assert "No active appointment relationship" in res_no_apt.json()["detail"]

    # 5. Book Appointment between Patient A and Doctor A with patient headers
    client.post("/api/v1/appointments/", json={
        "patient_id": patient_a["id"],
        "doctor_id": doctor_a["id"],
        "appointment_date": "2026-09-20",
        "start_time": "09:00:00",
        "reason": "Cardiovascular checkup",
    }, headers=headers_pat_a)

    # --- AFTER APPOINTMENT ---
    # TEST 1: Doctor A CAN GET Patient A when Appointment exists (200 OK)
    res_apt_exists = client.get(f"/api/v1/patients/{patient_a['id']}", headers=headers_doc_a)
    assert res_apt_exists.status_code == 200
    assert res_apt_exists.json()["id"] == patient_a["id"]

    # TEST 2: Doctor A CANNOT GET Patient B (no appointment exists) -> 403 Forbidden
    res_other_pat = client.get(f"/api/v1/patients/{patient_b['id']}", headers=headers_doc_a)
    assert res_other_pat.status_code == 403

    # TEST 3: Doctor A patient list contains ONLY connected patients (Patient A)
    list_doc_a = client.get("/api/v1/patients/", headers=headers_doc_a)
    assert list_doc_a.status_code == 200
    doc_a_patients = list_doc_a.json()
    assert len(doc_a_patients) == 1
    assert doc_a_patients[0]["id"] == patient_a["id"]

    # TEST 4: Doctor A CANNOT UPDATE Patient A profile -> 403 Forbidden
    res_upd_doc = client.put(f"/api/v1/patients/{patient_a['id']}", json={"blood_group": "AB+"}, headers=headers_doc_a)
    assert res_upd_doc.status_code == 403
    assert "Doctors are not permitted to modify patient" in res_upd_doc.json()["detail"]

    # TEST 5: Doctor A CANNOT DELETE Patient A profile -> 403 Forbidden
    res_del_doc = client.delete(f"/api/v1/patients/{patient_a['id']}", headers=headers_doc_a)
    assert res_del_doc.status_code == 403

    # TEST 6: Admin can GET any patient (Patient B) -> 200 OK
    res_admin_get = client.get(f"/api/v1/patients/{patient_b['id']}", headers=headers_admin)
    assert res_admin_get.status_code == 200

    # TEST 7: Patient ownership still works (Patient A CANNOT GET Patient B) -> 403 Forbidden
    res_pat_cross = client.get(f"/api/v1/patients/{patient_b['id']}", headers=headers_pat_a)
    assert res_pat_cross.status_code == 403

    # TEST 8: Missing token -> 401 Unauthorized
    assert client.get(f"/api/v1/patients/{patient_a['id']}").status_code == 401

    # TEST 9: Invalid token -> 401 Unauthorized
    assert client.get(f"/api/v1/patients/{patient_a['id']}", headers={"Authorization": "Bearer bad_token"}).status_code == 401

    # TEST 10: Non-existent patient -> 404 Not Found
    assert client.get("/api/v1/patients/99999", headers=headers_doc_a).status_code == 404
