"""Pytest suite for verifying Medical Record Domain-Level Ownership & Relationship Authorization."""

from app.models.enums import Gender, UserRole

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def test_medical_record_domain_authorization_matrix(client):
    """Comprehensive test suite for Medical Record role & ownership authorization rules."""
    # 1. Setup Doctor A & Doctor B
    doc_user_a = client.post("/api/v1/auth/register", json={"email": "medrec.doc.a@medicare.com", "password": "password123", "full_name": "Dr. MedRec A", "role": UserRole.DOCTOR.value}).json()
    doc_token_a = client.post("/api/v1/auth/login", data={"username": "medrec.doc.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc_a = {"Authorization": f"Bearer {doc_token_a}"}
    doctor_a = client.post("/api/v1/doctors/", json={"user_id": doc_user_a["id"], "qualification": "MD", "specialty": "Cardiology", "consultation_fee": 1000.0, "room_no": "A-1"}).json()

    doc_user_b = client.post("/api/v1/auth/register", json={"email": "medrec.doc.b@medicare.com", "password": "password123", "full_name": "Dr. MedRec B", "role": UserRole.DOCTOR.value}).json()
    doc_token_b = client.post("/api/v1/auth/login", data={"username": "medrec.doc.b@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc_b = {"Authorization": f"Bearer {doc_token_b}"}
    doctor_b = client.post("/api/v1/doctors/", json={"user_id": doc_user_b["id"], "qualification": "MD", "specialty": "Neurology", "consultation_fee": 1200.0, "room_no": "B-2"}).json()

    for day in DAYS_OF_WEEK:
        client.post("/api/v1/schedules/", json={"doctor_id": doctor_a["id"], "day_of_week": day, "start_time": "08:00:00", "end_time": "20:00:00"}, headers=headers_doc_a)
        client.post("/api/v1/schedules/", json={"doctor_id": doctor_b["id"], "day_of_week": day, "start_time": "08:00:00", "end_time": "20:00:00"}, headers=headers_doc_b)

    # 2. Setup Patient A & Patient B
    pat_user_a = client.post("/api/v1/auth/register", json={"email": "medrec.pat.a@medicare.com", "password": "password123", "full_name": "Patient MedRec A", "role": UserRole.PATIENT.value}).json()
    pat_token_a = client.post("/api/v1/auth/login", data={"username": "medrec.pat.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_a = {"Authorization": f"Bearer {pat_token_a}"}
    patient_a = client.post("/api/v1/patients/", json={"user_id": pat_user_a["id"], "gender": Gender.MALE.value}, headers=headers_pat_a).json()

    pat_user_b = client.post("/api/v1/auth/register", json={"email": "medrec.pat.b@medicare.com", "password": "password123", "full_name": "Patient MedRec B", "role": UserRole.PATIENT.value}).json()
    pat_token_b = client.post("/api/v1/auth/login", data={"username": "medrec.pat.b@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_b = {"Authorization": f"Bearer {pat_token_b}"}
    patient_b = client.post("/api/v1/patients/", json={"user_id": pat_user_b["id"], "gender": Gender.FEMALE.value}, headers=headers_pat_b).json()

    # 3. Setup Receptionist & Admin
    rec_user = client.post("/api/v1/auth/register", json={"email": "medrec.rec@medicare.com", "password": "password123", "full_name": "Rec MedRec", "role": UserRole.RECEPTIONIST.value}).json()
    rec_token = client.post("/api/v1/auth/login", data={"username": "medrec.rec@medicare.com", "password": "password123"}).json()["access_token"]
    headers_rec = {"Authorization": f"Bearer {rec_token}"}

    admin_user = client.post("/api/v1/auth/register", json={"email": "medrec.admin@medicare.com", "password": "password123", "full_name": "Admin MedRec", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "medrec.admin@medicare.com", "password": "password123"}).json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # 4. Create appointment between Patient A and Doctor A
    client.post("/api/v1/appointments/", json={"patient_id": patient_a["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-09-30", "start_time": "10:00:00"}, headers=headers_pat_a)

    # 5. Doctor A creates Medical Record for connected Patient A -> 201 Created
    rec_a_res = client.post("/api/v1/medical-records/", json={"patient_id": patient_a["id"], "title": "ECG Report", "category": "Cardiology", "record_date": "2026-09-30"}, headers=headers_doc_a)
    assert rec_a_res.status_code == 201
    rec_a_id = rec_a_res.json()["id"]

    # 6. Admin creates Medical Record for Patient B
    rec_b_res = client.post("/api/v1/medical-records/", json={"patient_id": patient_b["id"], "title": "Brain MRI", "category": "Neurology", "record_date": "2026-09-30"}, headers=headers_admin)
    assert rec_b_res.status_code == 201
    rec_b_id = rec_b_res.json()["id"]

    # ================= PATIENT TESTS =================
    # 1. Patient A can list own medical records -> 200 OK
    pat_list = client.get("/api/v1/medical-records/", headers=headers_pat_a)
    assert pat_list.status_code == 200
    assert len(pat_list.json()) == 1
    assert pat_list.json()[0]["id"] == rec_a_id

    # 2. Patient A GET Patient B medical record -> 403 Forbidden
    assert client.get(f"/api/v1/medical-records/{rec_b_id}", headers=headers_pat_a).status_code == 403

    # 4. Patient A cannot create medical record -> 403 Forbidden
    assert client.post("/api/v1/medical-records/", json={"patient_id": patient_a["id"], "title": "Self Record", "category": "General", "record_date": "2026-09-30"}, headers=headers_pat_a).status_code == 403

    # 5. Patient A cannot update medical record -> 403 Forbidden
    assert client.put(f"/api/v1/medical-records/{rec_a_id}", json={"summary": "Hacked"}, headers=headers_pat_a).status_code == 403

    # 6. Patient A cannot delete medical record -> 403 Forbidden
    assert client.delete(f"/api/v1/medical-records/{rec_a_id}", headers=headers_pat_a).status_code == 403

    # ================= DOCTOR TESTS =================
    # 8. Doctor A can list records for connected patients -> 200 OK
    doc_list = client.get("/api/v1/medical-records/", headers=headers_doc_a)
    assert doc_list.status_code == 200
    assert len(doc_list.json()) == 1
    assert doc_list.json()[0]["id"] == rec_a_id

    # 10. Doctor A can get connected patient's record -> 200 OK
    assert client.get(f"/api/v1/medical-records/{rec_a_id}", headers=headers_doc_a).status_code == 200

    # 11. Doctor A cannot get unrelated Patient B record -> 403 Forbidden
    assert client.get(f"/api/v1/medical-records/{rec_b_id}", headers=headers_doc_a).status_code == 403

    # 12. Doctor A can create record for connected Patient A -> 201 Created
    doc_create_conn = client.post("/api/v1/medical-records/", json={"patient_id": patient_a["id"], "title": "Blood Test", "category": "General", "record_date": "2026-09-30"}, headers=headers_doc_a)
    assert doc_create_conn.status_code == 201

    # 13. Doctor A cannot create record for unrelated Patient B -> 403 Forbidden
    doc_create_unconn = client.post("/api/v1/medical-records/", json={"patient_id": patient_b["id"], "title": "Unauth Test", "category": "General", "record_date": "2026-09-30"}, headers=headers_doc_a)
    assert doc_create_unconn.status_code == 403

    # 14. Doctor A can update connected patient's record -> 200 OK
    doc_upd_conn = client.put(f"/api/v1/medical-records/{rec_a_id}", json={"summary": "ECG Normal"}, headers=headers_doc_a)
    assert doc_upd_conn.status_code == 200

    # 15. Doctor A cannot update unrelated patient's record -> 403 Forbidden
    assert client.put(f"/api/v1/medical-records/{rec_b_id}", json={"summary": "Unauth Edit"}, headers=headers_doc_a).status_code == 403

    # 16. Doctor A cannot delete medical record -> 403 Forbidden
    assert client.delete(f"/api/v1/medical-records/{rec_a_id}", headers=headers_doc_a).status_code == 403

    # ================= RECEPTIONIST TESTS =================
    # 19. Receptionist GET list -> 403 Forbidden
    assert client.get("/api/v1/medical-records/", headers=headers_rec).status_code == 403

    # 20. Receptionist GET by ID -> 403 Forbidden
    assert client.get(f"/api/v1/medical-records/{rec_a_id}", headers=headers_rec).status_code == 403

    # 21. Receptionist POST -> 403 Forbidden
    assert client.post("/api/v1/medical-records/", json={"patient_id": patient_a["id"], "title": "Rec Record", "category": "General", "record_date": "2026-09-30"}, headers=headers_rec).status_code == 403

    # 22. Receptionist PUT -> 403 Forbidden
    assert client.put(f"/api/v1/medical-records/{rec_a_id}", json={"summary": "Rec Edit"}, headers=headers_rec).status_code == 403

    # 23. Receptionist DELETE -> 403 Forbidden
    assert client.delete(f"/api/v1/medical-records/{rec_a_id}", headers=headers_rec).status_code == 403

    # ================= ADMIN TESTS =================
    # 24. Admin GET list -> 200 OK
    assert client.get("/api/v1/medical-records/", headers=headers_admin).status_code == 200

    # 25. Admin GET any medical record -> 200 OK
    assert client.get(f"/api/v1/medical-records/{rec_a_id}", headers=headers_admin).status_code == 200

    # 26. Admin POST -> 201 Created
    adm_create = client.post("/api/v1/medical-records/", json={"patient_id": patient_a["id"], "title": "Admin Note", "category": "General", "record_date": "2026-09-30"}, headers=headers_admin)
    assert adm_create.status_code == 201

    # 27. Admin PUT -> 200 OK
    assert client.put(f"/api/v1/medical-records/{rec_a_id}", json={"summary": "Admin Approved"}, headers=headers_admin).status_code == 200

    # 28. Admin DELETE -> 204 No Content
    assert client.delete(f"/api/v1/medical-records/{rec_a_id}", headers=headers_admin).status_code == 204

    # ================= SECURITY / AUTHENTICATION TESTS =================
    # 29. Missing JWT -> 401 Unauthorized
    assert client.get(f"/api/v1/medical-records/{rec_b_id}").status_code == 401

    # 30. Invalid JWT -> 401 Unauthorized
    assert client.get(f"/api/v1/medical-records/{rec_b_id}", headers={"Authorization": "Bearer bad_token"}).status_code == 401

    # 31. Non-existent record -> 404 Not Found
    assert client.get("/api/v1/medical-records/99999", headers=headers_admin).status_code == 404
