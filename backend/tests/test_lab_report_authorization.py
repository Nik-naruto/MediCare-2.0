"""Pytest suite for verifying Lab Report Domain-Level Ownership & Relationship Authorization."""

from app.models.enums import Gender, UserRole

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def test_lab_report_domain_authorization_matrix(client):
    """Comprehensive test suite for Lab Report role, ownership, and security attack scenarios."""
    # 1. Setup Doctor A & Doctor B
    doc_user_a = client.post("/api/v1/auth/register", json={"email": "lab.doc.a@medicare.com", "password": "password123", "full_name": "Dr. Lab A", "role": UserRole.DOCTOR.value}).json()
    doc_token_a = client.post("/api/v1/auth/login", data={"username": "lab.doc.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc_a = {"Authorization": f"Bearer {doc_token_a}"}
    doctor_a = client.post("/api/v1/doctors/", json={"user_id": doc_user_a["id"], "qualification": "MD", "specialty": "Pathology", "consultation_fee": 1000.0, "room_no": "A-1"}).json()

    doc_user_b = client.post("/api/v1/auth/register", json={"email": "lab.doc.b@medicare.com", "password": "password123", "full_name": "Dr. Lab B", "role": UserRole.DOCTOR.value}).json()
    doc_token_b = client.post("/api/v1/auth/login", data={"username": "lab.doc.b@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc_b = {"Authorization": f"Bearer {doc_token_b}"}
    doctor_b = client.post("/api/v1/doctors/", json={"user_id": doc_user_b["id"], "qualification": "MD", "specialty": "Radiology", "consultation_fee": 1200.0, "room_no": "B-2"}).json()

    for day in DAYS_OF_WEEK:
        client.post("/api/v1/schedules/", json={"doctor_id": doctor_a["id"], "day_of_week": day, "start_time": "08:00:00", "end_time": "20:00:00"}, headers=headers_doc_a)
        client.post("/api/v1/schedules/", json={"doctor_id": doctor_b["id"], "day_of_week": day, "start_time": "08:00:00", "end_time": "20:00:00"}, headers=headers_doc_b)

    # 2. Setup Patient A & Patient B
    pat_user_a = client.post("/api/v1/auth/register", json={"email": "lab.pat.a@medicare.com", "password": "password123", "full_name": "Patient Lab A", "role": UserRole.PATIENT.value}).json()
    pat_token_a = client.post("/api/v1/auth/login", data={"username": "lab.pat.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_a = {"Authorization": f"Bearer {pat_token_a}"}
    patient_a = client.post("/api/v1/patients/", json={"user_id": pat_user_a["id"], "gender": Gender.MALE.value}, headers=headers_pat_a).json()

    pat_user_b = client.post("/api/v1/auth/register", json={"email": "lab.pat.b@medicare.com", "password": "password123", "full_name": "Patient Lab B", "role": UserRole.PATIENT.value}).json()
    pat_token_b = client.post("/api/v1/auth/login", data={"username": "lab.pat.b@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_b = {"Authorization": f"Bearer {pat_token_b}"}
    patient_b = client.post("/api/v1/patients/", json={"user_id": pat_user_b["id"], "gender": Gender.FEMALE.value}, headers=headers_pat_b).json()

    # 3. Setup Receptionist & Admin
    rec_user = client.post("/api/v1/auth/register", json={"email": "lab.rec@medicare.com", "password": "password123", "full_name": "Receptionist Lab", "role": UserRole.RECEPTIONIST.value}).json()
    rec_token = client.post("/api/v1/auth/login", data={"username": "lab.rec@medicare.com", "password": "password123"}).json()["access_token"]
    headers_rec = {"Authorization": f"Bearer {rec_token}"}

    admin_user = client.post("/api/v1/auth/register", json={"email": "lab.admin@medicare.com", "password": "password123", "full_name": "Admin Lab", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "lab.admin@medicare.com", "password": "password123"}).json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # 4. Create appointment between Patient A and Doctor A
    client.post("/api/v1/appointments/", json={"patient_id": patient_a["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-09-30", "start_time": "10:00:00"}, headers=headers_pat_a)

    # 5. Doctor A creates Lab Report for connected Patient A -> 201 Created
    lab_a_res = client.post("/api/v1/lab-reports/", json={"patient_id": patient_a["id"], "test_name": "Lipid Profile", "request_date": "2026-09-30"}, headers=headers_doc_a)
    assert lab_a_res.status_code == 201
    lab_a_id = lab_a_res.json()["id"]

    # 6. Admin creates Lab Report for Patient B
    lab_b_res = client.post("/api/v1/lab-reports/", json={"patient_id": patient_b["id"], "test_name": "Thyroid Profile", "request_date": "2026-09-30"}, headers=headers_admin)
    assert lab_b_res.status_code == 201
    lab_b_id = lab_b_res.json()["id"]

    # ================= PATIENT TESTS =================
    # 1. Patient A can list own lab reports -> 200 OK
    pat_list = client.get("/api/v1/lab-reports/", headers=headers_pat_a)
    assert pat_list.status_code == 200
    assert len(pat_list.json()) == 1
    assert pat_list.json()[0]["id"] == lab_a_id

    # 2. Patient A GET Patient B lab report -> 403 Forbidden
    assert client.get(f"/api/v1/lab-reports/{lab_b_id}", headers=headers_pat_a).status_code == 403

    # 4. Patient A cannot create lab report -> 403 Forbidden
    assert client.post("/api/v1/lab-reports/", json={"patient_id": patient_a["id"], "test_name": "Self Test", "request_date": "2026-09-30"}, headers=headers_pat_a).status_code == 403

    # 5. Patient A cannot update lab report -> 403 Forbidden
    assert client.put(f"/api/v1/lab-reports/{lab_a_id}", json={"results_summary": "Hacked"}, headers=headers_pat_a).status_code == 403

    # 6. Patient A cannot delete lab report -> 403 Forbidden
    assert client.delete(f"/api/v1/lab-reports/{lab_a_id}", headers=headers_pat_a).status_code == 403

    # ================= DOCTOR TESTS & SECURITY ATTACKS =================
    # 8. Doctor A can list reports for connected patients -> 200 OK
    doc_list = client.get("/api/v1/lab-reports/", headers=headers_doc_a)
    assert doc_list.status_code == 200
    assert len(doc_list.json()) == 1
    assert doc_list.json()[0]["id"] == lab_a_id

    # 10. Doctor A can get connected patient's report -> 200 OK
    assert client.get(f"/api/v1/lab-reports/{lab_a_id}", headers=headers_doc_a).status_code == 200

    # 11. Doctor A cannot get unrelated Patient B report -> 403 Forbidden
    assert client.get(f"/api/v1/lab-reports/{lab_b_id}", headers=headers_doc_a).status_code == 403

    # 12. Doctor A can create report for connected Patient A -> 201 Created
    doc_create_conn = client.post("/api/v1/lab-reports/", json={"patient_id": patient_a["id"], "test_name": "Liver Function Test", "request_date": "2026-09-30"}, headers=headers_doc_a)
    assert doc_create_conn.status_code == 201

    # 13. Doctor A cannot create report for unrelated Patient B -> 403 Forbidden
    doc_create_unconn = client.post("/api/v1/lab-reports/", json={"patient_id": patient_b["id"], "test_name": "Unauth Test", "request_date": "2026-09-30"}, headers=headers_doc_a)
    assert doc_create_unconn.status_code == 403

    # 14. Doctor A can update connected patient's report -> 200 OK
    doc_upd_conn = client.put(f"/api/v1/lab-reports/{lab_a_id}", json={"results_summary": "Normal Lipid Levels"}, headers=headers_doc_a)
    assert doc_upd_conn.status_code == 200

    # 15. Doctor A cannot update unrelated patient's report -> 403 Forbidden
    assert client.put(f"/api/v1/lab-reports/{lab_b_id}", json={"results_summary": "Unauth Edit"}, headers=headers_doc_a).status_code == 403

    # 16. Doctor A cannot delete lab report -> 403 Forbidden
    assert client.delete(f"/api/v1/lab-reports/{lab_a_id}", headers=headers_doc_a).status_code == 403

    # ================= RECEPTIONIST TESTS =================
    # 19. Receptionist GET list -> 403 Forbidden
    assert client.get("/api/v1/lab-reports/", headers=headers_rec).status_code == 403

    # 20. Receptionist GET by ID -> 403 Forbidden
    assert client.get(f"/api/v1/lab-reports/{lab_a_id}", headers=headers_rec).status_code == 403

    # 21. Receptionist POST -> 403 Forbidden
    assert client.post("/api/v1/lab-reports/", json={"patient_id": patient_a["id"], "test_name": "Rec Test", "request_date": "2026-09-30"}, headers=headers_rec).status_code == 403

    # 22. Receptionist PUT -> 403 Forbidden
    assert client.put(f"/api/v1/lab-reports/{lab_a_id}", json={"results_summary": "Rec Edit"}, headers=headers_rec).status_code == 403

    # 23. Receptionist DELETE -> 403 Forbidden
    assert client.delete(f"/api/v1/lab-reports/{lab_a_id}", headers=headers_rec).status_code == 403

    # ================= ADMIN TESTS =================
    # 24. Admin GET list -> 200 OK
    assert client.get("/api/v1/lab-reports/", headers=headers_admin).status_code == 200

    # 25. Admin GET any lab report -> 200 OK
    assert client.get(f"/api/v1/lab-reports/{lab_a_id}", headers=headers_admin).status_code == 200

    # 26. Admin POST -> 201 Created
    adm_create = client.post("/api/v1/lab-reports/", json={"patient_id": patient_a["id"], "test_name": "Admin Lab Test", "request_date": "2026-09-30"}, headers=headers_admin)
    assert adm_create.status_code == 201

    # 27. Admin PUT -> 200 OK
    assert client.put(f"/api/v1/lab-reports/{lab_a_id}", json={"results_summary": "Admin Approved"}, headers=headers_admin).status_code == 200

    # 28. Admin DELETE -> 204 No Content
    assert client.delete(f"/api/v1/lab-reports/{lab_a_id}", headers=headers_admin).status_code == 204

    # ================= SECURITY / AUTHENTICATION TESTS =================
    # 29. Missing JWT -> 401 Unauthorized
    assert client.get(f"/api/v1/lab-reports/{lab_b_id}").status_code == 401

    # 30. Invalid JWT -> 401 Unauthorized
    assert client.get(f"/api/v1/lab-reports/{lab_b_id}", headers={"Authorization": "Bearer bad_token"}).status_code == 401

    # 31. Non-existent report -> 404 Not Found
    assert client.get("/api/v1/lab-reports/99999", headers=headers_admin).status_code == 404
