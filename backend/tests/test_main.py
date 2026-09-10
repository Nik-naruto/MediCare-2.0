"""Pytest suite for verifying root, health check, and v1 module endpoints."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_read_root():
    """Test GET / endpoint returns online app status."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "app": "MediCare 2.0 API",
        "status": "online",
    }


def test_health_check():
    """Test GET /health endpoint returns healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
    }


@pytest.mark.parametrize(
    "endpoint_prefix,module_name",
    [
        ("/api/v1/auth/status", "auth"),
        ("/api/v1/patients/status", "patients"),
        ("/api/v1/doctors/status", "doctors"),
        ("/api/v1/appointments/status", "appointments"),
        ("/api/v1/medical-records/status", "medical_records"),
        ("/api/v1/prescriptions/status", "prescriptions"),
        ("/api/v1/lab-reports/status", "lab_reports"),
        ("/api/v1/invoices/status", "invoices"),
        ("/api/v1/notifications/status", "notifications"),
    ],
)
def test_v1_endpoints_status(endpoint_prefix, module_name):
    """Test all 9 v1 endpoint module status routes return HTTP 200 OK."""
    response = client.get(endpoint_prefix)
    assert response.status_code == 200
    assert response.json() == {"module": module_name, "status": "active"}
