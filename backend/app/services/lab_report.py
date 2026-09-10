"""Lab Report Business Service with Domain-Level Ownership & Relationship Authorization."""

from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.enums import UserRole
from app.models.lab_report import LabReport
from app.models.user import User
from app.repositories.appointment import AppointmentRepository
from app.repositories.doctor import DoctorRepository
from app.repositories.lab_report import LabReportRepository
from app.repositories.patient import PatientRepository
from app.schemas.lab_report import LabReportCreate, LabReportUpdate


class LabReportService:
    """Business service governing Pathology Lab Reports and domain authorization."""

    def __init__(self, db: Session):
        self.db = db
        self.lab_repo = LabReportRepository(db)
        self.patient_repo = PatientRepository(db)
        self.doctor_repo = DoctorRepository(db)
        self.appointment_repo = AppointmentRepository(db)

    def get_patient_for_user(self, user_id: int):
        """Fetch patient profile associated with a user ID."""
        return self.patient_repo.get_by_user_id(user_id)

    def get_doctor_for_user(self, user_id: int):
        """Fetch doctor profile associated with a user ID."""
        return self.doctor_repo.get_by_user_id(user_id)

    def doctor_has_patient_relationship(self, doctor_id: int, patient_id: int) -> bool:
        """Check if doctor has an appointment relationship with patient."""
        return self.appointment_repo.has_appointment(doctor_id, patient_id)

    def request_lab_report(self, schema: LabReportCreate, current_user: Optional[User] = None) -> LabReport:
        """Create new diagnostic lab test request after role and relationship authorization."""
        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical lab reports.")

            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to create lab reports.")

            if current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor:
                    raise PermissionError("Access denied: Doctor profile not found.")

                if not self.doctor_has_patient_relationship(doctor.id, schema.patient_id):
                    raise PermissionError("Access denied: No active appointment relationship with this patient.")

        patient = self.patient_repo.get_by_id(schema.patient_id)
        if not patient:
            raise ValueError(f"Patient ID {schema.patient_id} not found.")

        new_report = LabReport(
            patient_id=schema.patient_id,
            test_name=schema.test_name,
            prescribed_by=schema.prescribed_by,
            lab_technician=schema.lab_technician,
            request_date=schema.request_date,
            completion_date=schema.completion_date,
            status=schema.status,
            results_summary=schema.results_summary,
            document_url=schema.document_url,
        )
        return self.lab_repo.create(new_report)

    def list_reports(
        self,
        current_user: Optional[User] = None,
        patient_id: Optional[int] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[LabReport], int]:
        """Fetch list of lab reports filtered by role domain ownership, DB-level search, filters, sorting, and pagination."""
        allowed_patient_ids: Optional[List[int]] = None

        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical lab reports.")

            if current_user.role == UserRole.PATIENT:
                patient = self.get_patient_for_user(current_user.id)
                if not patient:
                    return [], 0
                allowed_patient_ids = [patient.id]

            elif current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor:
                    return [], 0
                allowed_patient_ids = self.appointment_repo.get_patient_ids_for_doctor(doctor.id)
                if not allowed_patient_ids:
                    return [], 0

            # ADMIN role retains full access

        return self.lab_repo.get_all_filtered(
            allowed_patient_ids=allowed_patient_ids,
            patient_id=patient_id,
            status=status,
            search=search,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    def get_by_id(self, report_id: int, current_user: Optional[User] = None) -> LabReport:
        """Fetch lab report by ID with role domain ownership verification."""
        report = self.lab_repo.get_by_id(report_id)
        if not report:
            raise ValueError(f"Lab report with ID {report_id} not found.")

        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical lab reports.")

            if current_user.role == UserRole.PATIENT:
                patient = self.get_patient_for_user(current_user.id)
                if not patient or report.patient_id != patient.id:
                    raise PermissionError("Access denied: You are not authorized to view another patient's lab report.")

            elif current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor or not self.doctor_has_patient_relationship(doctor.id, report.patient_id):
                    raise PermissionError("Access denied: No active appointment relationship with this patient.")

            # ADMIN role is allowed to view any report

        return report

    def update_report(
        self, report_id: int, schema: LabReportUpdate, current_user: Optional[User] = None
    ) -> LabReport:
        """Update lab report status or results after domain ownership validation and preventing field escalation."""
        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical lab reports.")

            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to modify lab reports.")

        report = self.get_by_id(report_id, current_user=current_user)

        update_data = schema.model_dump(exclude_unset=True)
        # Prevent field escalation: strip patient_id if present
        update_data.pop("patient_id", None)

        return self.lab_repo.update(report, update_data)

    def delete_report(self, report_id: int, current_user: Optional[User] = None) -> bool:
        """Delete lab report by ID after role permission and domain ownership validation."""
        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical lab reports.")

            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to delete lab reports.")

            if current_user.role == UserRole.DOCTOR:
                raise PermissionError("Access denied: Doctors are not permitted to delete lab reports.")

        report = self.get_by_id(report_id, current_user=current_user)

        return self.lab_repo.delete(report.id)
