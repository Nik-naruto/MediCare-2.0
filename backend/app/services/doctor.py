"""Doctor Management Business Service."""

from datetime import date, datetime, time, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.doctor import Doctor
from app.repositories.appointment import AppointmentRepository
from app.repositories.doctor import DoctorRepository
from app.repositories.schedule import DoctorScheduleRepository
from app.repositories.user import UserRepository
from app.schemas.doctor import (
    DayAvailability,
    DoctorAvailabilityResponse,
    DoctorCreate,
    DoctorUpdate,
    TimeSlotAvailability,
)


class DoctorService:
    """Business service governing Doctor onboarding and availability checks."""

    def __init__(self, db: Session):
        self.db = db
        self.doctor_repo = DoctorRepository(db)
        self.user_repo = UserRepository(db)

    def onboard_doctor(self, schema: DoctorCreate) -> Doctor:
        """Doctor onboarding workflow: validate user account exists and create/update doctor profile."""
        user = self.user_repo.get_by_id(schema.user_id)
        if not user:
            raise ValueError(f"User ID {schema.user_id} does not exist.")

        if schema.medical_registration_number and schema.medical_registration_number.strip():
            num = schema.medical_registration_number.strip()
            existing_reg = self.db.query(Doctor).filter(
                Doctor.medical_registration_number == num,
                Doctor.user_id != schema.user_id
            ).first()
            if existing_reg:
                raise ValueError(f"Doctor with Medical Registration Number '{num}' already exists.")

        existing = self.doctor_repo.get_by_user_id(schema.user_id)
        if existing:
            update_data = schema.model_dump(exclude={"user_id"}, exclude_unset=True)
            return self.doctor_repo.update(existing, update_data)

        new_doctor = Doctor(
            user_id=schema.user_id,
            department_id=schema.department_id,
            medical_registration_number=schema.medical_registration_number.strip() if schema.medical_registration_number else None,
            qualification=schema.qualification,
            specialty=schema.specialty,
            experience_years=schema.experience_years,
            consultation_fee=schema.consultation_fee,
            room_no=schema.room_no,
            bio=schema.bio,
            is_available=schema.is_available,
        )
        return self.doctor_repo.create(new_doctor)

    def list_doctors(
        self,
        search: Optional[str] = None,
        department_id: Optional[int] = None,
        specialty: Optional[str] = None,
        is_available: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[Doctor], int]:
        """Fetch list of doctors with DB-level search, filtering, sorting, and pagination."""
        return self.doctor_repo.get_all_filtered(
            search=search,
            department_id=department_id,
            specialty=specialty,
            is_available=is_available,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    def get_by_id(self, doctor_id: int) -> Optional[Doctor]:
        """Fetch doctor by ID."""
        return self.doctor_repo.get_by_id(doctor_id)

    def get_by_user_id(self, user_id: int) -> Optional[Doctor]:
        """Fetch doctor profile by associated user account ID."""
        return self.doctor_repo.get_by_user_id(user_id)

    def update_doctor(self, doctor_id: int, schema: DoctorUpdate) -> Doctor:
        """Update doctor profile details."""
        doctor = self.doctor_repo.get_by_id(doctor_id)
        if not doctor:
            raise ValueError(f"Doctor with ID {doctor_id} not found.")

        update_data = schema.model_dump(exclude_unset=True)
        if "medical_registration_number" in update_data and update_data["medical_registration_number"]:
            num = update_data["medical_registration_number"].strip()
            update_data["medical_registration_number"] = num if num else None
            if num:
                existing_reg = self.db.query(Doctor).filter(
                    Doctor.medical_registration_number == num,
                    Doctor.id != doctor_id
                ).first()
                if existing_reg:
                    raise ValueError(f"Doctor with Medical Registration Number '{num}' already exists.")

        return self.doctor_repo.update(doctor, update_data)

    def delete_doctor(self, doctor_id: int) -> bool:
        """Delete doctor profile by ID."""
        doctor = self.doctor_repo.get_by_id(doctor_id)
        if not doctor:
            raise ValueError(f"Doctor with ID {doctor_id} not found.")
        return self.doctor_repo.delete(doctor_id)

    def update_doctor_photo(self, doctor_id: int, file_content: bytes, file_extension: str) -> Doctor:
        """Save new profile photo to storage and update Doctor.profile_photo_url atomically."""
        import os
        import uuid
        from pathlib import Path
        from app.core.config import settings

        doctor = self.doctor_repo.get_by_id(doctor_id)
        if not doctor:
            raise ValueError(f"Doctor with ID {doctor_id} not found.")

        upload_dir = Path(settings.UPLOAD_DIR) / "doctors"
        upload_dir.mkdir(parents=True, exist_ok=True)

        safe_filename = f"{uuid.uuid4().hex}{file_extension}"
        file_path = upload_dir / safe_filename
        relative_url = f"/uploads/doctors/{safe_filename}"

        old_photo_url = doctor.profile_photo_url

        try:
            with open(file_path, "wb") as f:
                f.write(file_content)

            doctor.profile_photo_url = relative_url
            self.db.add(doctor)
            self.db.commit()
            self.db.refresh(doctor)

            # Cleanup old file after successful database commit
            if old_photo_url and old_photo_url.startswith("/uploads/doctors/"):
                old_filename = os.path.basename(old_photo_url)
                old_file_path = upload_dir / old_filename
                if old_file_path.exists() and old_file_path != file_path:
                    try:
                        old_file_path.unlink()
                    except OSError:
                        pass

            return doctor
        except Exception as e:
            # Atomic rollback: delete new file if DB update fails
            if file_path.exists():
                try:
                    file_path.unlink()
                except OSError:
                    pass
            self.db.rollback()
            raise ValueError(f"Failed to update doctor profile photo: {str(e)}")

    def delete_doctor_photo(self, doctor_id: int) -> Doctor:
        """Remove profile photo and restore initials fallback."""
        import os
        from pathlib import Path
        from app.core.config import settings

        doctor = self.doctor_repo.get_by_id(doctor_id)
        if not doctor:
            raise ValueError(f"Doctor with ID {doctor_id} not found.")

        old_photo_url = doctor.profile_photo_url
        if old_photo_url:
            doctor.profile_photo_url = None
            self.db.add(doctor)
            self.db.commit()
            self.db.refresh(doctor)

            if old_photo_url.startswith("/uploads/doctors/"):
                upload_dir = Path(settings.UPLOAD_DIR) / "doctors"
                old_filename = os.path.basename(old_photo_url)
                old_file_path = upload_dir / old_filename
                if old_file_path.exists():
                    try:
                        old_file_path.unlink()
                    except OSError:
                        pass

        return doctor

    def get_doctor_availability(
        self, doctor_id: int, date_from: date, date_to: date
    ) -> DoctorAvailabilityResponse:
        """Calculate and return doctor's appointment availability across a date range."""
        doctor = self.doctor_repo.get_by_id(doctor_id)
        if not doctor:
            raise ValueError(f"Doctor with ID {doctor_id} not found.")

        if date_from > date_to:
            raise ValueError("date_from cannot be after date_to.")

        if (date_to - date_from).days > 30:
            raise ValueError("Date range cannot exceed 30 days.")

        schedule_repo = DoctorScheduleRepository(self.db)
        appointment_repo = AppointmentRepository(self.db)

        # Fetch active schedules for doctor
        active_schedules, _ = schedule_repo.get_all_filtered(doctor_id=doctor_id, is_active=True, limit=100)

        # Fetch existing active (non-cancelled) appointments for doctor in range
        existing_appointments = appointment_repo.get_doctor_appointments_in_range(doctor_id, date_from, date_to)

        appts_by_date = {}
        for appt in existing_appointments:
            appts_by_date.setdefault(appt.appointment_date, []).append(appt)

        schedules_by_day = {}
        for sched in active_schedules:
            schedules_by_day.setdefault(sched.day_of_week.title(), []).append(sched)

        from datetime import timezone
        ist_tz = timezone(timedelta(hours=5, minutes=30))
        now = datetime.now(ist_tz)
        today = now.date()
        current_time = now.time()

        days_availability = []
        curr_date = date_from
        while curr_date <= date_to:
            day_name = curr_date.strftime("%A")
            day_schedules = schedules_by_day.get(day_name, [])

            if not day_schedules:
                days_availability.append(
                    DayAvailability(
                        date=curr_date,
                        day_of_week=day_name,
                        is_working_day=False,
                        slots=[],
                    )
                )
            else:
                day_appts = appts_by_date.get(curr_date, [])
                slots = []

                for sched in day_schedules:
                    duration_minutes = sched.slot_duration_minutes or 15
                    step = timedelta(minutes=duration_minutes)

                    if sched.custom_slots and sched.custom_slots.strip():
                        raw_time_strs = [t.strip() for t in sched.custom_slots.split(",") if t.strip()]
                        for time_str in raw_time_strs:
                            try:
                                parts = time_str.split(":")
                                h, m = int(parts[0]), int(parts[1])
                                slot_start_time = time(h, m)
                                slot_start_dt = datetime.combine(curr_date, slot_start_time)
                                slot_end_dt = slot_start_dt + step
                                slot_end_time = slot_end_dt.time()

                                is_available = True
                                if not doctor.is_available:
                                    is_available = False

                                if curr_date < today:
                                    is_available = False
                                elif curr_date == today and slot_start_time < current_time:
                                    is_available = False

                                if is_available and day_appts:
                                    for appt in day_appts:
                                        appt_end = appt.end_time or (datetime.combine(curr_date, appt.start_time) + timedelta(minutes=duration_minutes)).time()
                                        if appt.start_time < slot_end_time and appt_end > slot_start_time:
                                            is_available = False
                                            break

                                slots.append(
                                    TimeSlotAvailability(
                                        start_time=slot_start_time.strftime("%H:%M"),
                                        end_time=slot_end_time.strftime("%H:%M"),
                                        is_available=is_available,
                                    )
                                )
                            except (ValueError, IndexError):
                                continue
                    else:
                        start_dt = datetime.combine(curr_date, sched.start_time)
                        end_dt = datetime.combine(curr_date, sched.end_time)

                        slot_start_dt = start_dt
                        while slot_start_dt + step <= end_dt:
                            slot_end_dt = slot_start_dt + step
                            slot_start_time = slot_start_dt.time()
                            slot_end_time = slot_end_dt.time()

                            is_available = True

                            # 1. Doctor overall availability check
                            if not doctor.is_available:
                                is_available = False

                            # 2. Past date/time check
                            if curr_date < today:
                                is_available = False
                            elif curr_date == today and slot_start_time < current_time:
                                is_available = False

                            # 3. Appointment overlap check
                            if is_available and day_appts:
                                for appt in day_appts:
                                    appt_end = appt.end_time or (datetime.combine(curr_date, appt.start_time) + timedelta(minutes=duration_minutes)).time()
                                    if appt.start_time < slot_end_time and appt_end > slot_start_time:
                                        is_available = False
                                        break

                            slots.append(
                                TimeSlotAvailability(
                                    start_time=slot_start_time.strftime("%H:%M"),
                                    end_time=slot_end_time.strftime("%H:%M"),
                                    is_available=is_available,
                                )
                            )
                            slot_start_dt += step

                days_availability.append(
                    DayAvailability(
                        date=curr_date,
                        day_of_week=day_name,
                        is_working_day=True,
                        slots=slots,
                    )
                )

            curr_date += timedelta(days=1)

        return DoctorAvailabilityResponse(
            doctor_id=doctor_id,
            date_from=date_from,
            date_to=date_to,
            schedule=days_availability,
        )

