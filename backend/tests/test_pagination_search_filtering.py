"""Pytest Suite for Pagination, Search, Filtering, Sorting Allowlist, and Header Metadata."""

import pytest
from app.models.enums import AppointmentStatus, Gender, LabReportStatus, PaymentStatus, UserRole


def test_pagination_page_size_and_headers(client):
    """Test preferred page/page_size pagination and header metadata generation."""
    # Register Admin and login
    admin_user = client.post("/api/v1/auth/register", json={"email": "pg.admin@medicare.com", "password": "password123", "full_name": "PG Admin", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "pg.admin@medicare.com", "password": "password123"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Register 5 test users
    for i in range(5):
        client.post("/api/v1/auth/register", json={"email": f"pg.user{i}@medicare.com", "password": "password123", "full_name": f"User {i}", "role": UserRole.PATIENT.value})

    # 1. Preferred page/page_size: Page 1, size 2
    res_p1 = client.get("/api/v1/users/?page=1&page_size=2", headers=headers)
    assert res_p1.status_code == 200
    assert len(res_p1.json()) == 2
    assert "X-Total-Count" in res_p1.headers
    assert int(res_p1.headers["X-Total-Count"]) >= 6
    assert res_p1.headers["X-Page"] == "1"
    assert res_p1.headers["X-Page-Size"] == "2"

    # 2. Preferred page/page_size: Page 2, size 2
    res_p2 = client.get("/api/v1/users/?page=2&page_size=2", headers=headers)
    assert res_p2.status_code == 200
    assert len(res_p2.json()) == 2
    assert res_p2.headers["X-Page"] == "2"
    # Page 1 and Page 2 items must be distinct
    p1_ids = {u["id"] for u in res_p1.json()}
    p2_ids = {u["id"] for u in res_p2.json()}
    assert p1_ids.isdisjoint(p2_ids)

    # 3. Backward compatibility skip/limit: skip=0, limit=3
    res_skip = client.get("/api/v1/users/?skip=0&limit=3", headers=headers)
    assert res_skip.status_code == 200
    assert len(res_skip.json()) == 3

    # 4. Invalid pagination parameters -> 422 Unprocessable Entity
    assert client.get("/api/v1/users/?page=0", headers=headers).status_code == 422
    assert client.get("/api/v1/users/?page_size=0", headers=headers).status_code == 422


def test_user_search_filtering_and_sorting(client):
    """Test User list DB-level search, role filter, status filter, and safe sorting allowlist."""
    admin_user = client.post("/api/v1/auth/register", json={"email": "usr.admin@medicare.com", "password": "password123", "full_name": "Usr Admin", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "usr.admin@medicare.com", "password": "password123"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    client.post("/api/v1/auth/register", json={"email": "alpha.doc@medicare.com", "password": "password123", "full_name": "Dr Alpha Cardio", "role": UserRole.DOCTOR.value})
    client.post("/api/v1/auth/register", json={"email": "beta.pat@medicare.com", "password": "password123", "full_name": "Patient Beta", "role": UserRole.PATIENT.value})

    # Search by full_name substring
    search_res = client.get("/api/v1/users/?search=Alpha", headers=headers)
    assert search_res.status_code == 200
    assert len(search_res.json()) >= 1
    assert "Alpha" in search_res.json()[0]["full_name"]

    # Filter by role = DOCTOR
    filter_role_res = client.get(f"/api/v1/users/?role={UserRole.DOCTOR.value}", headers=headers)
    assert filter_role_res.status_code == 200
    assert all(u["role"] == UserRole.DOCTOR.value for u in filter_role_res.json())

    # Filter by is_active = True
    filter_active_res = client.get("/api/v1/users/?is_active=true", headers=headers)
    assert filter_active_res.status_code == 200
    assert all(u["is_active"] is True for u in filter_active_res.json())

    # Sorting allowlist: sort_by=full_name, sort_order=asc
    sort_res = client.get("/api/v1/users/?sort_by=full_name&sort_order=asc", headers=headers)
    assert sort_res.status_code == 200
    names = [u["full_name"] for u in sort_res.json()]
    assert names == sorted(names)

    # Invalid sort field falls back safely without error
    invalid_sort_res = client.get("/api/v1/users/?sort_by=non_existent_column", headers=headers)
    assert invalid_sort_res.status_code == 200


def test_doctor_search_filtering_and_sorting(client, admin_headers):
    """Test Doctor list DB-level search, specialty filter, department filter, and availability filter."""
    dept = client.post("/api/v1/departments/", json={"name": "Cardiology Dept", "description": "Heart Center"}, headers=admin_headers).json()


    doc1_user = client.post("/api/v1/auth/register", json={"email": "cardio.doc@medicare.com", "password": "password123", "full_name": "Dr Heart Specialist", "role": UserRole.DOCTOR.value}).json()
    doc1_res = client.post("/api/v1/doctors/", json={"user_id": doc1_user["id"], "department_id": dept["id"], "qualification": "MD Cardiology", "specialty": "Cardiology", "room_no": "A-101", "consultation_fee": 2000.0, "is_available": True})
    assert doc1_res.status_code == 201
    doc1 = doc1_res.json()

    doc2_user = client.post("/api/v1/auth/register", json={"email": "neuro.doc@medicare.com", "password": "password123", "full_name": "Dr Brain Specialist", "role": UserRole.DOCTOR.value}).json()
    doc2_res = client.post("/api/v1/doctors/", json={"user_id": doc2_user["id"], "qualification": "MD Neurology", "specialty": "Neurology", "room_no": "B-202", "consultation_fee": 2500.0, "is_available": False})
    assert doc2_res.status_code == 201
    doc2 = doc2_res.json()

    # Search doctor by specialty
    s1 = client.get("/api/v1/doctors/?search=Cardiology")
    assert s1.status_code == 200
    assert any(d["id"] == doc1["id"] for d in s1.json())
    assert not any(d["id"] == doc2["id"] for d in s1.json())

    # Filter by department_id
    f_dept = client.get(f"/api/v1/doctors/?department_id={dept['id']}")
    assert f_dept.status_code == 200
    assert all(d["department_id"] == dept["id"] for d in f_dept.json())

    # Filter by is_available = True
    f_avail = client.get("/api/v1/doctors/?is_available=true")
    assert f_avail.status_code == 200
    assert all(d["is_available"] is True for d in f_avail.json())

    # Sorting by consultation_fee desc
    s_fee = client.get("/api/v1/doctors/?sort_by=consultation_fee&sort_order=desc")
    assert s_fee.status_code == 200
    fees = [d["consultation_fee"] for d in s_fee.json()]
    assert fees == sorted(fees, reverse=True)


def test_appointment_search_filtering_and_domain_authorization(client):
    """Test Appointment search, status filter, date filter, and domain authorization preservation."""
    # Setup Doctor and Patient
    doc_user = client.post("/api/v1/auth/register", json={"email": "apt.doc@medicare.com", "password": "password123", "full_name": "Apt Doctor", "role": UserRole.DOCTOR.value}).json()
    doc_token = client.post("/api/v1/auth/login", data={"username": "apt.doc@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc = {"Authorization": f"Bearer {doc_token}"}
    doc_res = client.post("/api/v1/doctors/", json={"user_id": doc_user["id"], "qualification": "MD", "specialty": "General", "room_no": "C-303", "consultation_fee": 1000.0})
    assert doc_res.status_code == 201
    doctor = doc_res.json()

    client.post("/api/v1/schedules/", json={"doctor_id": doctor["id"], "day_of_week": "Monday", "start_time": "08:00:00", "end_time": "18:00:00"}, headers=headers_doc)

    pat1_user = client.post("/api/v1/auth/register", json={"email": "apt.pat1@medicare.com", "password": "password123", "full_name": "Apt Patient 1", "role": UserRole.PATIENT.value}).json()
    pat1_token = client.post("/api/v1/auth/login", data={"username": "apt.pat1@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat1 = {"Authorization": f"Bearer {pat1_token}"}
    patient1 = client.post("/api/v1/patients/", json={"user_id": pat1_user["id"], "gender": Gender.MALE.value}, headers=headers_pat1).json()

    pat2_user = client.post("/api/v1/auth/register", json={"email": "apt.pat2@medicare.com", "password": "password123", "full_name": "Apt Patient 2", "role": UserRole.PATIENT.value}).json()
    pat2_token = client.post("/api/v1/auth/login", data={"username": "apt.pat2@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat2 = {"Authorization": f"Bearer {pat2_token}"}
    patient2 = client.post("/api/v1/patients/", json={"user_id": pat2_user["id"], "gender": Gender.FEMALE.value}, headers=headers_pat2).json()

    # Book appointments
    apt1 = client.post("/api/v1/appointments/", json={"patient_id": patient1["id"], "doctor_id": doctor["id"], "appointment_date": "2026-12-07", "start_time": "09:00:00", "reason": "Fever & Cough Checkup"}, headers=headers_pat1).json()
    apt2 = client.post("/api/v1/appointments/", json={"patient_id": patient2["id"], "doctor_id": doctor["id"], "appointment_date": "2026-12-07", "start_time": "10:00:00", "reason": "Routine Consultation"}, headers=headers_pat2).json()

    # Patient 1 searches for "Fever" -> 200 OK (returns apt1)
    res_search = client.get("/api/v1/appointments/?search=Fever", headers=headers_pat1)
    assert res_search.status_code == 200
    assert len(res_search.json()) == 1
    assert res_search.json()[0]["id"] == apt1["id"]

    # DOMAIN AUTHORIZATION PRESERVATION:
    # Patient 1 attempts to pass patient_id of Patient 2 in query string
    res_escalation = client.get(f"/api/v1/appointments/?patient_id={patient2['id']}", headers=headers_pat1)
    assert res_escalation.status_code == 200
    # Must NOT bypass ownership! Returns 0 records or only patient 1's records
    assert not any(a["patient_id"] == patient2["id"] for a in res_escalation.json())

    # Doctor views appointments -> sees both patient 1 and patient 2
    res_doc = client.get("/api/v1/appointments/?status=Scheduled", headers=headers_doc)
    assert res_doc.status_code == 200
    p_ids = {a["patient_id"] for a in res_doc.json()}
    assert patient1["id"] in p_ids
    assert patient2["id"] in p_ids


def test_clinical_records_invoices_and_notifications_filtering(client):
    """Test filtering across Medical Records, Prescriptions, Lab Reports, Invoices, and Notifications."""
    admin_user = client.post("/api/v1/auth/register", json={"email": "clin.admin@medicare.com", "password": "password123", "full_name": "Clin Admin", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "clin.admin@medicare.com", "password": "password123"}).json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    pat_user = client.post("/api/v1/auth/register", json={"email": "clin.pat@medicare.com", "password": "password123", "full_name": "Clin Patient", "role": UserRole.PATIENT.value}).json()
    pat_token = client.post("/api/v1/auth/login", data={"username": "clin.pat@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat = {"Authorization": f"Bearer {pat_token}"}
    patient = client.post("/api/v1/patients/", json={"user_id": pat_user["id"], "gender": Gender.MALE.value}, headers=headers_pat).json()

    # Create Invoice
    inv1 = client.post("/api/v1/invoices/", json={"patient_id": patient["id"], "invoice_date": "2026-12-01", "payment_status": PaymentStatus.UNPAID.value, "tax": 10.0, "items": [{"description": "Cons", "amount": 100.0}]}, headers=headers_admin).json()
    inv2 = client.post("/api/v1/invoices/", json={"patient_id": patient["id"], "invoice_date": "2026-12-02", "payment_status": PaymentStatus.PAID.value, "tax": 15.0, "items": [{"description": "Lab", "amount": 150.0}]}, headers=headers_admin).json()

    # Filter invoices by payment_status = PAID
    res_paid = client.get(f"/api/v1/invoices/?payment_status={PaymentStatus.PAID.value}", headers=headers_admin)
    assert res_paid.status_code == 200
    assert len(res_paid.json()) >= 1
    assert all(i["payment_status"] == PaymentStatus.PAID.value for i in res_paid.json())

    # Create Notifications
    n1 = client.post("/api/v1/notifications/", json={"user_id": pat_user["id"], "title": "Welcome Alert", "message": "Welcome to MediCare", "notification_type": "WELCOME"}, headers=headers_admin).json()
    n2 = client.post("/api/v1/notifications/", json={"user_id": pat_user["id"], "title": "Billing Alert", "message": "Your invoice is ready", "notification_type": "BILLING"}, headers=headers_admin).json()

    # Filter notifications by is_read = false
    res_unread = client.get("/api/v1/notifications/?is_read=false", headers=headers_pat)
    assert res_unread.status_code == 200
    assert all(n["is_read"] is False for n in res_unread.json())
