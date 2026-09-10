"""Pytest suite for verifying Administrative User Management, Role Changes, Deactivation & Data Integrity."""

from app.db.session import get_db
from app.main import app
from app.models.enums import Gender, UserRole
from app.repositories.user import UserRepository


def test_user_admin_authorization_matrix(client):
    """Comprehensive 38-criterion test matrix for Admin User Management and security policies."""
    # 1. Setup Admin A & Admin B
    admin_user_a = client.post("/api/v1/auth/register", json={"email": "uadmin.a@medicare.com", "password": "password123", "full_name": "Admin Main", "role": UserRole.ADMIN.value}).json()
    
    # Verify public registration cannot create Admin directly once an active Admin exists
    assert client.post("/api/v1/auth/register", json={"email": "hacker.admin@medicare.com", "password": "password123", "full_name": "Hacker Admin", "role": UserRole.ADMIN.value}).status_code == 403

    admin_token_a = client.post("/api/v1/auth/login", data={"username": "uadmin.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_admin_a = {"Authorization": f"Bearer {admin_token_a}"}

    # Admin A creates Admin B via Admin endpoint POST /api/v1/users/
    adm_b_res = client.post("/api/v1/users/", json={"email": "uadmin.b@medicare.com", "password": "password123", "full_name": "Admin Second", "role": UserRole.ADMIN.value}, headers=headers_admin_a)
    assert adm_b_res.status_code == 201
    user_b_id = adm_b_res.json()["id"]
    admin_token_b = client.post("/api/v1/auth/login", data={"username": "uadmin.b@medicare.com", "password": "password123"}).json()["access_token"]
    headers_admin_b = {"Authorization": f"Bearer {admin_token_b}"}

    # 2. Setup Doctor, Patient, Receptionist
    doc_user = client.post("/api/v1/auth/register", json={"email": "uadmin.doc@medicare.com", "password": "password123", "full_name": "Dr. User", "role": UserRole.DOCTOR.value}).json()
    doc_token = client.post("/api/v1/auth/login", data={"username": "uadmin.doc@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc = {"Authorization": f"Bearer {doc_token}"}
    doctor = client.post("/api/v1/doctors/", json={"user_id": doc_user["id"], "qualification": "MD", "specialty": "Cardiology", "consultation_fee": 1000.0, "room_no": "A-1"}).json()

    pat_user = client.post("/api/v1/auth/register", json={"email": "uadmin.pat@medicare.com", "password": "password123", "full_name": "Patient User", "role": UserRole.PATIENT.value}).json()
    pat_token = client.post("/api/v1/auth/login", data={"username": "uadmin.pat@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat = {"Authorization": f"Bearer {pat_token}"}
    patient = client.post("/api/v1/patients/", json={"user_id": pat_user["id"], "gender": Gender.MALE.value}, headers=headers_pat).json()

    rec_user = client.post("/api/v1/auth/register", json={"email": "uadmin.rec@medicare.com", "password": "password123", "full_name": "Rec User", "role": UserRole.RECEPTIONIST.value}).json()
    rec_token = client.post("/api/v1/auth/login", data={"username": "uadmin.rec@medicare.com", "password": "password123"}).json()["access_token"]
    headers_rec = {"Authorization": f"Bearer {rec_token}"}

    # Setup Schedule & Clinical Data Integrity Objects
    client.post("/api/v1/schedules/", json={"doctor_id": doctor["id"], "day_of_week": "Friday", "start_time": "08:00:00", "end_time": "20:00:00"}, headers=headers_doc)
    client.post("/api/v1/appointments/", json={"patient_id": patient["id"], "doctor_id": doctor["id"], "appointment_date": "2026-10-16", "start_time": "10:00:00"}, headers=headers_pat)
    rec_res = client.post("/api/v1/medical-records/", json={"patient_id": patient["id"], "title": "Integrity Check", "category": "General", "record_date": "2026-10-16"}, headers=headers_doc)
    rx_res = client.post("/api/v1/prescriptions/", json={"patient_id": patient["id"], "doctor_id": doctor["id"], "diagnosis": "Hypertension"}, headers=headers_doc)
    lab_res = client.post("/api/v1/lab-reports/", json={"patient_id": patient["id"], "test_name": "Blood Count", "request_date": "2026-10-16"}, headers=headers_doc)
    inv_res = client.post("/api/v1/invoices/", json={"patient_id": patient["id"], "invoice_date": "2026-10-16", "tax": 20.0, "items": [{"description": "Checkup", "amount": 100.0}]}, headers=headers_admin_a)
    notif_res = client.post("/api/v1/notifications/", json={"user_id": pat_user["id"], "title": "Reminder", "message": "Appointment coming up"}, headers=headers_admin_a)

    # ================= 1. AUTHORIZATION TESTS =================
    # 1. Admin can list users -> 200 OK
    admin_list = client.get("/api/v1/users/", headers=headers_admin_a)
    assert admin_list.status_code == 200
    assert len(admin_list.json()) >= 5

    # Filter by role & active
    doc_filter = client.get("/api/v1/users/?role=Doctor", headers=headers_admin_a)
    assert doc_filter.status_code == 200
    assert all(u["role"] == "Doctor" for u in doc_filter.json())

    # 2. Patient cannot list users -> 403 Forbidden
    assert client.get("/api/v1/users/", headers=headers_pat).status_code == 403

    # 3. Doctor cannot list users -> 403 Forbidden
    assert client.get("/api/v1/users/", headers=headers_doc).status_code == 403

    # 4. Receptionist cannot list users -> 403 Forbidden
    assert client.get("/api/v1/users/", headers=headers_rec).status_code == 403

    # 5. Admin can get user -> 200 OK
    get_pat = client.get(f"/api/v1/users/{pat_user['id']}", headers=headers_admin_a)
    assert get_pat.status_code == 200
    assert get_pat.json()["id"] == pat_user["id"]

    # 6. Non-admin cannot get arbitrary user -> 403 Forbidden
    assert client.get(f"/api/v1/users/{pat_user['id']}", headers=headers_doc).status_code == 403
    assert client.get(f"/api/v1/users/{doc_user['id']}", headers=headers_pat).status_code == 403

    # ================= 2. ADMIN CRUD TESTS =================
    # 7. Admin can update safe user fields
    upd_pat = client.put(f"/api/v1/users/{pat_user['id']}", json={"full_name": "Updated Patient Name", "phone": "9998887776"}, headers=headers_admin_a)
    assert upd_pat.status_code == 200
    assert upd_pat.json()["full_name"] == "Updated Patient Name"
    assert upd_pat.json()["phone"] == "9998887776"

    # 8. Admin cannot inject password hash through normal update
    upd_pwd_hack = client.put(f"/api/v1/users/{pat_user['id']}", json={"hashed_password": "hacked_hash", "password": "hacked_password"}, headers=headers_admin_a)
    assert upd_pwd_hack.status_code == 200
    # Verify password was not changed by attempting login with original password
    assert client.post("/api/v1/auth/login", data={"username": "uadmin.pat@medicare.com", "password": "password123"}).status_code == 200

    # 9. Admin can change role
    chg_role = client.put(f"/api/v1/users/{rec_user['id']}/role", json={"role": UserRole.PATIENT.value}, headers=headers_admin_a)
    assert chg_role.status_code == 200
    assert chg_role.json()["role"] == UserRole.PATIENT.value

    # Revert rec role back
    client.put(f"/api/v1/users/{rec_user['id']}/role", json={"role": UserRole.RECEPTIONIST.value}, headers=headers_admin_a)

    # 10. Non-admin cannot change role -> 403 Forbidden
    assert client.put(f"/api/v1/users/{pat_user['id']}/role", json={"role": UserRole.ADMIN.value}, headers=headers_pat).status_code == 403

    # 11. User cannot change their own role -> 403 Forbidden
    assert client.put(f"/api/v1/users/{pat_user['id']}/role", json={"role": UserRole.ADMIN.value}, headers=headers_pat).status_code == 403

    # 12. Invalid role -> 422 Unprocessable Entity
    assert client.put(f"/api/v1/users/{pat_user['id']}/role", json={"role": "SuperHero"}, headers=headers_admin_a).status_code == 422

    # ================= 3. STATUS & ACTIVATION TESTS =================
    # 13. Admin can deactivate user -> 200 OK
    deact_pat = client.put(f"/api/v1/users/{pat_user['id']}/status", json={"is_active": False}, headers=headers_admin_a)
    assert deact_pat.status_code == 200
    assert deact_pat.json()["is_active"] is False

    # 16. Deactivated user cannot login -> 400 Bad Request
    deact_login = client.post("/api/v1/auth/login", data={"username": "uadmin.pat@medicare.com", "password": "password123"})
    assert deact_login.status_code == 400

    # 17. Deactivated user cannot access protected endpoint -> 401 Unauthorized
    assert client.get("/api/v1/appointments/", headers=headers_pat).status_code == 401

    # 15. Non-admin cannot deactivate user -> 403 Forbidden
    assert client.put(f"/api/v1/users/{doc_user['id']}/status", json={"is_active": False}, headers=headers_doc).status_code == 403

    # 14. Admin can reactivate user -> 200 OK
    react_pat = client.put(f"/api/v1/users/{pat_user['id']}/status", json={"is_active": True}, headers=headers_admin_a)
    assert react_pat.status_code == 200
    assert react_pat.json()["is_active"] is True

    # 18. Reactivated user can login again -> 200 OK
    assert client.post("/api/v1/auth/login", data={"username": "uadmin.pat@medicare.com", "password": "password123"}).status_code == 200

    # ================= 4. LAST ACTIVE ADMIN PROTECTION =================
    # Deactivate Admin B so Admin A is the ONLY active admin
    client.put(f"/api/v1/users/{user_b_id}/status", json={"is_active": False}, headers=headers_admin_a)

    # 19. Last active Admin cannot be deactivated -> 400 Bad Request
    last_deact = client.put(f"/api/v1/users/{admin_user_a['id']}/status", json={"is_active": False}, headers=headers_admin_a)
    assert last_deact.status_code == 400
    assert "last active Admin" in last_deact.json()["detail"]

    # 20. Last active Admin cannot be demoted if that would leave zero active Admins -> 400 Bad Request
    last_demote = client.put(f"/api/v1/users/{admin_user_a['id']}/role", json={"role": UserRole.PATIENT.value}, headers=headers_admin_a)
    assert last_demote.status_code == 400
    assert "last active Admin" in last_demote.json()["detail"]

    # Reactivate Admin B
    client.put(f"/api/v1/users/{user_b_id}/status", json={"is_active": True}, headers=headers_admin_a)

    # ================= 5. SECURITY & RESPONSE INTEGRITY =================
    # 21. Public registration cannot create Admin (tested above)
    # 22. Patient cannot elevate own role -> 403
    assert client.put(f"/api/v1/users/{pat_user['id']}/role", json={"role": UserRole.ADMIN.value}, headers=headers_pat).status_code == 403
    # 23. Doctor cannot elevate own role -> 403
    assert client.put(f"/api/v1/users/{doc_user['id']}/role", json={"role": UserRole.ADMIN.value}, headers=headers_doc).status_code == 403
    # 24. Receptionist cannot elevate own role -> 403
    assert client.put(f"/api/v1/users/{rec_user['id']}/role", json={"role": UserRole.ADMIN.value}, headers=headers_rec).status_code == 403
    # 25. User cannot modify another user's profile through admin endpoint -> 403
    assert client.put(f"/api/v1/users/{doc_user['id']}", json={"full_name": "Hacked Doc"}, headers=headers_pat).status_code == 403

    # 26 & 27. Password/hash/tokens never appear in user response
    user_res_keys = set(get_pat.json().keys())
    assert "password" not in user_res_keys
    assert "hashed_password" not in user_res_keys
    assert "access_token" not in user_res_keys
    assert "secret" not in user_res_keys

    # ================= 6. DATA INTEGRITY CHECKS =================
    # Deactivate and reactivate Doctor User
    client.delete(f"/api/v1/users/{doc_user['id']}", headers=headers_admin_a)  # Soft-deactivation via DELETE
    client.put(f"/api/v1/users/{doc_user['id']}/status", json={"is_active": True}, headers=headers_admin_a)

    # Verify 28-35: Clinical entities remain completely intact after user management actions
    assert client.get(f"/api/v1/patients/{patient['id']}", headers=headers_admin_a).status_code == 200
    assert client.get(f"/api/v1/doctors/{doctor['id']}", headers=headers_admin_a).status_code == 200
    assert client.get(f"/api/v1/medical-records/{rec_res.json()['id']}", headers=headers_admin_a).status_code == 200
    assert client.get(f"/api/v1/prescriptions/{rx_res.json()['id']}", headers=headers_admin_a).status_code == 200
    assert client.get(f"/api/v1/lab-reports/{lab_res.json()['id']}", headers=headers_admin_a).status_code == 200
    assert client.get(f"/api/v1/invoices/{inv_res.json()['id']}", headers=headers_admin_a).status_code == 200
    assert client.get(f"/api/v1/notifications/{notif_res.json()['id']}", headers=headers_admin_a).status_code == 200

    # ================= 7. AUTHENTICATION ENFORCEMENT =================
    # 36. Missing JWT -> 401 Unauthorized
    assert client.get(f"/api/v1/users/{pat_user['id']}").status_code == 401

    # 37. Invalid JWT -> 401 Unauthorized
    assert client.get(f"/api/v1/users/{pat_user['id']}", headers={"Authorization": "Bearer bad_token"}).status_code == 401
