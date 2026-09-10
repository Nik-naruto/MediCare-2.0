"""Medical Record Business Service with Domain-Level Ownership & Relationship Authorization."""

from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.enums import UserRole
from app.models.medical_record import MedicalRecord
from app.models.user import User
from app.repositories.appointment import AppointmentRepository
from app.repositories.doctor import DoctorRepository
from app.repositories.medical_record import MedicalRecordRepository
from app.repositories.patient import PatientRepository
from app.schemas.medical_record import MedicalRecordCreate, MedicalRecordUpdate


class MedicalRecordService:
    """Business service governing Electronic Health Record (EHR) entries and domain authorization."""

    def __init__(self, db: Session):
        self.db = db
        self.record_repo = MedicalRecordRepository(db)
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

    def create_medical_record(self, schema: MedicalRecordCreate, current_user: Optional[User] = None) -> MedicalRecord:
        """Create medical record entry for a patient after role and relationship authorization."""
        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical medical records.")

            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to create medical records.")

            if current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor:
                    raise PermissionError("Access denied: Doctor profile not found.")
                if not self.doctor_has_patient_relationship(doctor.id, schema.patient_id):
                    raise PermissionError("Access denied: No active appointment relationship with this patient.")

        patient = self.patient_repo.get_by_id(schema.patient_id)
        if not patient:
            raise ValueError(f"Patient ID {schema.patient_id} not found.")

        new_record = MedicalRecord(
            patient_id=schema.patient_id,
            doctor_name=schema.doctor_name,
            title=schema.title,
            category=schema.category,
            summary=schema.summary,
            document_url=schema.document_url,
            record_date=schema.record_date,
        )
        return self.record_repo.create(new_record)

    def list_records(
        self,
        current_user: Optional[User] = None,
        patient_id: Optional[int] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[MedicalRecord], int]:
        """Fetch list of medical records filtered by role domain ownership, DB-level search, filters, sorting, and pagination."""
        allowed_patient_ids: Optional[List[int]] = None

        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical medical records.")

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

        return self.record_repo.get_all_filtered(
            allowed_patient_ids=allowed_patient_ids,
            patient_id=patient_id,
            category=category,
            search=search,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    def get_by_id(self, record_id: int, current_user: Optional[User] = None) -> MedicalRecord:
        """Fetch medical record by ID with role domain ownership verification."""
        record = self.record_repo.get_by_id(record_id)
        if not record:
            raise ValueError(f"Medical record with ID {record_id} not found.")

        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical medical records.")

            if current_user.role == UserRole.PATIENT:
                patient = self.get_patient_for_user(current_user.id)
                if not patient or record.patient_id != patient.id:
                    raise PermissionError("Access denied: You are not authorized to view another patient's medical record.")

            elif current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor or not self.doctor_has_patient_relationship(doctor.id, record.patient_id):
                    raise PermissionError("Access denied: No active appointment relationship with this patient.")

            # ADMIN role is allowed to view any record

        return record

    def update_record(
        self, record_id: int, schema: MedicalRecordUpdate, current_user: Optional[User] = None
    ) -> MedicalRecord:
        """Update medical record details after domain ownership validation and preventing field escalation."""
        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical medical records.")

            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to modify medical records.")

        record = self.get_by_id(record_id, current_user=current_user)

        update_data = schema.model_dump(exclude_unset=True)
        # Prevent field escalation: do not allow changing patient_id
        update_data.pop("patient_id", None)

        return self.record_repo.update(record, update_data)

    def delete_record(self, record_id: int, current_user: Optional[User] = None) -> bool:
        """Delete medical record by ID after role permission and domain ownership validation."""
        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical medical records.")

            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to delete medical records.")

            if current_user.role == UserRole.DOCTOR:
                raise PermissionError("Access denied: Doctors are not permitted to delete medical records.")

        record = self.get_by_id(record_id, current_user=current_user)

        return self.record_repo.delete(record.id)
