import pytest
from datetime import date
from app.models.enums import UserRole
from app.models.user import User
from app.models.doctor import Doctor
from app.models.schedule import DoctorSchedule
from app.schemas.schedule import DoctorScheduleCreate, DoctorScheduleUpdate
from app.services.schedule import DoctorScheduleService
from app.services.doctor import DoctorService


def test_custom_slots_validation():
    # Test valid custom slots
    s_create = DoctorScheduleCreate(
        doctor_id=1,
        day_of_week="Tuesday",
        start_time="09:00:00",
        end_time="17:00:00",
        custom_slots="09:00,10:00,11:00,12:00",
    )
    assert s_create.custom_slots == "09:00,10:00,11:00,12:00"

    # Test > 10 slots validation error
    with pytest.raises(ValueError, match="maximum of 10 appointment slots"):
        DoctorScheduleCreate(
            doctor_id=1,
            day_of_week="Tuesday",
            start_time="09:00:00",
            end_time="17:00:00",
            custom_slots="09:00,09:30,10:00,10:30,11:00,11:30,12:00,12:30,13:00,13:30,14:00",
        )

    # Test duplicate slots error
    with pytest.raises(ValueError, match="Duplicate time slots"):
        DoctorScheduleCreate(
            doctor_id=1,
            day_of_week="Tuesday",
            start_time="09:00:00",
            end_time="17:00:00",
            custom_slots="09:00,10:00,09:00",
        )
