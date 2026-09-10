"""Pytest suite for verifying Notification Domain-Level Ownership & Role Authorization."""

from app.models.enums import UserRole


def test_notification_domain_authorization_matrix(client):
    """Comprehensive test suite for Notification role, ownership, and user_id attack scenarios."""
    # 1. Setup Patient A & Patient B Users
    pat_user_a = client.post("/api/v1/auth/register", json={"email": "notif.pat.a@medicare.com", "password": "password123", "full_name": "Patient Notif A", "role": UserRole.PATIENT.value}).json()
    pat_token_a = client.post("/api/v1/auth/login", data={"username": "notif.pat.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_a = {"Authorization": f"Bearer {pat_token_a}"}

    pat_user_b = client.post("/api/v1/auth/register", json={"email": "notif.pat.b@medicare.com", "password": "password123", "full_name": "Patient Notif B", "role": UserRole.PATIENT.value}).json()
    pat_token_b = client.post("/api/v1/auth/login", data={"username": "notif.pat.b@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_b = {"Authorization": f"Bearer {pat_token_b}"}

    # 2. Setup Doctor User
    doc_user = client.post("/api/v1/auth/register", json={"email": "notif.doc@medicare.com", "password": "password123", "full_name": "Dr. Notif", "role": UserRole.DOCTOR.value}).json()
    doc_token = client.post("/api/v1/auth/login", data={"username": "notif.doc@medicare.com", "password": "password123"}).json()["access_token"]
    headers_doc = {"Authorization": f"Bearer {doc_token}"}

    # 3. Setup Receptionist User
    rec_user = client.post("/api/v1/auth/register", json={"email": "notif.rec@medicare.com", "password": "password123", "full_name": "Rec Notif", "role": UserRole.RECEPTIONIST.value}).json()
    rec_token = client.post("/api/v1/auth/login", data={"username": "notif.rec@medicare.com", "password": "password123"}).json()["access_token"]
    headers_rec = {"Authorization": f"Bearer {rec_token}"}

    # 4. Setup Admin User
    admin_user = client.post("/api/v1/auth/register", json={"email": "notif.admin@medicare.com", "password": "password123", "full_name": "Admin Notif", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "notif.admin@medicare.com", "password": "password123"}).json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # 5. Admin creates Notifications for Patient A, Doctor, and Receptionist
    notif_a_res = client.post("/api/v1/notifications/", json={"user_id": pat_user_a["id"], "title": "Apt Reminder", "message": "Your appointment is tomorrow."}, headers=headers_admin)
    assert notif_a_res.status_code == 201
    notif_a_id = notif_a_res.json()["id"]

    notif_b_res = client.post("/api/v1/notifications/", json={"user_id": pat_user_b["id"], "title": "Lab Ready", "message": "Your lab report is ready."}, headers=headers_admin)
    assert notif_b_res.status_code == 201
    notif_b_id = notif_b_res.json()["id"]

    notif_doc_res = client.post("/api/v1/notifications/", json={"user_id": doc_user["id"], "title": "Schedule Update", "message": "New patient booked."}, headers=headers_admin)
    assert notif_doc_res.status_code == 201
    notif_doc_id = notif_doc_res.json()["id"]

    notif_rec_res = client.post("/api/v1/notifications/", json={"user_id": rec_user["id"], "title": "Desk Notice", "message": "Front desk shift update."}, headers=headers_admin)
    assert notif_rec_res.status_code == 201
    notif_rec_id = notif_rec_res.json()["id"]

    # ================= PATIENT TESTS =================
    # Patient A own list -> 200 OK
    pat_list = client.get("/api/v1/notifications/", headers=headers_pat_a)
    assert pat_list.status_code == 200
    assert len(pat_list.json()) == 1
    assert pat_list.json()[0]["id"] == notif_a_id

    # Patient A GET Patient B notification -> 403 Forbidden
    assert client.get(f"/api/v1/notifications/{notif_b_id}", headers=headers_pat_a).status_code == 403

    # Patient A own update/read -> 200 OK
    pat_upd = client.put(f"/api/v1/notifications/{notif_a_id}?is_read=true", headers=headers_pat_a)
    assert pat_upd.status_code == 200
    assert pat_upd.json()["is_read"] is True

    # Patient A create notification -> 403 Forbidden
    assert client.post("/api/v1/notifications/", json={"user_id": pat_user_a["id"], "title": "Self Notif", "message": "Test"}, headers=headers_pat_a).status_code == 403

    # Patient A delete notification -> 403 Forbidden
    assert client.delete(f"/api/v1/notifications/{notif_a_id}", headers=headers_pat_a).status_code == 403

    # ================= DOCTOR TESTS =================
    # Doctor own list & access -> 200 OK
    doc_list = client.get("/api/v1/notifications/", headers=headers_doc)
    assert doc_list.status_code == 200
    assert len(doc_list.json()) == 1
    assert doc_list.json()[0]["id"] == notif_doc_id

    # Doctor another user's notification -> 403 Forbidden
    assert client.get(f"/api/v1/notifications/{notif_a_id}", headers=headers_doc).status_code == 403

    # Doctor unauthorized create/delete -> 403 Forbidden
    assert client.post("/api/v1/notifications/", json={"user_id": doc_user["id"], "title": "Doc Notif", "message": "Test"}, headers=headers_doc).status_code == 403
    assert client.delete(f"/api/v1/notifications/{notif_doc_id}", headers=headers_doc).status_code == 403

    # ================= RECEPTIONIST TESTS =================
    # Receptionist own list & access -> 200 OK
    rec_list = client.get("/api/v1/notifications/", headers=headers_rec)
    assert rec_list.status_code == 200
    assert len(rec_list.json()) == 1
    assert rec_list.json()[0]["id"] == notif_rec_id

    # Receptionist another user's notification -> 403 Forbidden
    assert client.get(f"/api/v1/notifications/{notif_a_id}", headers=headers_rec).status_code == 403

    # Receptionist unauthorized create/delete -> 403 Forbidden
    assert client.post("/api/v1/notifications/", json={"user_id": rec_user["id"], "title": "Rec Notif", "message": "Test"}, headers=headers_rec).status_code == 403
    assert client.delete(f"/api/v1/notifications/{notif_rec_id}", headers=headers_rec).status_code == 403

    # ================= ADMIN TESTS =================
    # Admin list all notifications -> 200 OK
    assert client.get("/api/v1/notifications/", headers=headers_admin).status_code == 200

    # Admin GET any notification -> 200 OK
    assert client.get(f"/api/v1/notifications/{notif_a_id}", headers=headers_admin).status_code == 200

    # Admin delete notification -> 204 No Content
    assert client.delete(f"/api/v1/notifications/{notif_a_id}", headers=headers_admin).status_code == 204

    # ================= SECURITY / AUTHENTICATION TESTS =================
    # Missing JWT -> 401 Unauthorized
    assert client.get(f"/api/v1/notifications/{notif_b_id}").status_code == 401

    # Invalid JWT -> 401 Unauthorized
    assert client.get(f"/api/v1/notifications/{notif_b_id}", headers={"Authorization": "Bearer bad_token"}).status_code == 401

    # Non-existent notification -> 404 Not Found
    assert client.get("/api/v1/notifications/99999", headers=headers_admin).status_code == 404
