"""Pytest suite for verifying Medical Records, Prescriptions, Lab Reports, Invoices, and Notifications CRUD endpoints."""

from app.models.enums import UserRole


def test_medical_records_crud_lifecycle(client):
    """Test Medical Records CRUD endpoints with Admin user."""
    admin_user = client.post("/api/v1/auth/register", json={"email": "admin.medrec@medicare.com", "password": "password123", "full_name": "Admin MedRec", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "admin.medrec@medicare.com", "password": "password123"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    patient_user = client.post("/api/v1/auth/register", json={"email": "rec.pat@medicare.com", "password": "password123", "full_name": "Record Pat", "role": UserRole.PATIENT.value}).json()
    patient = client.post("/api/v1/patients/", json={"user_id": patient_user["id"], "gender": "Male"}, headers=admin_headers).json()

    res = client.post("/api/v1/medical-records/", json={"patient_id": patient["id"], "title": "X-Ray Report", "category": "Radiology", "record_date": "2026-09-01"}, headers=admin_headers)
    assert res.status_code == 201
    rec_id = res.json()["id"]

    assert client.get("/api/v1/medical-records/", headers=admin_headers).status_code == 200
    assert client.get(f"/api/v1/medical-records/{rec_id}", headers=admin_headers).status_code == 200

    upd = client.put(f"/api/v1/medical-records/{rec_id}", json={"summary": "Chest X-Ray Normal"}, headers=admin_headers)
    assert upd.status_code == 200
    assert upd.json()["summary"] == "Chest X-Ray Normal"

    assert client.delete(f"/api/v1/medical-records/{rec_id}", headers=admin_headers).status_code == 204
    assert client.get(f"/api/v1/medical-records/{rec_id}", headers=admin_headers).status_code == 404


def test_prescriptions_crud_lifecycle(client):
    """Test Prescriptions CRUD endpoints with Admin user."""
    admin_user = client.post("/api/v1/auth/register", json={"email": "admin.rx@medicare.com", "password": "password123", "full_name": "Admin Rx", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "admin.rx@medicare.com", "password": "password123"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    doc_user = client.post("/api/v1/auth/register", json={"email": "rx.doc@medicare.com", "password": "password123", "full_name": "Dr. Rx", "role": UserRole.DOCTOR.value}).json()
    doctor = client.post("/api/v1/doctors/", json={"user_id": doc_user["id"], "qualification": "MD", "specialty": "General", "consultation_fee": 500.0, "room_no": "101"}).json()

    pat_user = client.post("/api/v1/auth/register", json={"email": "rx.pat@medicare.com", "password": "password123", "full_name": "Rx Pat", "role": UserRole.PATIENT.value}).json()
    patient = client.post("/api/v1/patients/", json={"user_id": pat_user["id"], "gender": "Female"}, headers=admin_headers).json()

    res = client.post("/api/v1/prescriptions/", json={
        "patient_id": patient["id"],
        "doctor_id": doctor["id"],
        "diagnosis": "Seasonal Allergy",
        "items": [{"medicine_name": "Cetirizine", "dosage": "10mg", "frequency": "Once daily", "duration_days": 7}]
    }, headers=admin_headers)
    assert res.status_code == 201
    rx_id = res.json()["id"]

    assert client.get("/api/v1/prescriptions/", headers=admin_headers).status_code == 200
    assert client.get(f"/api/v1/prescriptions/{rx_id}", headers=admin_headers).status_code == 200

    upd = client.put(f"/api/v1/prescriptions/{rx_id}", json={"diagnosis": "Allergic Rhinitis", "notes": "Drink warm water"}, headers=admin_headers)
    assert upd.status_code == 200
    assert upd.json()["diagnosis"] == "Allergic Rhinitis"

    assert client.delete(f"/api/v1/prescriptions/{rx_id}", headers=admin_headers).status_code == 204
    assert client.get(f"/api/v1/prescriptions/{rx_id}", headers=admin_headers).status_code == 404


def test_lab_reports_crud_lifecycle(client):
    """Test Lab Reports CRUD endpoints with Admin user."""
    admin_user = client.post("/api/v1/auth/register", json={"email": "admin.lab@medicare.com", "password": "password123", "full_name": "Admin Lab", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "admin.lab@medicare.com", "password": "password123"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    pat_user = client.post("/api/v1/auth/register", json={"email": "lab.pat@medicare.com", "password": "password123", "full_name": "Lab Pat", "role": UserRole.PATIENT.value}).json()
    patient = client.post("/api/v1/patients/", json={"user_id": pat_user["id"], "gender": "Male"}, headers=admin_headers).json()

    res = client.post("/api/v1/lab-reports/", json={"patient_id": patient["id"], "test_name": "Complete Blood Count", "request_date": "2026-09-02"}, headers=admin_headers)
    assert res.status_code == 201
    lab_id = res.json()["id"]

    assert client.get("/api/v1/lab-reports/", headers=admin_headers).status_code == 200
    assert client.get(f"/api/v1/lab-reports/{lab_id}", headers=admin_headers).status_code == 200

    upd = client.put(f"/api/v1/lab-reports/{lab_id}", json={"status": "Ready", "results_summary": "Hemoglobin 14.5 g/dL"}, headers=admin_headers)
    assert upd.status_code == 200
    assert upd.json()["status"] == "Ready"

    assert client.delete(f"/api/v1/lab-reports/{lab_id}", headers=admin_headers).status_code == 204
    assert client.get(f"/api/v1/lab-reports/{lab_id}", headers=admin_headers).status_code == 404


def test_invoices_crud_lifecycle(client):
    """Test Invoices CRUD endpoints with Receptionist user."""
    rec_user = client.post("/api/v1/auth/register", json={"email": "rec.inv@medicare.com", "password": "password123", "full_name": "Rec Inv", "role": UserRole.RECEPTIONIST.value}).json()
    rec_token = client.post("/api/v1/auth/login", data={"username": "rec.inv@medicare.com", "password": "password123"}).json()["access_token"]
    rec_headers = {"Authorization": f"Bearer {rec_token}"}

    pat_user = client.post("/api/v1/auth/register", json={"email": "inv.pat@medicare.com", "password": "password123", "full_name": "Inv Pat", "role": UserRole.PATIENT.value}).json()
    pat_token = client.post("/api/v1/auth/login", data={"username": "inv.pat@medicare.com", "password": "password123"}).json()["access_token"]

    patient = client.post("/api/v1/patients/", json={"user_id": pat_user["id"], "gender": "Female"}, headers={"Authorization": f"Bearer {pat_token}"}).json()

    res = client.post("/api/v1/invoices/", json={
        "patient_id": patient["id"],
        "invoice_date": "2026-09-03",
        "tax": 50.0,
        "items": [{"description": "Consultation Fee", "amount": 500.0}]
    }, headers=rec_headers)
    assert res.status_code == 201
    inv_id = res.json()["id"]
    assert res.json()["total_amount"] == 550.0

    assert client.get("/api/v1/invoices/", headers=rec_headers).status_code == 200
    assert client.get(f"/api/v1/invoices/{inv_id}", headers=rec_headers).status_code == 200

    upd = client.put(f"/api/v1/invoices/{inv_id}", json={"payment_status": "Paid", "payment_method": "UPI", "transaction_id": "TXN123456"}, headers=rec_headers)
    assert upd.status_code == 200
    assert upd.json()["payment_status"] == "Paid"

    assert client.delete(f"/api/v1/invoices/{inv_id}", headers=rec_headers).status_code == 204
    assert client.get(f"/api/v1/invoices/{inv_id}", headers=rec_headers).status_code == 404


def test_notifications_crud_lifecycle(client):
    """Test Notifications CRUD endpoints with Admin user."""
    admin_user = client.post("/api/v1/auth/register", json={"email": "admin.notif@medicare.com", "password": "password123", "full_name": "Admin Notif", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "admin.notif@medicare.com", "password": "password123"}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    user = client.post("/api/v1/auth/register", json={"email": "notif.user@medicare.com", "password": "password123", "full_name": "Notif User", "role": UserRole.PATIENT.value}).json()

    res = client.post("/api/v1/notifications/", json={"user_id": user["id"], "title": "Appointment Confirmation", "message": "Your appointment is confirmed."}, headers=admin_headers)
    assert res.status_code == 201
    notif_id = res.json()["id"]

    assert client.get("/api/v1/notifications/", headers=admin_headers).status_code == 200
    assert client.get(f"/api/v1/notifications/{notif_id}", headers=admin_headers).status_code == 200

    upd = client.put(f"/api/v1/notifications/{notif_id}?is_read=true", headers=admin_headers)
    assert upd.status_code == 200
    assert upd.json()["is_read"] is True

    assert client.delete(f"/api/v1/notifications/{notif_id}", headers=admin_headers).status_code == 204
    assert client.get(f"/api/v1/notifications/{notif_id}", headers=admin_headers).status_code == 404
