"""Pytest suite for verifying Receptionist -> Patient Domain-Level Authorization."""

from app.models.enums import Gender, UserRole


def test_receptionist_patient_authorization_rules(client):
    """Test Receptionist domain authorization rules on Patient module endpoints."""
    # 1. Setup Receptionist User
    rec_user = client.post("/api/v1/auth/register", json={
        "email": "rec.frontdesk@medicare.com", "password": "password123", "full_name": "Frontdesk Staff", "role": UserRole.RECEPTIONIST.value
    }).json()
    rec_token = client.post("/api/v1/auth/login", data={"username": "rec.frontdesk@medicare.com", "password": "password123"}).json()["access_token"]
    headers_rec = {"Authorization": f"Bearer {rec_token}"}

    # 2. Setup Patient User A & Profile
    pat_user_a = client.post("/api/v1/auth/register", json={
        "email": "pat.rec.a@medicare.com", "password": "password123", "full_name": "Patient Rec Alpha", "role": UserRole.PATIENT.value
    }).json()
    pat_token_a = client.post("/api/v1/auth/login", data={"username": "pat.rec.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_pat_a = {"Authorization": f"Bearer {pat_token_a}"}

    patient_a = client.post("/api/v1/patients/", json={"user_id": pat_user_a["id"], "gender": Gender.MALE.value}, headers=headers_pat_a).json()

    # 3. Setup Patient User B (unregistered initially)
    pat_user_b = client.post("/api/v1/auth/register", json={
        "email": "pat.rec.b@medicare.com", "password": "password123", "full_name": "Patient Rec Beta", "role": UserRole.PATIENT.value
    }).json()

    # --- TEST 1: Receptionist can GET patient list (200 OK) ---
    list_rec = client.get("/api/v1/patients/", headers=headers_rec)
    assert list_rec.status_code == 200
    assert len(list_rec.json()) >= 1

    # --- TEST 2: Receptionist can GET patient by ID (200 OK) ---
    read_rec = client.get(f"/api/v1/patients/{patient_a['id']}", headers=headers_rec)
    assert read_rec.status_code == 200
    assert read_rec.json()["id"] == patient_a["id"]

    # --- TEST 3: Receptionist can CREATE patient profile for any user (201 Created) ---
    create_rec = client.post("/api/v1/patients/", json={"user_id": pat_user_b["id"], "gender": Gender.FEMALE.value}, headers=headers_rec)
    assert create_rec.status_code == 201
    patient_b_id = create_rec.json()["id"]

    # --- TEST 4: Receptionist can UPDATE patient profile (200 OK) ---
    upd_rec = client.put(f"/api/v1/patients/{patient_a['id']}", json={"blood_group": "O+"}, headers=headers_rec)
    assert upd_rec.status_code == 200
    assert upd_rec.json()["blood_group"] == "O+"

    # --- TEST 5: Receptionist CANNOT DELETE patient profile (403 Forbidden) ---
    del_rec = client.delete(f"/api/v1/patients/{patient_a['id']}", headers=headers_rec)
    assert del_rec.status_code == 403
    assert "Receptionists are not permitted to delete patient profiles" in del_rec.json()["detail"]

    # --- TEST 6: Patient ownership rules still work (Patient A cannot update Patient B profile) -> 403 ---
    pat_cross_upd = client.put(f"/api/v1/patients/{patient_b_id}", json={"blood_group": "AB-"}, headers=headers_pat_a)
    assert pat_cross_upd.status_code == 403

    # --- TEST 7: Patient cannot create patient profile for another user -> 403 ---
    pat_cross_create = client.post("/api/v1/patients/", json={"user_id": 9999, "gender": Gender.MALE.value}, headers=headers_pat_a)
    assert pat_cross_create.status_code == 403

    # --- TEST 8: Missing token -> 401 Unauthorized ---
    assert client.get("/api/v1/patients/").status_code == 401

    # --- TEST 9: Invalid token -> 401 Unauthorized ---
    assert client.get("/api/v1/patients/", headers={"Authorization": "Bearer bad_token"}).status_code == 401
