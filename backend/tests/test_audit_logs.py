"""Pytest suite for verifying Centralized Audit Log System, RBAC, Filtering & Data Privacy."""

from app.models.enums import Gender, UserRole


def test_audit_log_system_and_rbac(client):
    """Comprehensive test matrix for Audit Log system endpoints, event recording, RBAC, and data safety."""
    # 1. Setup Admin, Doctor, Patient, Receptionist
    admin_user = client.post("/api/v1/auth/register", json={"email": "audit.admin@medicare.com", "password": "password123", "full_name": "Audit Admin", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "audit.admin@medicare.com", "password": "password123"}).json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    doc_user = client.post("/api/v1/auth/register", json={"email": "audit.doc@medicare.com", "password": "password123", "full_name": "Audit Doctor", "role": UserRole.DOCTOR.value}).json()
    doc_token = client.post("/api/v1/auth/login", data={"username": "audit.doc@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc = {"Authorization": f"Bearer {doc_token}"}
    doctor = client.post("/api/v1/doctors/", json={"user_id": doc_user["id"], "qualification": "MD", "specialty": "Neurology", "consultation_fee": 1500.0, "room_no": "B-101"}).json()

    pat_user = client.post("/api/v1/auth/register", json={"email": "audit.pat@medicare.com", "password": "password123", "full_name": "Audit Patient", "role": UserRole.PATIENT.value}).json()
    pat_token = client.post("/api/v1/auth/login", data={"username": "audit.pat@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat = {"Authorization": f"Bearer {pat_token}"}
    patient = client.post("/api/v1/patients/", json={"user_id": pat_user["id"], "gender": Gender.MALE.value}, headers=headers_pat).json()

    rec_user = client.post("/api/v1/auth/register", json={"email": "audit.rec@medicare.com", "password": "password123", "full_name": "Audit Receptionist", "role": UserRole.RECEPTIONIST.value}).json()
    rec_token = client.post("/api/v1/auth/login", data={"username": "audit.rec@medicare.com", "password": "password123"}).json()["access_token"]
    headers_rec = {"Authorization": f"Bearer {rec_token}"}

    # Failed login attempt
    failed_login = client.post("/api/v1/auth/login", data={"username": "wrong.user@medicare.com", "password": "wrongpassword"})
    assert failed_login.status_code == 401

    # Perform state-changing actions
    client.post("/api/v1/schedules/", json={"doctor_id": doctor["id"], "day_of_week": "Monday", "start_time": "09:00:00", "end_time": "17:00:00"}, headers=headers_doc)
    apt_res = client.post("/api/v1/appointments/", json={"patient_id": patient["id"], "doctor_id": doctor["id"], "appointment_date": "2026-11-01", "start_time": "10:00:00"}, headers=headers_pat)
    rec_res = client.post("/api/v1/medical-records/", json={"patient_id": patient["id"], "title": "Audit Check", "category": "General", "record_date": "2026-11-01"}, headers=headers_doc)
    inv_res = client.post("/api/v1/invoices/", json={"patient_id": patient["id"], "invoice_date": "2026-11-01", "tax": 10.0, "items": [{"description": "Fee", "amount": 100.0}]}, headers=headers_admin)

    # ================= 1. ADMIN AUDIT ACCESS & LISTING =================
    # Admin can list audit logs -> 200 OK
    audit_list_res = client.get("/api/v1/audit-logs/", headers=headers_admin)
    assert audit_list_res.status_code == 200
    logs = audit_list_res.json()
    assert len(logs) >= 5

    # Verify audit entry schema and structure
    first_log = logs[0]
    assert "id" in first_log
    assert "user_id" in first_log
    assert "user_name" in first_log
    assert "role" in first_log
    assert "action" in first_log
    assert "resource" in first_log
    assert "created_at" in first_log

    # Admin can get specific audit log by ID -> 200 OK
    log_id = first_log["id"]
    get_log_res = client.get(f"/api/v1/audit-logs/{log_id}", headers=headers_admin)
    assert get_log_res.status_code == 200
    assert get_log_res.json()["id"] == log_id

    # Non-existent audit log -> 404 Not Found
    assert client.get("/api/v1/audit-logs/999999", headers=headers_admin).status_code == 404

    # ================= 2. NON-ADMIN AUDIT ACCESS RESTRICTIONS =================
    # Patient access audit logs -> 403 Forbidden
    assert client.get("/api/v1/audit-logs/", headers=headers_pat).status_code == 403
    assert client.get(f"/api/v1/audit-logs/{log_id}", headers=headers_pat).status_code == 403

    # Doctor access audit logs -> 403 Forbidden
    assert client.get("/api/v1/audit-logs/", headers=headers_doc).status_code == 403
    assert client.get(f"/api/v1/audit-logs/{log_id}", headers=headers_doc).status_code == 403

    # Receptionist access audit logs -> 403 Forbidden
    assert client.get("/api/v1/audit-logs/", headers=headers_rec).status_code == 403
    assert client.get(f"/api/v1/audit-logs/{log_id}", headers=headers_rec).status_code == 403

    # Missing JWT -> 401 Unauthorized
    assert client.get("/api/v1/audit-logs/").status_code == 401
    assert client.get(f"/api/v1/audit-logs/{log_id}").status_code == 401

    # Invalid JWT -> 401 Unauthorized
    assert client.get("/api/v1/audit-logs/", headers={"Authorization": "Bearer bad_token"}).status_code == 401

    # ================= 3. AUDIT EVENT RECORDING & QUERY FILTERS =================
    # Filter by user_id
    doc_logs_res = client.get(f"/api/v1/audit-logs/?user_id={doc_user['id']}", headers=headers_admin)
    assert doc_logs_res.status_code == 200
    for l in doc_logs_res.json():
        assert l["user_id"] == doc_user["id"]

    # Filter by action (e.g. LOGIN_SUCCESS)
    login_logs_res = client.get("/api/v1/audit-logs/?action=LOGIN_SUCCESS", headers=headers_admin)
    assert login_logs_res.status_code == 200
    assert len(login_logs_res.json()) >= 1
    assert all(l["action"] == "LOGIN_SUCCESS" for l in login_logs_res.json())

    # Filter by failed login action
    failed_login_logs = client.get("/api/v1/audit-logs/?action=LOGIN_FAILED", headers=headers_admin)
    assert failed_login_logs.status_code == 200
    assert len(failed_login_logs.json()) >= 1

    # Filter by resource (e.g. Invoice)
    inv_logs_res = client.get("/api/v1/audit-logs/?resource=Invoice", headers=headers_admin)
    assert inv_logs_res.status_code == 200
    assert len(inv_logs_res.json()) >= 1

    # ================= 4. SENSITIVE CREDENTIAL PROTECTION =================
    all_logs = client.get("/api/v1/audit-logs/?limit=1000", headers=headers_admin).json()
    for entry in all_logs:
        details_str = str(entry.get("details") or "").lower()
        assert "password123" not in details_str
        assert "hashed_password" not in details_str
        assert "access_token" not in details_str
        assert "secret" not in details_str
