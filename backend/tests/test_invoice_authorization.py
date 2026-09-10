"""Pytest suite for verifying Invoice & Billing Domain-Level Ownership & Role Authorization."""

from app.models.enums import Gender, UserRole

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def test_invoice_domain_authorization_matrix(client):
    """Comprehensive test suite for Invoice role, ownership, and billing attack scenarios."""
    # 1. Setup Doctor A & Doctor B
    doc_user_a = client.post("/api/v1/auth/register", json={"email": "inv.doc.a@medicare.com", "password": "password123", "full_name": "Dr. Inv A", "role": UserRole.DOCTOR.value}).json()
    doc_token_a = client.post("/api/v1/auth/login", data={"username": "inv.doc.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc_a = {"Authorization": f"Bearer {doc_token_a}"}
    doctor_a = client.post("/api/v1/doctors/", json={"user_id": doc_user_a["id"], "qualification": "MD", "specialty": "General", "consultation_fee": 1000.0, "room_no": "A-1"}).json()

    for day in DAYS_OF_WEEK:
        client.post("/api/v1/schedules/", json={"doctor_id": doctor_a["id"], "day_of_week": day, "start_time": "08:00:00", "end_time": "20:00:00"}, headers=headers_doc_a)

    # 2. Setup Patient A & Patient B
    pat_user_a = client.post("/api/v1/auth/register", json={"email": "inv.pat.a@medicare.com", "password": "password123", "full_name": "Patient Inv A", "role": UserRole.PATIENT.value}).json()
    pat_token_a = client.post("/api/v1/auth/login", data={"username": "inv.pat.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_a = {"Authorization": f"Bearer {pat_token_a}"}
    patient_a = client.post("/api/v1/patients/", json={"user_id": pat_user_a["id"], "gender": Gender.MALE.value}, headers=headers_pat_a).json()

    pat_user_b = client.post("/api/v1/auth/register", json={"email": "inv.pat.b@medicare.com", "password": "password123", "full_name": "Patient Inv B", "role": UserRole.PATIENT.value}).json()
    pat_token_b = client.post("/api/v1/auth/login", data={"username": "inv.pat.b@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_b = {"Authorization": f"Bearer {pat_token_b}"}
    patient_b = client.post("/api/v1/patients/", json={"user_id": pat_user_b["id"], "gender": Gender.FEMALE.value}, headers=headers_pat_b).json()

    # 3. Setup Receptionist & Admin
    rec_user = client.post("/api/v1/auth/register", json={"email": "inv.rec@medicare.com", "password": "password123", "full_name": "Billing Receptionist", "role": UserRole.RECEPTIONIST.value}).json()
    rec_token = client.post("/api/v1/auth/login", data={"username": "inv.rec@medicare.com", "password": "password123"}).json()["access_token"]
    headers_rec = {"Authorization": f"Bearer {rec_token}"}

    admin_user = client.post("/api/v1/auth/register", json={"email": "inv.admin@medicare.com", "password": "password123", "full_name": "Billing Admin", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "inv.admin@medicare.com", "password": "password123"}).json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # 4. Create appointment between Patient A and Doctor A
    apt_res = client.post("/api/v1/appointments/", json={"patient_id": patient_a["id"], "doctor_id": doctor_a["id"], "appointment_date": "2026-10-01", "start_time": "10:00:00"}, headers=headers_pat_a)
    apt_id = apt_res.json()["id"]

    # 5. Receptionist creates Invoice for Patient A -> 201 Created
    inv_a_res = client.post("/api/v1/invoices/", json={
        "patient_id": patient_a["id"], "appointment_id": apt_id, "invoice_date": "2026-10-01", "tax": 50.0,
        "items": [{"description": "Consultation Fee", "amount": 500.0}]
    }, headers=headers_rec)
    assert inv_a_res.status_code == 201
    inv_a_id = inv_a_res.json()["id"]

    # 6. Admin creates Invoice for Patient B
    inv_b_res = client.post("/api/v1/invoices/", json={
        "patient_id": patient_b["id"], "invoice_date": "2026-10-01", "tax": 20.0,
        "items": [{"description": "Lab Fee", "amount": 200.0}]
    }, headers=headers_admin)
    assert inv_b_res.status_code == 201
    inv_b_id = inv_b_res.json()["id"]

    # ================= PATIENT TESTS =================
    # 1. Patient A can list own invoices -> 200 OK
    pat_list = client.get("/api/v1/invoices/", headers=headers_pat_a)
    assert pat_list.status_code == 200
    assert len(pat_list.json()) == 1
    assert pat_list.json()[0]["id"] == inv_a_id

    # 2. Patient A GET Patient B invoice -> 403 Forbidden
    assert client.get(f"/api/v1/invoices/{inv_b_id}", headers=headers_pat_a).status_code == 403

    # 4. Patient A cannot create invoice -> 403 Forbidden
    assert client.post("/api/v1/invoices/", json={"patient_id": patient_a["id"], "invoice_date": "2026-10-01"}, headers=headers_pat_a).status_code == 403

    # 5. Patient A cannot update invoice -> 403 Forbidden
    assert client.put(f"/api/v1/invoices/{inv_a_id}", json={"payment_status": "Paid", "payment_method": "Cash"}, headers=headers_pat_a).status_code == 403

    # 6. Patient A cannot delete invoice -> 403 Forbidden
    assert client.delete(f"/api/v1/invoices/{inv_a_id}", headers=headers_pat_a).status_code == 403

    # 7. Patient cannot collect payment / mark as Paid -> 403 Forbidden (Attack 2)
    assert client.put(f"/api/v1/invoices/{inv_a_id}", json={"payment_status": "Paid", "payment_method": "UPI"}, headers=headers_pat_a).status_code == 403

    # ================= DOCTOR TESTS & ATTACKS =================
    # 9. Doctor A can view invoice of connected patient -> 200 OK
    assert client.get(f"/api/v1/invoices/{inv_a_id}", headers=headers_doc_a).status_code == 200

    # 10. Doctor A cannot view unrelated Patient B invoice -> 403 Forbidden (Attack 3)
    assert client.get(f"/api/v1/invoices/{inv_b_id}", headers=headers_doc_a).status_code == 403

    # 11. Doctor A cannot create invoice -> 403 Forbidden (Attack 5)
    assert client.post("/api/v1/invoices/", json={"patient_id": patient_a["id"], "invoice_date": "2026-10-01"}, headers=headers_doc_a).status_code == 403

    # 12. Doctor A cannot update invoice -> 403 Forbidden
    assert client.put(f"/api/v1/invoices/{inv_a_id}", json={"payment_status": "Paid", "payment_method": "Cash"}, headers=headers_doc_a).status_code == 403

    # 13. Doctor A cannot delete invoice -> 403 Forbidden
    assert client.delete(f"/api/v1/invoices/{inv_a_id}", headers=headers_doc_a).status_code == 403

    # 14. Doctor A cannot collect payment -> 403 Forbidden (Attack 4)
    assert client.put(f"/api/v1/invoices/{inv_a_id}", json={"payment_status": "Paid", "payment_method": "Cash"}, headers=headers_doc_a).status_code == 403

    # ================= RECEPTIONIST TESTS =================
    # 17. Receptionist can list invoices -> 200 OK
    assert client.get("/api/v1/invoices/", headers=headers_rec).status_code == 200

    # 18. Receptionist can get invoice -> 200 OK
    assert client.get(f"/api/v1/invoices/{inv_a_id}", headers=headers_rec).status_code == 200

    # 22. Receptionist can collect payment -> 200 OK
    rec_pay = client.put(f"/api/v1/invoices/{inv_a_id}", json={"payment_status": "Paid", "payment_method": "UPI", "transaction_id": "TXN999"}, headers=headers_rec)
    assert rec_pay.status_code == 200
    assert rec_pay.json()["payment_status"] == "Paid"

    # 23. Receptionist cannot create invoice with mismatched patient/appointment relationship -> 400 Bad Request (Attack 6)
    rec_mismatch = client.post("/api/v1/invoices/", json={"patient_id": patient_b["id"], "appointment_id": apt_id, "invoice_date": "2026-10-01"}, headers=headers_rec)
    assert rec_mismatch.status_code == 400
    assert "does not belong" in rec_mismatch.json()["detail"]

    # 24. Receptionist cannot access clinical records/prescriptions/lab reports -> 403 Forbidden
    assert client.get("/api/v1/medical-records/", headers=headers_rec).status_code == 403
    assert client.get("/api/v1/prescriptions/", headers=headers_rec).status_code == 403
    assert client.get("/api/v1/lab-reports/", headers=headers_rec).status_code == 403

    # 21. Receptionist can delete invoice -> 204 No Content
    assert client.delete(f"/api/v1/invoices/{inv_a_id}", headers=headers_rec).status_code == 204

    # ================= ADMIN TESTS =================
    # 25. Admin can list invoices -> 200 OK
    assert client.get("/api/v1/invoices/", headers=headers_admin).status_code == 200

    # 26. Admin can get invoice -> 200 OK
    assert client.get(f"/api/v1/invoices/{inv_b_id}", headers=headers_admin).status_code == 200

    # 30. Admin can collect payment -> 200 OK
    adm_pay = client.put(f"/api/v1/invoices/{inv_b_id}", json={"payment_status": "Paid", "payment_method": "Card", "transaction_id": "TXN888"}, headers=headers_admin)
    assert adm_pay.status_code == 200

    # 29. Admin can delete invoice -> 204 No Content
    assert client.delete(f"/api/v1/invoices/{inv_b_id}", headers=headers_admin).status_code == 204

    # ================= SECURITY / AUTHENTICATION TESTS (Attack 7) =================
    # 31. Missing JWT -> 401 Unauthorized
    assert client.get(f"/api/v1/invoices/{inv_b_id}").status_code == 401

    # 32. Invalid JWT -> 401 Unauthorized
    assert client.get(f"/api/v1/invoices/{inv_b_id}", headers={"Authorization": "Bearer bad_token"}).status_code == 401

    # 33. Non-existent invoice -> 404 Not Found
    assert client.get("/api/v1/invoices/99999", headers=headers_admin).status_code == 404
