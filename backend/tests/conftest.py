"""Pytest conftest configuration providing database session and FastAPI TestClient fixtures."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture(scope="function")
def client():
    """Create isolated in-memory SQLite database and TestClient for each test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def admin_headers(client):
    """Register and authenticate a test Admin user, returning Authorization Bearer headers."""
    from app.models.enums import UserRole

    admin_email = "test.admin.fixture@medicare.com"
    admin_password = "testpassword123"

    client.post(
        "/api/v1/auth/register",
        json={
            "email": admin_email,
            "password": admin_password,
            "full_name": "Test Admin Fixture User",
            "role": UserRole.ADMIN.value,
        },
    )

    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": admin_email, "password": admin_password},
    )
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

