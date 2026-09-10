"""Appointment Business Service with Domain-Level Data Ownership, Schedule Validation & Overlap Prevention Engine."""

import random
from datetime import date, datetime, time, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus, PaymentStatus, UserRole
from app.models.user import User
from app.repositories.appointment import AppointmentRepository
from app.repositories.doctor import DoctorRepository
from app.repositories.patient import PatientRepository
from app.repositories.schedule import DoctorScheduleRepository
from app.schemas.appointment import AppointmentCreate, AppointmentStatusUpdate, AppointmentUpdate


class AppointmentService:
    """Business service governing Appointment booking, cancellation, scheduling rules, and role authorization."""

    def __init__(self, db: Session):
        self.db = db
        self.appointment_repo = AppointmentRepository(db)
        self.doctor_repo = DoctorRepository(db)
        self.patient_repo = PatientRepository(db)
        self.schedule_repo = DoctorScheduleRepository(db)

    def get_patient_for_user(self, user_id: int):
        """Fetch patient profile associated with a user ID."""
        return self.patient_repo.get_by_user_id(user_id)

    def get_doctor_for_user(self, user_id: int):
        """Fetch doctor profile associated with a user ID."""
        return self.doctor_repo.get_by_user_id(user_id)

    def get_receptionist_dashboard(
        self, target_date: Optional[date] = None, current_user: Optional[User] = None
    ):
        """Generate DB-accurate front-desk operational metrics and queue summary for target date."""
        from app.repositories.invoice import InvoiceRepository
        from app.schemas.appointment import ReceptionistDashboardResponse

        if current_user:
            if current_user.role not in (UserRole.RECEPTIONIST, UserRole.ADMIN):
                raise PermissionError("Access denied: Only Receptionist and Admin roles can access front-desk dashboard.")

        if target_date is None:
            # Default to current IST date (+05:30)
            from datetime import timezone
            target_date = datetime.now(timezone(timedelta(hours=5, minutes=30))).date()

        invoice_repo = InvoiceRepository(self.db)

        total_cnt, checked_in_cnt, upcoming_cnt = self.appointment_repo.get_receptionist_dashboard_metrics(target_date)
        collected_rev = invoice_repo.get_today_collected_revenue(target_date)
        queue_apts = self.appointment_repo.get_today_queue(target_date, limit=20)

        formatted_rev = f"₹{collected_rev:,.0f}" if collected_rev == int(collected_rev) else f"₹{collected_rev:,.2f}"

        return ReceptionistDashboardResponse(
            today_total_patients=total_cnt,
            checked_in_waiting_count=checked_in_cnt,
            upcoming_arrivals_count=upcoming_cnt,
            today_collected_revenue=collected_rev,
            formatted_collected_revenue=formatted_rev,
            target_date=target_date,
            queue=queue_apts,
        )

    def _validate_appointment_time(self, appointment_date: date, start_time: time, end_time: time):
        """Validate appointment date/time syntax and prevent booking in the past."""
        if start_time >= end_time:
            raise ValueError("Appointment start time must be before end time.")

        now = datetime.now()
        current_date = now.date()
        current_time = now.time()

        if appointment_date < current_date:
            raise ValueError("Appointment cannot be scheduled in the past.")

        if appointment_date == current_date and start_time < current_time:
            raise ValueError("Appointment start time cannot be in the past.")

    def _validate_doctor_schedule(self, doctor_id: int, appointment_date: date, start_time: time, end_time: time):
        """Validate requested time falls within Doctor's active shift schedule for that day."""
        day_name = appointment_date.strftime("%A")
        schedules = self.schedule_repo.get_by_doctor_and_day(doctor_id, day_name)

        if not schedules:
            raise ValueError(f"Doctor is not available on {day_name}s.")

        # Check if appointment [start_time, end_time] falls completely inside at least one active shift
        is_within_schedule = any(
            shift.start_time <= start_time and end_time <= shift.end_time
            for shift in schedules
        )

        if not is_within_schedule:
            raise ValueError("Requested appointment time falls outside doctor's scheduled working hours.")

    def _check_doctor_conflict(
        self, doctor_id: int, appointment_date: date, start_time: time, end_time: time, exclude_id: Optional[int] = None
    ):
        """Check for active overlapping appointments for the doctor."""
        overlap = self.appointment_repo.get_overlapping_doctor_appointment(
            doctor_id=doctor_id,
            appointment_date=appointment_date,
            start_time=start_time,
            end_time=end_time,
            exclude_id=exclude_id,
        )
        if overlap:
            raise ValueError("Doctor already has an appointment during this time slot.")

    def _check_patient_conflict(
        self, patient_id: int, appointment_date: date, start_time: time, end_time: time, exclude_id: Optional[int] = None
    ):
        """Check for active overlapping appointments for the patient."""
        overlap = self.appointment_repo.get_overlapping_patient_appointment(
            patient_id=patient_id,
            appointment_date=appointment_date,
            start_time=start_time,
            end_time=end_time,
            exclude_id=exclude_id,
        )
        if overlap:
            raise ValueError("Patient already has an appointment during this time slot.")

    def _calculate_end_time(self, appointment_date: date, start_time: time, end_time: Optional[time]) -> time:
        """Calculate end_time if omitted, defaulting to 15-minute slot."""
        if end_time:
            return end_time
        dt = datetime.combine(appointment_date, start_time) + timedelta(minutes=15)
        return dt.time()

    def book_appointment(self, schema: AppointmentCreate, current_user: Optional[User] = None) -> Appointment:
        """Appointment booking workflow with role, schedule availability, and overlap validation."""
        if current_user:
            if current_user.role == UserRole.DOCTOR:
                raise PermissionError("Access denied: Doctors are not permitted to create appointments.")

            if current_user.role == UserRole.PATIENT:
                patient = self.get_patient_for_user(current_user.id)
                if not patient:
                    raise PermissionError("Access denied: Patient profile not found for user.")
                if schema.patient_id != patient.id:
                    raise PermissionError("Access denied: Patients can only create appointments for themselves.")

        doctor = self.doctor_repo.get_by_id(schema.doctor_id)
        if not doctor:
            raise ValueError(f"Doctor ID {schema.doctor_id} not found.")

        if not doctor.is_available:
            raise ValueError(f"Doctor is currently unavailable.")

        patient = self.patient_repo.get_by_id(schema.patient_id)
        if not patient:
            raise ValueError(f"Patient ID {schema.patient_id} not found.")

        end_time = self._calculate_end_time(schema.appointment_date, schema.start_time, schema.end_time)

        # 1. Past date/time validation
        self._validate_appointment_time(schema.appointment_date, schema.start_time, end_time)

        # 2. Doctor shift schedule validation
        self._validate_doctor_schedule(schema.doctor_id, schema.appointment_date, schema.start_time, end_time)

        # 3. Doctor overlap conflict check
        self._check_doctor_conflict(schema.doctor_id, schema.appointment_date, schema.start_time, end_time)

        # 4. Patient overlap conflict check
        self._check_patient_conflict(schema.patient_id, schema.appointment_date, schema.start_time, end_time)

        token = f"TOKEN-{random.randint(10, 99)}"
        new_appointment = Appointment(
            patient_id=schema.patient_id,
            doctor_id=schema.doctor_id,
            appointment_date=schema.appointment_date,
            start_time=schema.start_time,
            end_time=end_time,
            reason=schema.reason,
            fee=schema.fee or doctor.consultation_fee,
            status=AppointmentStatus.SCHEDULED,
            payment_status=PaymentStatus.UNPAID,
            token_no=token,
        )
        return self.appointment_repo.create(new_appointment)

    def list_appointments(
        self,
        current_user: Optional[User] = None,
        patient_id: Optional[int] = None,
        doctor_id: Optional[int] = None,
        status: Optional[AppointmentStatus] = None,
        search: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[Appointment], int]:
        """Fetch list of appointments filtered by role domain ownership, DB-level search, filters, sorting, and pagination."""
        allowed_patient_id: Optional[int] = None
        allowed_doctor_id: Optional[int] = None

        if date_from and date_to and date_from > date_to:
            raise ValueError("date_from cannot be after date_to.")

        if current_user:
            if current_user.role == UserRole.PATIENT:
                patient = self.get_patient_for_user(current_user.id)
                if not patient:
                    return [], 0
                allowed_patient_id = patient.id

            elif current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor:
                    return [], 0
                allowed_doctor_id = doctor.id

            # RECEPTIONIST and ADMIN roles retain full access

        return self.appointment_repo.get_all_filtered(
            allowed_patient_id=allowed_patient_id,
            allowed_doctor_id=allowed_doctor_id,
            patient_id=patient_id,
            doctor_id=doctor_id,
            status=status,
            search=search,
            date_from=date_from,
            date_to=date_to,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    def get_by_id(self, appointment_id: int, current_user: Optional[User] = None) -> Appointment:
        """Fetch appointment by ID with role domain ownership verification."""
        appointment = self.appointment_repo.get_by_id(appointment_id)
        if not appointment:
            raise ValueError(f"Appointment with ID {appointment_id} not found.")

        if current_user:
            if current_user.role == UserRole.PATIENT:
                patient = self.get_patient_for_user(current_user.id)
                if not patient or appointment.patient_id != patient.id:
                    raise PermissionError("Access denied: You are not authorized to view another patient's appointment.")

            elif current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor or appointment.doctor_id != doctor.id:
                    raise PermissionError("Access denied: You are not authorized to view another doctor's appointment.")

            # RECEPTIONIST and ADMIN roles are allowed to view any appointment

        return appointment

    def update_appointment(
        self, appointment_id: int, schema: AppointmentUpdate, current_user: Optional[User] = None
    ) -> Appointment:
        """Update appointment after domain ownership, schedule, and overlap validation."""
        appointment = self.get_by_id(appointment_id, current_user=current_user)

        if current_user:
            if current_user.role == UserRole.PATIENT:
                patient = self.get_patient_for_user(current_user.id)
                if not patient or appointment.patient_id != patient.id:
                    raise PermissionError("Access denied: Patients can only update their own appointments.")

            if current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor or appointment.doctor_id != doctor.id:
                    raise PermissionError("Access denied: Doctors can only update their own appointments.")

        update_data = schema.model_dump(exclude_unset=True)

        # Prevent field escalation for non-Admin/Receptionist
        if current_user and current_user.role in (UserRole.PATIENT, UserRole.DOCTOR):
            update_data.pop("patient_id", None)
            update_data.pop("doctor_id", None)

        target_doctor_id = update_data.get("doctor_id", appointment.doctor_id)
        target_patient_id = update_data.get("patient_id", appointment.patient_id)
        target_date = update_data.get("appointment_date", appointment.appointment_date)
        target_start = update_data.get("start_time", appointment.start_time)
        target_end_raw = update_data.get("end_time", appointment.end_time)
        target_status = update_data.get("status", appointment.status)

        target_end = self._calculate_end_time(target_date, target_start, target_end_raw)
        update_data["end_time"] = target_end

        # Re-validate scheduling rules if active appointment and date/time/doctor changed
        is_datetime_changed = (
            target_date != appointment.appointment_date or
            target_start != appointment.start_time or
            target_doctor_id != appointment.doctor_id
        )
        if target_status != AppointmentStatus.CANCELLED and is_datetime_changed:
            self._validate_appointment_time(target_date, target_start, target_end)
            self._validate_doctor_schedule(target_doctor_id, target_date, target_start, target_end)
            self._check_doctor_conflict(target_doctor_id, target_date, target_start, target_end, exclude_id=appointment.id)
            self._check_patient_conflict(target_patient_id, target_date, target_start, target_end, exclude_id=appointment.id)

        return self.appointment_repo.update(appointment, update_data)

    def cancel_appointment(self, appointment_id: int, current_user: Optional[User] = None) -> Appointment:
        """Appointment cancellation workflow after domain ownership validation."""
        if current_user and current_user.role == UserRole.DOCTOR:
            raise PermissionError("Access denied: Doctors are not permitted to delete or cancel appointments in Phase 1.")

        appointment = self.get_by_id(appointment_id, current_user=current_user)

        if appointment.status == AppointmentStatus.COMPLETED:
            raise ValueError("Completed appointments cannot be cancelled.")

        return self.appointment_repo.update(appointment, {"status": AppointmentStatus.CANCELLED})

    def delete_appointment(self, appointment_id: int, current_user: Optional[User] = None) -> bool:
        """Delete appointment by ID after role permission and domain ownership validation."""
        if current_user and current_user.role == UserRole.DOCTOR:
            raise PermissionError("Access denied: Doctors are not permitted to delete appointments.")

        appointment = self.get_by_id(appointment_id, current_user=current_user)

        return self.appointment_repo.delete(appointment.id)
