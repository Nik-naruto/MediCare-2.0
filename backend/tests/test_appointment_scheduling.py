"""Pytest suite for verifying Hospital Appointment Scheduling Engine & Conflict Detection."""

from app.models.enums import AppointmentStatus, Gender, UserRole


def test_appointment_scheduling_engine_and_conflicts(client):
    """Comprehensive test suite for Appointment Scheduling Engine, Availability, Conflicts, and Security Attacks."""
    # 1. Setup Doctor A & Doctor B
    doc_user_a = client.post("/api/v1/auth/register", json={"email": "eng.doc.a@medicare.com", "password": "password123", "full_name": "Dr. Eng A", "role": UserRole.DOCTOR.value}).json()
    doc_token_a = client.post("/api/v1/auth/login", data={"username": "eng.doc.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc_a = {"Authorization": f"Bearer {doc_token_a}"}
    doctor_a = client.post("/api/v1/doctors/", json={"user_id": doc_user_a["id"], "qualification": "MD", "specialty": "Cardiology", "consultation_fee": 1000.0, "room_no": "A-1"}, headers=headers_doc_a).json()

    doc_user_b = client.post("/api/v1/auth/register", json={"email": "eng.doc.b@medicare.com", "password": "password123", "full_name": "Dr. Eng B", "role": UserRole.DOCTOR.value}).json()
    doc_token_b = client.post("/api/v1/auth/login", data={"username": "eng.doc.b@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc_b = {"Authorization": f"Bearer {doc_token_b}"}
    doctor_b = client.post("/api/v1/doctors/", json={"user_id": doc_user_b["id"], "qualification": "MD", "specialty": "Neurology", "consultation_fee": 1200.0, "room_no": "B-2"}, headers=headers_doc_b).json()

    # Create Shift Schedule for Doctor A: Thursday (2026-10-15) 10:00:00 - 14:00:00
    # Note: 2026-10-15 is a Thursday
    client.post("/api/v1/schedules/", json={"doctor_id": doctor_a["id"], "day_of_week": "Thursday", "start_time": "10:00:00", "end_time": "14:00:00"}, headers=headers_doc_a)
    client.post("/api/v1/schedules/", json={"doctor_id": doctor_b["id"], "day_of_week": "Thursday", "start_time": "10:00:00", "end_time": "14:00:00"}, headers=headers_doc_b)

    # 2. Setup Patient A & Patient B
    pat_user_a = client.post("/api/v1/auth/register", json={"email": "eng.pat.a@medicare.com", "password": "password123", "full_name": "Patient Eng A", "role": UserRole.PATIENT.value}).json()
    pat_token_a = client.post("/api/v1/auth/login", data={"username": "eng.pat.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_a = {"Authorization": f"Bearer {pat_token_a}"}
    patient_a = client.post("/api/v1/patients/", json={"user_id": pat_user_a["id"], "gender": Gender.MALE.value}, headers=headers_pat_a).json()

    pat_user_b = client.post("/api/v1/auth/register", json={"email": "eng.pat.b@medicare.com", "password": "password123", "full_name": "Patient Eng B", "role": UserRole.PATIENT.value}).json()
    pat_token_b = client.post("/api/v1/auth/login", data={"username": "eng.pat.b@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_b = {"Authorization": f"Bearer {pat_token_b}"}
    patient_b = client.post("/api/v1/patients/", json={"user_id": pat_user_b["id"], "gender": Gender.FEMALE.value}, headers=headers_pat_b).json()

    # 3. Setup Receptionist & Admin
    rec_user = client.post("/api/v1/auth/register", json={"email": "eng.rec@medicare.com", "password": "password123", "full_name": "Rec Eng", "role": UserRole.RECEPTIONIST.value}).json()
    rec_token = client.post("/api/v1/auth/login", data={"username": "eng.rec@medicare.com", "password": "password123"}).json()["access_token"]
    headers_rec = {"Authorization": f"Bearer {rec_token}"}

    admin_user = client.post("/api/v1/auth/register", json={"email": "eng.admin@medicare.com", "password": "password123", "full_name": "Admin Eng", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "eng.admin@medicare.com", "password": "password123"}).json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # ================= APPOINTMENT BOOKING ENGINE TESTS =================
    # 18. Valid appointment within doctor schedule -> 201 Created
    apt1_res = client.post("/api/v1/appointments/", json={
        "patient_id": patient_a["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-10-15", "start_time": "10:00:00", "end_time": "10:30:00"
    }, headers=headers_pat_a)
    assert apt1_res.status_code == 201
    apt1_id = apt1_res.json()["id"]

    # 19. Appointment outside schedule (wrong day - Friday) -> 400 Bad Request
    out_day = client.post("/api/v1/appointments/", json={
        "patient_id": patient_a["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-10-16", "start_time": "10:00:00", "end_time": "10:30:00"
    }, headers=headers_pat_a)
    assert out_day.status_code == 400
    assert "not available on Friday" in out_day.json()["detail"]

    # 20. Appointment before schedule start (09:00:00 when shift starts at 10:00:00) -> 400 Bad Request
    before_start = client.post("/api/v1/appointments/", json={
        "patient_id": patient_b["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-10-15", "start_time": "09:30:00", "end_time": "10:00:00"
    }, headers=headers_pat_b)
    assert before_start.status_code == 400
    assert "falls outside doctor's scheduled working hours" in before_start.json()["detail"]

    # 21. Appointment after schedule end (14:00:00 - 14:30:00 when shift ends at 14:00:00) -> 400 Bad Request
    after_end = client.post("/api/v1/appointments/", json={
        "patient_id": patient_b["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-10-15", "start_time": "14:00:00", "end_time": "14:30:00"
    }, headers=headers_pat_b)
    assert after_end.status_code == 400

    # 22. Appointment crossing schedule boundary (13:45:00 - 14:15:00) -> 400 Bad Request
    crossing = client.post("/api/v1/appointments/", json={
        "patient_id": patient_b["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-10-15", "start_time": "13:45:00", "end_time": "14:15:00"
    }, headers=headers_pat_b)
    assert crossing.status_code == 400

    # 24. Appointment in past -> 400 Bad Request
    past_apt = client.post("/api/v1/appointments/", json={
        "patient_id": patient_a["id"], "doctor_id": doctor_a["id"], "appointment_date": "2020-01-01", "start_time": "10:00:00", "end_time": "10:30:00"
    }, headers=headers_pat_a)
    assert past_apt.status_code == 400
    assert "cannot be scheduled in the past" in past_apt.json()["detail"]

    # 25. start_time >= end_time -> 400 Bad Request
    inv_start = client.post("/api/v1/appointments/", json={
        "patient_id": patient_a["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-10-15", "start_time": "11:30:00", "end_time": "10:30:00"
    }, headers=headers_pat_a)
    assert inv_start.status_code == 400
    assert "start time must be before end time" in inv_start.json()["detail"]

    # ================= DOCTOR CONFLICT TESTS =================
    # 26. Overlapping doctor appointment (Doctor A is booked 10:00 - 10:30, Patient B requests 10:15 - 10:45) -> 400 Bad Request
    doc_overlap = client.post("/api/v1/appointments/", json={
        "patient_id": patient_b["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-10-15", "start_time": "10:15:00", "end_time": "10:45:00"
    }, headers=headers_pat_b)
    assert doc_overlap.status_code == 400
    assert "Doctor already has an appointment" in doc_overlap.json()["detail"]

    # 27. Adjacent doctor appointment (Doctor A booked 10:00 - 10:30, Patient B requests 10:30 - 11:00) -> 201 Created
    doc_adjacent = client.post("/api/v1/appointments/", json={
        "patient_id": patient_b["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-10-15", "start_time": "10:30:00", "end_time": "11:00:00"
    }, headers=headers_pat_b)
    assert doc_adjacent.status_code == 201
    apt2_id = doc_adjacent.json()["id"]

    # 28. Cancelled appointment does not block new doctor booking
    client.delete(f"/api/v1/appointments/{apt2_id}", headers=headers_pat_b)  # Cancel apt2
    cancel_noblock = client.post("/api/v1/appointments/", json={
        "patient_id": patient_b["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-10-15", "start_time": "10:30:00", "end_time": "11:00:00"
    }, headers=headers_pat_b)
    assert cancel_noblock.status_code == 201

    # ================= PATIENT CONFLICT TESTS =================
    # Patient A is booked with Doctor A at 10:00 - 10:30
    # 29. Overlapping patient appointment (Patient A attempts booking Doctor B at 10:15 - 10:45) -> 400 Bad Request
    pat_overlap = client.post("/api/v1/appointments/", json={
        "patient_id": patient_a["id"], "doctor_id": doctor_b["id"], "appointment_date": "2026-10-15", "start_time": "10:15:00", "end_time": "10:45:00"
    }, headers=headers_pat_a)
    assert pat_overlap.status_code == 400
    assert "Patient already has an appointment" in pat_overlap.json()["detail"]

    # 30. Adjacent patient appointment (Patient A books Doctor B at 10:30 - 11:00) -> 201 Created
    pat_adjacent = client.post("/api/v1/appointments/", json={
        "patient_id": patient_a["id"], "doctor_id": doctor_b["id"], "appointment_date": "2026-10-15", "start_time": "10:30:00", "end_time": "11:00:00"
    }, headers=headers_pat_a)
    assert pat_adjacent.status_code == 201

    # ================= UPDATE VALIDATIONS =================
    # 38. Updating appointment into doctor conflict -> 400 Bad Request
    upd_doc_conflict = client.put(f"/api/v1/appointments/{pat_adjacent.json()['id']}", json={"start_time": "10:00:00", "end_time": "10:30:00"}, headers=headers_pat_a)
    assert upd_doc_conflict.status_code == 400

    # 41. Updating appointment to past time -> 400 Bad Request
    upd_past = client.put(f"/api/v1/appointments/{pat_adjacent.json()['id']}", json={"appointment_date": "2020-01-01"}, headers=headers_pat_a)
    assert upd_past.status_code == 400

    # ================= SECURITY ATTACKS & AUTHORIZATION =================
    # 32. Patient A cannot book for Patient B -> 403 Forbidden
    assert client.post("/api/v1/appointments/", json={
        "patient_id": patient_b["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-10-15", "start_time": "11:00:00"
    }, headers=headers_pat_a).status_code == 403

    # 33. Doctor A cannot create appointments -> 403 Forbidden
    assert client.post("/api/v1/appointments/", json={
        "patient_id": patient_a["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-10-15", "start_time": "11:00:00"
    }, headers=headers_doc_a).status_code == 403

    # 36. Receptionist can schedule appointments -> 201 Created
    rec_book = client.post("/api/v1/appointments/", json={
        "patient_id": patient_b["id"], "doctor_id": doctor_b["id"], "appointment_date": "2026-10-15", "start_time": "11:30:00", "end_time": "12:00:00"
    }, headers=headers_rec)
    assert rec_book.status_code == 201

    # 37. Admin can schedule appointments -> 201 Created
    adm_book = client.post("/api/v1/appointments/", json={
        "patient_id": patient_a["id"], "doctor_id": doctor_b["id"], "appointment_date": "2026-10-15", "start_time": "12:00:00", "end_time": "12:30:00"
    }, headers=headers_admin)
    assert adm_book.status_code == 201

    # 45. Unauthenticated schedule access -> 401
    assert client.get("/api/v1/schedules/").status_code == 401

    # 46. Unauthenticated appointment access -> 401
    assert client.get(f"/api/v1/appointments/{apt1_id}").status_code == 401
