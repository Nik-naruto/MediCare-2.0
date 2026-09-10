"""Patient Management Business Service with Domain-Level Data Ownership, Doctor Relationship, and Receptionist Role Authorization."""

from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.enums import UserRole
from app.models.patient import Patient
from app.models.user import User
from app.repositories.appointment import AppointmentRepository
from app.repositories.doctor import DoctorRepository
from app.repositories.patient import PatientRepository
from app.repositories.user import UserRepository
from app.schemas.patient import PatientCreate, PatientUpdate


class PatientService:
    """Business service governing Patient registration, domain ownership, and role authorization."""

    def __init__(self, db: Session):
        self.db = db
        self.patient_repo = PatientRepository(db)
        self.user_repo = UserRepository(db)
        self.doctor_repo = DoctorRepository(db)
        self.appointment_repo = AppointmentRepository(db)

    def register_patient_profile(self, schema: PatientCreate, current_user: Optional[User] = None) -> Patient:
        """Patient registration workflow: validate user exists, profile not created, and ownership rules."""
        if current_user and current_user.role == UserRole.PATIENT:
            if schema.user_id != current_user.id:
                raise PermissionError("Access denied: You cannot create a patient profile for another user.")

        user = self.user_repo.get_by_id(schema.user_id)
        if not user:
            raise ValueError(f"Associated User ID {schema.user_id} does not exist.")

        existing_profile = self.patient_repo.get_by_user_id(schema.user_id)
        if existing_profile:
            update_data = schema.model_dump(exclude_unset=True, exclude={'user_id'})
            return self.patient_repo.update(existing_profile, update_data)

        new_patient = Patient(
            user_id=schema.user_id,
            gender=schema.gender,
            date_of_birth=schema.date_of_birth,
            blood_group=schema.blood_group,
            address=schema.address,
            emergency_contact=schema.emergency_contact,
            allergies=schema.allergies,
        )
        return self.patient_repo.create(new_patient)

    def list_patients(
        self,
        current_user: Optional[User] = None,
        search: Optional[str] = None,
        gender: Optional[str] = None,
        blood_group: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[Patient], int]:
        """Fetch list of patients with domain-level data ownership, DB-level search, filtering, sorting, and pagination."""
        allowed_patient_ids: Optional[List[int]] = None

        if current_user:
            if current_user.role == UserRole.PATIENT:
                patient = self.patient_repo.get_by_user_id(current_user.id)
                if not patient:
                    return [], 0
                allowed_patient_ids = [patient.id]

            elif current_user.role == UserRole.DOCTOR:
                doctor = self.doctor_repo.get_by_user_id(current_user.id)
                if not doctor:
                    return [], 0
                allowed_patient_ids = self.appointment_repo.get_patient_ids_for_doctor(doctor.id)
                if not allowed_patient_ids:
                    return [], 0

            # RECEPTIONIST and ADMIN roles retain full access (allowed_patient_ids = None)

        return self.patient_repo.get_all_filtered(
            allowed_patient_ids=allowed_patient_ids,
            search=search,
            gender=gender,
            blood_group=blood_group,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    def get_by_id(self, patient_id: int, current_user: Optional[User] = None) -> Patient:
        """Fetch patient by ID with domain-level ownership and relationship verification."""
        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise ValueError(f"Patient with ID {patient_id} not found.")

        if current_user:
            if current_user.role == UserRole.PATIENT:
                if patient.user_id != current_user.id:
                    raise PermissionError("Access denied: You are not authorized to access another patient's data.")

            elif current_user.role == UserRole.DOCTOR:
                doctor = self.doctor_repo.get_by_user_id(current_user.id)
                if not doctor:
                    raise PermissionError("Access denied: Doctor profile not found.")
                has_rel = self.appointment_repo.has_appointment(doctor.id, patient.id)
                if not has_rel:
                    raise PermissionError("Access denied: No active appointment relationship with this patient.")

            # RECEPTIONIST and ADMIN roles can access any patient demographic profile

        return patient

    def update_patient(self, patient_id: int, schema: PatientUpdate, current_user: Optional[User] = None) -> Patient:
        """Update patient profile fields after role permission and ownership validation."""
        if current_user and current_user.role == UserRole.DOCTOR:
            raise PermissionError("Access denied: Doctors are not permitted to modify patient demographic profiles.")

        # RECEPTIONIST, PATIENT (own profile), and ADMIN are allowed
        patient = self.get_by_id(patient_id, current_user=current_user)

        update_data = schema.model_dump(exclude_unset=True)
        return self.patient_repo.update(patient, update_data)

    def delete_patient(self, patient_id: int, current_user: Optional[User] = None) -> bool:
        """Delete patient profile by ID after role permission and ownership validation."""
        if current_user and current_user.role == UserRole.DOCTOR:
            raise PermissionError("Access denied: Doctors are not permitted to delete patient profiles.")

        if current_user and current_user.role == UserRole.RECEPTIONIST:
            raise PermissionError("Access denied: Receptionists are not permitted to delete patient profiles.")

        patient = self.get_by_id(patient_id, current_user=current_user)

        return self.patient_repo.delete(patient.id)
