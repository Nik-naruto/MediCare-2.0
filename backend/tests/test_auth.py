"""Pytest suite for verifying POST /api/v1/auth/register, POST /api/v1/auth/login, GET /api/v1/auth/me, POST /api/v1/auth/change-password, and POST /api/v1/auth/dev-reset-password endpoints."""

from app.models.enums import UserRole


def test_register_user_success(client):
    """Test successful user registration returns 201 Created and safe UserResponse."""
    payload = {
        "email": "new.patient@medicare.com",
        "password": "securepassword123",
        "full_name": "Aarav Sharma",
        "phone": "+919876543210",
        "role": UserRole.PATIENT.value,
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["email"] == "new.patient@medicare.com"
    assert data["full_name"] == "Aarav Sharma"
    assert data["role"] == "Patient"
    assert data["is_active"] is True
    assert "hashed_password" not in data
    assert "password" not in data


def test_register_user_duplicate_email_conflict(client):
    """Test registering with an existing email returns 409 Conflict."""
    payload = {
        "email": "duplicate.patient@medicare.com",
        "password": "securepassword123",
        "full_name": "First Patient",
        "role": UserRole.PATIENT.value,
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    data = res2.json()
    assert "already exists" in data["detail"]


def test_login_user_form_data_success(client):
    """Test successful user login with OAuth2 form data (used by Swagger UI Authorize modal)."""
    # Register user first
    reg_payload = {
        "email": "login.form@medicare.com",
        "password": "mysecretpassword123",
        "full_name": "Form User",
        "role": UserRole.PATIENT.value,
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    # OAuth2 Form login (username=email, password=password)
    res = client.post(
        "/api/v1/auth/login",
        data={"username": "login.form@medicare.com", "password": "mysecretpassword123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_get_current_user_me_endpoint(client):
    """Test protected GET /api/v1/auth/me endpoint using Bearer token."""
    # 1. Register user
    reg_payload = {
        "email": "me.user@medicare.com",
        "password": "mysecretpassword123",
        "full_name": "Me User",
        "role": UserRole.PATIENT.value,
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    # 2. Login to get token
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "me.user@medicare.com", "password": "mysecretpassword123"},
    )
    token = login_res.json()["access_token"]

    # 3. Call GET /api/v1/auth/me with Authorization: Bearer <token>
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    data = me_res.json()
    assert data["email"] == "me.user@medicare.com"
    assert data["full_name"] == "Me User"


def test_change_password_success(client):
    """Test authenticated password change and login with new password."""
    # 1. Register user
    client.post("/api/v1/auth/register", json={
        "email": "pwd.change@medicare.com",
        "password": "oldpassword123",
        "full_name": "Password Change User",
        "role": UserRole.PATIENT.value,
    })

    # 2. Login with old password
    login1 = client.post("/api/v1/auth/login", data={"username": "pwd.change@medicare.com", "password": "oldpassword123"})
    token1 = login1.json()["access_token"]

    # 3. Change password
    change_res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "oldpassword123", "new_password": "newsecretpassword456"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert change_res.status_code == 200
    assert change_res.json()["message"] == "Password changed successfully"

    # 4. Login with old password fails (401)
    fail_login = client.post("/api/v1/auth/login", data={"username": "pwd.change@medicare.com", "password": "oldpassword123"})
    assert fail_login.status_code == 401

    # 5. Login with new password succeeds (200)
    success_login = client.post("/api/v1/auth/login", data={"username": "pwd.change@medicare.com", "password": "newsecretpassword456"})
    assert success_login.status_code == 200
    assert "access_token" in success_login.json()


def test_change_password_incorrect_current_password_400(client):
    """Test password change fails with 400 when current_password is wrong."""
    client.post("/api/v1/auth/register", json={
        "email": "pwd.wrong@medicare.com",
        "password": "correctpassword123",
        "full_name": "Wrong Password User",
        "role": UserRole.PATIENT.value,
    })

    login = client.post("/api/v1/auth/login", data={"username": "pwd.wrong@medicare.com", "password": "correctpassword123"})
    token = login.json()["access_token"]

    change_res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "wrongpassword123", "new_password": "newsecretpassword456"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert change_res.status_code == 400
    assert "Incorrect current password" in change_res.json()["detail"]


def test_dev_reset_password_success(client):
    """Test [DEVELOPMENT ONLY] password reset by email allows login with new password."""
    # 1. Register existing patient user (e.g. nik@example.com)
    client.post("/api/v1/auth/register", json={
        "email": "nik@example.com",
        "password": "oldforgottenpass123",
        "full_name": "Nik Patient",
        "role": UserRole.PATIENT.value,
    })

    # 2. Reset password via dev endpoint
    reset_res = client.post(
        "/api/v1/auth/dev-reset-password",
        json={"email": "nik@example.com", "new_password": "NewTempPassword123!"},
    )
    assert reset_res.status_code == 200
    assert "Password reset successfully" in reset_res.json()["message"]

    # 3. Login with old password fails (401)
    fail_login = client.post("/api/v1/auth/login", data={"username": "nik@example.com", "password": "oldforgottenpass123"})
    assert fail_login.status_code == 401

    # 4. Login with new temporary password succeeds (200)
    success_login = client.post("/api/v1/auth/login", data={"username": "nik@example.com", "password": "NewTempPassword123!"})
    assert success_login.status_code == 200
    assert "access_token" in success_login.json()


def test_login_user_invalid_credentials_401(client):
    """Test login with wrong password returns 401 Unauthorized."""
    reg_payload = {
        "email": "wrong.pass@medicare.com",
        "password": "mysecretpassword123",
        "full_name": "Wrong Pass User",
        "role": UserRole.PATIENT.value,
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    res = client.post(
        "/api/v1/auth/login",
        data={"username": "wrong.pass@medicare.com", "password": "wrongpassword"},
    )
    assert res.status_code == 401
    assert "Incorrect email or password" in res.json()["detail"]
