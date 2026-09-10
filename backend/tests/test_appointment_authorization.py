"""Pytest suite for verifying Appointment Domain-Level Data Ownership & Role Authorization."""

from app.models.enums import AppointmentStatus, Gender, UserRole

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def test_appointment_domain_authorization_matrix(client):
    """Comprehensive test suite for Appointment role & ownership authorization rules."""
    # 1. Setup Doctor A & Doctor B
    doc_user_a = client.post("/api/v1/auth/register", json={"email": "apt.doc.a@medicare.com", "password": "password123", "full_name": "Dr. Apt A", "role": UserRole.DOCTOR.value}).json()
    doc_token_a = client.post("/api/v1/auth/login", data={"username": "apt.doc.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc_a = {"Authorization": f"Bearer {doc_token_a}"}
    doctor_a = client.post("/api/v1/doctors/", json={"user_id": doc_user_a["id"], "qualification": "MD", "specialty": "Cardiology", "consultation_fee": 1000.0, "room_no": "A-1"}).json()

    doc_user_b = client.post("/api/v1/auth/register", json={"email": "apt.doc.b@medicare.com", "password": "password123", "full_name": "Dr. Apt B", "role": UserRole.DOCTOR.value}).json()
    doc_token_b = client.post("/api/v1/auth/login", data={"username": "apt.doc.b@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc_b = {"Authorization": f"Bearer {doc_token_b}"}
    doctor_b = client.post("/api/v1/doctors/", json={"user_id": doc_user_b["id"], "qualification": "MD", "specialty": "Neurology", "consultation_fee": 1200.0, "room_no": "B-2"}).json()

    # Create schedules for Doctor A & Doctor B for all days
    for day in DAYS_OF_WEEK:
        client.post("/api/v1/schedules/", json={"doctor_id": doctor_a["id"], "day_of_week": day, "start_time": "08:00:00", "end_time": "20:00:00"}, headers=headers_doc_a)
        client.post("/api/v1/schedules/", json={"doctor_id": doctor_b["id"], "day_of_week": day, "start_time": "08:00:00", "end_time": "20:00:00"}, headers=headers_doc_b)

    # 2. Setup Patient A & Patient B
    pat_user_a = client.post("/api/v1/auth/register", json={"email": "apt.pat.a@medicare.com", "password": "password123", "full_name": "Patient Apt A", "role": UserRole.PATIENT.value}).json()
    pat_token_a = client.post("/api/v1/auth/login", data={"username": "apt.pat.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_a = {"Authorization": f"Bearer {pat_token_a}"}
    patient_a = client.post("/api/v1/patients/", json={"user_id": pat_user_a["id"], "gender": Gender.MALE.value}, headers=headers_pat_a).json()

    pat_user_b = client.post("/api/v1/auth/register", json={"email": "apt.pat.b@medicare.com", "password": "password123", "full_name": "Patient Apt B", "role": UserRole.PATIENT.value}).json()
    pat_token_b = client.post("/api/v1/auth/login", data={"username": "apt.pat.b@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_b = {"Authorization": f"Bearer {pat_token_b}"}
    patient_b = client.post("/api/v1/patients/", json={"user_id": pat_user_b["id"], "gender": Gender.FEMALE.value}, headers=headers_pat_b).json()

    # 3. Setup Receptionist & Admin
    rec_user = client.post("/api/v1/auth/register", json={"email": "apt.rec@medicare.com", "password": "password123", "full_name": "Rec Apt", "role": UserRole.RECEPTIONIST.value}).json()
    rec_token = client.post("/api/v1/auth/login", data={"username": "apt.rec@medicare.com", "password": "password123"}).json()["access_token"]
    headers_rec = {"Authorization": f"Bearer {rec_token}"}

    admin_user = client.post("/api/v1/auth/register", json={"email": "apt.admin@medicare.com", "password": "password123", "full_name": "Admin Apt", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "apt.admin@medicare.com", "password": "password123"}).json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # ================= PATIENT TESTS =================
    # Patient A creates appointment for self -> 201 Created
    apt_a_payload = {"patient_id": patient_a["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-09-25", "start_time": "10:00:00", "reason": "Checkup"}
    apt_a_res = client.post("/api/v1/appointments/", json=apt_a_payload, headers=headers_pat_a)
    assert apt_a_res.status_code == 201
    apt_a_id = apt_a_res.json()["id"]

    # Patient B creates appointment for self -> 201 Created
    apt_b_payload = {"patient_id": patient_b["id"], "doctor_id": doctor_b["id"], "appointment_date": "2026-09-25", "start_time": "11:00:00", "reason": "Neuro exam"}
    apt_b_res = client.post("/api/v1/appointments/", json=apt_b_payload, headers=headers_pat_b)
    assert apt_b_res.status_code == 201
    apt_b_id = apt_b_res.json()["id"]

    # Patient A CANNOT create appointment for Patient B -> 403 Forbidden
    apt_cross_create = client.post("/api/v1/appointments/", json={"patient_id": patient_b["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-09-25", "start_time": "14:00:00"}, headers=headers_pat_a)
    assert apt_cross_create.status_code == 403

    # Patient A GET own appointment -> 200 OK
    assert client.get(f"/api/v1/appointments/{apt_a_id}", headers=headers_pat_a).status_code == 200

    # Patient A GET Patient B appointment -> 403 Forbidden
    assert client.get(f"/api/v1/appointments/{apt_b_id}", headers=headers_pat_a).status_code == 403

    # Patient list contains ONLY own appointments
    pat_a_list = client.get("/api/v1/appointments/", headers=headers_pat_a)
    assert pat_a_list.status_code == 200
    assert len(pat_a_list.json()) == 1
    assert pat_a_list.json()[0]["id"] == apt_a_id

    # Patient A update own appointment -> 200 OK
    upd_pat_a = client.put(f"/api/v1/appointments/{apt_a_id}", json={"status": AppointmentStatus.CHECKED_IN.value}, headers=headers_pat_a)
    assert upd_pat_a.status_code == 200
    assert upd_pat_a.json()["status"] == "Checked In"

    # Patient A CANNOT update Patient B appointment -> 403 Forbidden
    assert client.put(f"/api/v1/appointments/{apt_b_id}", json={"status": AppointmentStatus.CHECKED_IN.value}, headers=headers_pat_a).status_code == 403

    # Patient A CANNOT delete Patient B appointment -> 403 Forbidden
    assert client.delete(f"/api/v1/appointments/{apt_b_id}", headers=headers_pat_a).status_code == 403

    # ================= DOCTOR TESTS =================
    # Doctor A GET own appointment (apt_a) -> 200 OK
    assert client.get(f"/api/v1/appointments/{apt_a_id}", headers=headers_doc_a).status_code == 200

    # Doctor A GET Doctor B appointment (apt_b) -> 403 Forbidden
    assert client.get(f"/api/v1/appointments/{apt_b_id}", headers=headers_doc_a).status_code == 403

    # Doctor A list contains ONLY Doctor A appointments
    doc_a_list = client.get("/api/v1/appointments/", headers=headers_doc_a)
    assert doc_a_list.status_code == 200
    assert len(doc_a_list.json()) == 1
    assert doc_a_list.json()[0]["id"] == apt_a_id

    # Doctor A CANNOT create arbitrary appointment -> 403 Forbidden
    doc_create = client.post("/api/v1/appointments/", json={"patient_id": patient_a["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-09-26", "start_time": "09:00:00"}, headers=headers_doc_a)
    assert doc_create.status_code == 403

    # Doctor A update own appointment -> 200 OK
    assert client.put(f"/api/v1/appointments/{apt_a_id}", json={"status": AppointmentStatus.IN_CONSULTATION.value}, headers=headers_doc_a).status_code == 200

    # Doctor A CANNOT update Doctor B appointment -> 403 Forbidden
    assert client.put(f"/api/v1/appointments/{apt_b_id}", json={"status": AppointmentStatus.COMPLETED.value}, headers=headers_doc_a).status_code == 403

    # Doctor A CANNOT delete appointment -> 403 Forbidden
    assert client.delete(f"/api/v1/appointments/{apt_a_id}", headers=headers_doc_a).status_code == 403

    # ================= RECEPTIONIST TESTS =================
    # Receptionist list all appointments -> 200 OK
    assert client.get("/api/v1/appointments/", headers=headers_rec).status_code == 200

    # Receptionist GET any appointment -> 200 OK
    assert client.get(f"/api/v1/appointments/{apt_a_id}", headers=headers_rec).status_code == 200

    # Receptionist create appointment -> 201 Created
    rec_apt = client.post("/api/v1/appointments/", json={"patient_id": patient_b["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-09-27", "start_time": "15:00:00"}, headers=headers_rec)
    assert rec_apt.status_code == 201
    rec_apt_id = rec_apt.json()["id"]

    # Receptionist update appointment -> 200 OK
    assert client.put(f"/api/v1/appointments/{rec_apt_id}", json={"status": AppointmentStatus.SCHEDULED.value}, headers=headers_rec).status_code == 200

    # Receptionist delete appointment -> 204 No Content
    assert client.delete(f"/api/v1/appointments/{rec_apt_id}", headers=headers_rec).status_code == 204

    # ================= ADMIN TESTS =================
    # Admin list all appointments -> 200 OK
    assert client.get("/api/v1/appointments/", headers=headers_admin).status_code == 200

    # Admin GET any appointment -> 200 OK
    assert client.get(f"/api/v1/appointments/{apt_a_id}", headers=headers_admin).status_code == 200

    # Admin delete appointment -> 204 No Content
    assert client.delete(f"/api/v1/appointments/{apt_a_id}", headers=headers_admin).status_code == 204

    # ================= SECURITY TESTS =================
    # Missing JWT -> 401
    assert client.get(f"/api/v1/appointments/{apt_b_id}").status_code == 401

    # Invalid JWT -> 401
    assert client.get(f"/api/v1/appointments/{apt_b_id}", headers={"Authorization": "Bearer bad_token"}).status_code == 401
