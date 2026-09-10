"""Pytest suite verifying production readiness guards, dev endpoint isolation, and date range validations."""

import pytest
from app.core.config import settings
from app.models.enums import UserRole


def test_dev_reset_password_production_guard(client):
    """Verify /dev-reset-password endpoint returns 403 when ENABLE_DEV_ENDPOINTS is False or ENVIRONMENT is production."""
    # Default development mode: should work or return 404 for non-existent user
    res_dev = client.post("/api/v1/auth/dev-reset-password", json={"email": "nonexistent@medicare.com", "new_password": "newpassword123"})
    assert res_dev.status_code == 404

    # Temporarily set environment to production
    original_env = settings.ENVIRONMENT
    original_flag = settings.ENABLE_DEV_ENDPOINTS
    try:
        settings.ENVIRONMENT = "production"
        settings.ENABLE_DEV_ENDPOINTS = False

        res_prod = client.post("/api/v1/auth/dev-reset-password", json={"email": "nonexistent@medicare.com", "new_password": "newpassword123"})
        assert res_prod.status_code == 403
        assert "disabled in production" in res_prod.json()["detail"]
    finally:
        settings.ENVIRONMENT = original_env
        settings.ENABLE_DEV_ENDPOINTS = original_flag


def test_invalid_date_range_validation(client):
    """Verify that date_from > date_to returns 400 Bad Request across endpoints."""
    admin_user = client.post("/api/v1/auth/register", json={"email": "val.admin@medicare.com", "password": "password123", "full_name": "Val Admin", "role": UserRole.ADMIN.value}).json()
    admin_token = client.post("/api/v1/auth/login", data={"username": "val.admin@medicare.com", "password": "password123"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Appointments with date_from > date_to
    res_apt = client.get("/api/v1/appointments/?date_from=2026-12-31&date_to=2026-12-01", headers=headers)
    assert res_apt.status_code == 400
    assert "date_from cannot be after date_to" in res_apt.json()["detail"]

    # 2. Invoices with date_from > date_to
    res_inv = client.get("/api/v1/invoices/?date_from=2026-12-31&date_to=2026-12-01", headers=headers)
    assert res_inv.status_code == 400
    assert "date_from cannot be after date_to" in res_inv.json()["detail"]

    # 3. Audit Logs with date_from > date_to
    res_log = client.get("/api/v1/audit-logs/?date_from=2026-12-31&date_to=2026-12-01", headers=headers)
    assert res_log.status_code == 400
    assert "date_from cannot be after date_to" in res_log.json()["detail"]
