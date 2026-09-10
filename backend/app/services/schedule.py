"""Doctor Schedule Business Service with Role Authorization & Server-Side Shift Validation."""

from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.enums import UserRole
from app.models.schedule import DoctorSchedule
from app.models.user import User
from app.repositories.doctor import DoctorRepository
from app.repositories.schedule import DoctorScheduleRepository
from app.schemas.schedule import DoctorScheduleCreate, DoctorScheduleUpdate

VALID_DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}


class DoctorScheduleService:
    """Business service governing Doctor OPD schedules, availability rules, and shift validation."""

    def __init__(self, db: Session):
        self.db = db
        self.schedule_repo = DoctorScheduleRepository(db)
        self.doctor_repo = DoctorRepository(db)

    def get_doctor_for_user(self, user_id: int):
        """Fetch doctor profile associated with a user ID."""
        return self.doctor_repo.get_by_user_id(user_id)

    def create_schedule_slot(
        self, schema: DoctorScheduleCreate, current_user: Optional[User] = None
    ) -> DoctorSchedule:
        """Create new availability schedule rule for a doctor after authorization and overlap validation."""
        if current_user:
            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to manage doctor schedules.")

            if current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor:
                    raise PermissionError("Access denied: Doctor profile not found.")
                if schema.doctor_id != doctor.id:
                    raise PermissionError("Access denied: Doctors can only create schedules for themselves.")

        doctor = self.doctor_repo.get_by_id(schema.doctor_id)
        if not doctor:
            raise ValueError(f"Doctor ID {schema.doctor_id} does not exist.")

        if schema.start_time >= schema.end_time:
            raise ValueError("Schedule start_time must be strictly before end_time.")

        day_title = schema.day_of_week.title()
        if day_title not in VALID_DAYS:
            raise ValueError(f"Invalid day of week '{schema.day_of_week}'. Must be one of {sorted(list(VALID_DAYS))}.")

        # Check for overlapping active schedule shift on the same day for this doctor
        if schema.is_active:
            overlap = self.schedule_repo.get_overlapping_schedule(
                doctor_id=schema.doctor_id,
                day_of_week=day_title,
                start_time=schema.start_time,
                end_time=schema.end_time,
            )
            if overlap:
                raise ValueError(f"Doctor already has an overlapping schedule on {day_title}.")

        new_schedule = DoctorSchedule(
            doctor_id=schema.doctor_id,
            day_of_week=day_title,
            start_time=schema.start_time,
            end_time=schema.end_time,
            slot_duration_minutes=schema.slot_duration_minutes,
            custom_slots=schema.custom_slots,
            is_active=schema.is_active,
        )
        return self.schedule_repo.create(new_schedule)

    def list_schedules(
        self,
        doctor_id: Optional[int] = None,
        day_of_week: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        current_user: Optional[User] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
    ) -> tuple[List[DoctorSchedule], int]:
        """Fetch doctor schedules with DB-level search, filtering, sorting, and pagination."""
        return self.schedule_repo.get_all_filtered(
            search=search,
            doctor_id=doctor_id,
            day_of_week=day_of_week,
            is_active=is_active,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    def get_by_id(self, schedule_id: int, current_user: Optional[User] = None) -> DoctorSchedule:
        """Fetch single schedule rule by ID."""
        schedule = self.schedule_repo.get_by_id(schedule_id)
        if not schedule:
            raise ValueError(f"Doctor schedule with ID {schedule_id} not found.")
        return schedule

    def update_schedule(
        self, schedule_id: int, schema: DoctorScheduleUpdate, current_user: Optional[User] = None
    ) -> DoctorSchedule:
        """Update doctor schedule rule after authorization and validation."""
        schedule = self.get_by_id(schedule_id, current_user=current_user)

        if current_user:
            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to manage doctor schedules.")

            if current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor or schedule.doctor_id != doctor.id:
                    raise PermissionError("Access denied: Doctors cannot modify another doctor's schedule.")

        update_data = schema.model_dump(exclude_unset=True)

        new_day = update_data.get("day_of_week", schedule.day_of_week).title()
        new_start = update_data.get("start_time", schedule.start_time)
        new_end = update_data.get("end_time", schedule.end_time)
        new_active = update_data.get("is_active", schedule.is_active)

        if new_start >= new_end:
            raise ValueError("Schedule start_time must be strictly before end_time.")

        if new_day not in VALID_DAYS:
            raise ValueError(f"Invalid day of week '{new_day}'.")

        if new_active:
            overlap = self.schedule_repo.get_overlapping_schedule(
                doctor_id=schedule.doctor_id,
                day_of_week=new_day,
                start_time=new_start,
                end_time=new_end,
                exclude_id=schedule.id,
            )
            if overlap:
                raise ValueError(f"Doctor already has an overlapping schedule on {new_day}.")

        update_data["day_of_week"] = new_day
        return self.schedule_repo.update(schedule, update_data)

    def delete_schedule(self, schedule_id: int, current_user: Optional[User] = None) -> bool:
        """Delete doctor schedule rule after authorization."""
        schedule = self.get_by_id(schedule_id, current_user=current_user)

        if current_user:
            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to manage doctor schedules.")

            if current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor or schedule.doctor_id != doctor.id:
                    raise PermissionError("Access denied: Doctors cannot delete another doctor's schedule.")

        return self.schedule_repo.delete(schedule.id)
