"""Pytest suite for verifying Department CRUD API endpoints."""

from app.models.enums import UserRole


def test_department_status_endpoint(client):
    """Test GET /api/v1/departments/status health endpoint."""
    response = client.get("/api/v1/departments/status")
    assert response.status_code == 200
    assert response.json() == {"module": "departments", "status": "active"}


def test_department_crud_full_lifecycle(client, admin_headers):
    """Test full Department CRUD lifecycle: POST -> GET list -> GET id -> PUT -> DELETE -> GET 404."""
    # 1. POST /api/v1/departments/ (Create)
    create_payload = {
        "name": "Cardiology",
        "description": "Comprehensive cardiac care & surgeries",
        "location": "Building A, 3rd Floor",
    }
    create_res = client.post("/api/v1/departments/", json=create_payload, headers=admin_headers)
    assert create_res.status_code == 201
    dept_id = create_res.json()["id"]
    assert create_res.json()["name"] == "Cardiology"

    # 2. GET /api/v1/departments/ (List)
    list_res = client.get("/api/v1/departments/")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 3. GET /api/v1/departments/{dept_id} (Read single)
    read_res = client.get(f"/api/v1/departments/{dept_id}")
    assert read_res.status_code == 200
    assert read_res.json()["location"] == "Building A, 3rd Floor"

    # 4. PUT /api/v1/departments/{dept_id} (Update)
    update_res = client.put(
        f"/api/v1/departments/{dept_id}",
        json={"location": "Building B, 4th Floor", "description": "Advanced Cardiac Surgery Center"},
        headers=admin_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["location"] == "Building B, 4th Floor"

    # 5. DELETE /api/v1/departments/{dept_id} (Delete)
    delete_res = client.delete(f"/api/v1/departments/{dept_id}", headers=admin_headers)
    assert delete_res.status_code == 204

    # 6. Verify 404
    read_deleted = client.get(f"/api/v1/departments/{dept_id}")
    assert read_deleted.status_code == 404


def test_department_duplicate_name_conflict(client, admin_headers):
    """Test creating duplicate department name returns 409 Conflict."""
    payload = {"name": "Neurology", "location": "Building C"}
    res1 = client.post("/api/v1/departments/", json=payload, headers=admin_headers)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/departments/", json=payload, headers=admin_headers)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_department_invalid_head_doctor_404(client, admin_headers):
    """Test assigning non-existent head_doctor_id returns 404 Not Found."""
    payload = {"name": "Orthopedics", "head_doctor_id": 99999}
    res = client.post("/api/v1/departments/", json=payload, headers=admin_headers)
    assert res.status_code == 404
    assert "does not exist" in res.json()["detail"]

