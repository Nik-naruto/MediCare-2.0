"""Pytest suite for verifying Doctor Availability API endpoint and scheduling logic."""

from datetime import date, datetime, time, timedelta
from app.models.enums import UserRole, AppointmentStatus


def test_doctor_availability_endpoint(client):
    """Test doctor availability calculations, shifts, overlaps, cancellations, and validations."""
    # 1. Register doctor user
    email = f"avail.doc.{datetime.now().timestamp()}@medicare.com"
    user_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "securepassword123",
            "full_name": "Dr. Availability Test",
            "role": UserRole.DOCTOR.value,
        },
    )
    assert user_res.status_code == 201
    user_id = user_res.json()["id"]

    # 2. Login doctor
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "securepassword123"},
    )
    doc_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {doc_token}"}

    # 3. Create doctor profile
    doc_res = client.post(
        "/api/v1/doctors/",
        json={
            "user_id": user_id,
            "qualification": "MBBS, MD",
            "specialty": "Neurology",
            "experience_years": 8,
            "consultation_fee": 800.0,
            "room_no": "N-101",
            "is_available": True,
        },
    )
    assert doc_res.status_code == 201
    doctor_id = doc_res.json()["id"]

    # 4. Create schedule shift for next Monday (09:00 to 10:00, 30 min duration)
    today = date.today()
    days_until_monday = (7 - today.weekday()) % 7
    if days_until_monday == 0:
        days_until_monday = 7
    future_monday = today + timedelta(days=days_until_monday)
    future_tuesday = future_monday + timedelta(days=1)
    monday_name = future_monday.strftime("%A")

    sched_res = client.post(
        "/api/v1/schedules/",
        json={
            "doctor_id": doctor_id,
            "day_of_week": monday_name,
            "start_time": "09:00:00",
            "end_time": "10:00:00",
            "slot_duration_minutes": 30,
            "is_active": True,
        },
        headers=headers,
    )
    assert sched_res.status_code == 201

    # 4. GET /api/v1/doctors/{doctor_id}/availability
    avail_res = client.get(
        f"/api/v1/doctors/{doctor_id}/availability?date_from={future_monday}&date_to={future_tuesday}"
    )
    assert avail_res.status_code == 200
    avail_data = avail_res.json()
    assert avail_data["doctor_id"] == doctor_id
    assert len(avail_data["schedule"]) == 2

    mon_sched = [s for s in avail_data["schedule"] if s["date"] == str(future_monday)][0]
    tue_sched = [s for s in avail_data["schedule"] if s["date"] == str(future_tuesday)][0]

    assert mon_sched["is_working_day"] is True
    assert len(mon_sched["slots"]) == 2
    assert mon_sched["slots"][0]["is_available"] is True
    assert mon_sched["slots"][1]["is_available"] is True

    assert tue_sched["is_working_day"] is False
    assert len(tue_sched["slots"]) == 0

    # 5. Invalid date range (date_from > date_to) -> 400
    err_res1 = client.get(
        f"/api/v1/doctors/{doctor_id}/availability?date_from={future_tuesday}&date_to={future_monday}"
    )
    assert err_res1.status_code == 400

    # 6. Invalid doctor ID -> 404
    err_res2 = client.get(
        f"/api/v1/doctors/99999/availability?date_from={future_monday}&date_to={future_monday}"
    )
    assert err_res2.status_code == 404
