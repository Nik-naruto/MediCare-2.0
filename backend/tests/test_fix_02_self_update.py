"""Test suite for FIX #02: Patient Self-Update for Name & Phone."""

from app.models.enums import UserRole


def test_patient_self_update_authorization_matrix(client):
    # 1. Register Patient A & Patient B
    pat_a_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "fix2.pat.a@medicare.com",
            "password": "password123",
            "full_name": "Patient A Initial",
            "phone": "1111111111",
            "role": UserRole.PATIENT.value,
        },
    )
    assert pat_a_res.status_code == 201
    pat_a = pat_a_res.json()

    pat_b_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "fix2.pat.b@medicare.com",
            "password": "password123",
            "full_name": "Patient B Initial",
            "phone": "2222222222",
            "role": UserRole.PATIENT.value,
        },
    )
    assert pat_b_res.status_code == 201
    pat_b = pat_b_res.json()

    token_a = client.post(
        "/api/v1/auth/login",
        data={"username": "fix2.pat.a@medicare.com", "password": "password123"},
    ).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    token_b = client.post(
        "/api/v1/auth/login",
        data={"username": "fix2.pat.b@medicare.com", "password": "password123"},
    ).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. Patient A updates own full_name -> 200 OK
    res1 = client.put(
        f"/api/v1/users/{pat_a['id']}",
        json={"full_name": "Patient A Updated Name"},
        headers=headers_a,
    )
    assert res1.status_code == 200
    assert res1.json()["full_name"] == "Patient A Updated Name"

    # 2. Patient A updates own phone -> 200 OK
    res2 = client.put(
        f"/api/v1/users/{pat_a['id']}",
        json={"phone": "9999999999"},
        headers=headers_a,
    )
    assert res2.status_code == 200
    assert res2.json()["phone"] == "9999999999"

    # 3. Patient A updates both full_name and phone -> 200 OK
    res3 = client.put(
        f"/api/v1/users/{pat_a['id']}",
        json={"full_name": "Patient A Final Name", "phone": "8888888888"},
        headers=headers_a,
    )
    assert res3.status_code == 200
    assert res3.json()["full_name"] == "Patient A Final Name"
    assert res3.json()["phone"] == "8888888888"

    # 4. Patient A attempts to update Patient B user record -> 403 Forbidden
    res4 = client.put(
        f"/api/v1/users/{pat_b['id']}",
        json={"full_name": "Hacked Name"},
        headers=headers_a,
    )
    assert res4.status_code == 403

    # 5. Patient A attempts role escalation via PUT /users/{id} -> role unchanged
    res5 = client.put(
        f"/api/v1/users/{pat_a['id']}",
        json={"role": UserRole.ADMIN.value},
        headers=headers_a,
    )
    assert res5.status_code == 200
    assert res5.json()["role"] == UserRole.PATIENT.value

    # 6. Patient A attempts is_active deactivation via PUT /users/{id} -> is_active unchanged
    res6 = client.put(
        f"/api/v1/users/{pat_a['id']}",
        json={"is_active": False},
        headers=headers_a,
    )
    assert res6.status_code == 200
    assert res6.json()["is_active"] is True

    # 7. Patient A attempts password hash override via PUT /users/{id} -> password unchanged
    res7 = client.put(
        f"/api/v1/users/{pat_a['id']}",
        json={"password": "hackedpassword"},
        headers=headers_a,
    )
    assert res7.status_code == 200
    login_check = client.post(
        "/api/v1/auth/login",
        data={"username": "fix2.pat.a@medicare.com", "password": "password123"},
    )
    assert login_check.status_code == 200

    # 8. Setup Admin user
    admin_user = client.post(
        "/api/v1/auth/register",
        json={
            "email": "fix2.admin@medicare.com",
            "password": "password123",
            "full_name": "Admin User",
            "role": UserRole.ADMIN.value,
        },
    ).json()

    admin_token = client.post(
        "/api/v1/auth/login",
        data={"username": "fix2.admin@medicare.com", "password": "password123"},
    ).json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # 9. Admin updates user -> 200 OK
    admin_upd = client.put(
        f"/api/v1/users/{pat_a['id']}",
        json={"full_name": "Admin Changed Name"},
        headers=headers_admin,
    )
    assert admin_upd.status_code == 200
    assert admin_upd.json()["full_name"] == "Admin Changed Name"

    # 10. Admin role update -> 200 OK
    admin_role = client.put(
        f"/api/v1/users/{pat_b['id']}/role",
        json={"role": UserRole.RECEPTIONIST.value},
        headers=headers_admin,
    )
    assert admin_role.status_code == 200
    assert admin_role.json()["role"] == UserRole.RECEPTIONIST.value

    # 11. Admin status update -> 200 OK
    admin_status = client.put(
        f"/api/v1/users/{pat_b['id']}/status",
        json={"is_active": False},
        headers=headers_admin,
    )
    assert admin_status.status_code == 200
    assert admin_status.json()["is_active"] is False
