"""Pytest suite for verifying Patient Domain-Level Data Ownership Authorization."""

from app.models.enums import Gender, UserRole


def test_patient_domain_ownership_enforcement(client):
    """Test data ownership rules for Patient role vs Admin role."""
    # 1. Setup Patient A
    user_a = client.post("/api/v1/auth/register", json={
        "email": "patient.a@medicare.com", "password": "password123", "full_name": "Patient A", "role": UserRole.PATIENT.value
    }).json()
    token_a = client.post("/api/v1/auth/login", data={"username": "patient.a@medicare.com", "password": "password123"}).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    patient_a = client.post("/api/v1/patients/", json={"user_id": user_a["id"], "gender": Gender.MALE.value}, headers=headers_a).json()

    # 2. Setup Patient B
    user_b = client.post("/api/v1/auth/register", json={
        "email": "patient.b@medicare.com", "password": "password123", "full_name": "Patient B", "role": UserRole.PATIENT.value
    }).json()
    token_b = client.post("/api/v1/auth/login", data={"username": "patient.b@medicare.com", "password": "password123"}).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    patient_b = client.post("/api/v1/patients/", json={"user_id": user_b["id"], "gender": Gender.FEMALE.value}, headers=headers_b).json()

    # 3. Setup Admin User
    admin_user = client.post("/api/v1/auth/register", json={
        "email": "admin.patient@medicare.com", "password": "password123", "full_name": "Admin System", "role": UserRole.ADMIN.value
    }).json()
    token_admin = client.post("/api/v1/auth/login", data={"username": "admin.patient@medicare.com", "password": "password123"}).json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {token_admin}"}

    # --- TEST 1: Patient A can GET own profile (200 OK) ---
    res_own = client.get(f"/api/v1/patients/{patient_a['id']}", headers=headers_a)
    assert res_own.status_code == 200
    assert res_own.json()["id"] == patient_a["id"]

    # --- TEST 2: Patient A CANNOT GET Patient B profile (403 Forbidden) ---
    res_other = client.get(f"/api/v1/patients/{patient_b['id']}", headers=headers_a)
    assert res_other.status_code == 403
    assert "Access denied" in res_other.json()["detail"]

    # --- TEST 3: Patient A can UPDATE own profile (200 OK) ---
    res_upd_own = client.put(f"/api/v1/patients/{patient_a['id']}", json={"blood_group": "A+"}, headers=headers_a)
    assert res_upd_own.status_code == 200
    assert res_upd_own.json()["blood_group"] == "A+"

    # --- TEST 4: Patient A CANNOT UPDATE Patient B profile (403 Forbidden) ---
    res_upd_other = client.put(f"/api/v1/patients/{patient_b['id']}", json={"blood_group": "B+"}, headers=headers_a)
    assert res_upd_other.status_code == 403

    # --- TEST 5: Patient A CANNOT DELETE Patient B profile (403 Forbidden) ---
    res_del_other = client.delete(f"/api/v1/patients/{patient_b['id']}", headers=headers_a)
    assert res_del_other.status_code == 403

    # --- TEST 6: GET /api/v1/patients/ for Patient A returns ONLY Patient A record ---
    list_a = client.get("/api/v1/patients/", headers=headers_a)
    assert list_a.status_code == 200
    records = list_a.json()
    assert len(records) == 1
    assert records[0]["id"] == patient_a["id"]

    # --- TEST 7: Admin CAN GET and UPDATE Patient B profile ---
    admin_get = client.get(f"/api/v1/patients/{patient_b['id']}", headers=headers_admin)
    assert admin_get.status_code == 200

    admin_upd = client.put(f"/api/v1/patients/{patient_b['id']}", json={"blood_group": "O-"}, headers=headers_admin)
    assert admin_upd.status_code == 200
    assert admin_upd.json()["blood_group"] == "O-"

    # --- TEST 8: Missing token returns 401 Unauthorized ---
    no_token = client.get(f"/api/v1/patients/{patient_a['id']}")
    assert no_token.status_code == 401
