"""Prescription Business Service with Domain-Level Ownership & Relationship Authorization."""

from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.enums import UserRole
from app.models.prescription import Prescription, PrescriptionItem
from app.models.user import User
from app.repositories.appointment import AppointmentRepository
from app.repositories.doctor import DoctorRepository
from app.repositories.patient import PatientRepository
from app.repositories.prescription import PrescriptionRepository
from app.schemas.prescription import PrescriptionBase, PrescriptionCreate


class PrescriptionService:
    """Business service governing digital prescription generation and domain authorization."""

    def __init__(self, db: Session):
        self.db = db
        self.prescription_repo = PrescriptionRepository(db)
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

    def create_prescription(self, schema: PrescriptionCreate, current_user: Optional[User] = None) -> Prescription:
        """Create new digital prescription header with line items after role and relationship authorization."""
        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical prescriptions.")

            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to create prescriptions.")

            if current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor:
                    raise PermissionError("Access denied: Doctor profile not found.")

                # Prevent doctor impersonation: doctor_id must match authenticated Doctor
                if schema.doctor_id and schema.doctor_id != doctor.id:
                    raise PermissionError("Access denied: You cannot create prescriptions on behalf of another doctor.")
                schema.doctor_id = doctor.id

                if not self.doctor_has_patient_relationship(doctor.id, schema.patient_id):
                    raise PermissionError("Access denied: No active appointment relationship with this patient.")

        patient = self.patient_repo.get_by_id(schema.patient_id)
        if not patient:
            raise ValueError(f"Patient ID {schema.patient_id} not found.")

        doctor = self.doctor_repo.get_by_id(schema.doctor_id)
        if not doctor:
            raise ValueError(f"Doctor ID {schema.doctor_id} not found.")

        items = [
            PrescriptionItem(
                medicine_name=item.medicine_name,
                dosage=item.dosage,
                frequency=item.frequency,
                duration_days=item.duration_days,
            )
            for item in schema.items
        ]

        new_prescription = Prescription(
            appointment_id=schema.appointment_id,
            patient_id=schema.patient_id,
            doctor_id=schema.doctor_id,
            diagnosis=schema.diagnosis,
            notes=schema.notes,
            items=items,
        )
        return self.prescription_repo.create(new_prescription)

    def list_prescriptions(
        self,
        current_user: Optional[User] = None,
        patient_id: Optional[int] = None,
        doctor_id: Optional[int] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[Prescription], int]:
        """Fetch list of prescriptions filtered by role domain ownership, DB-level search, filters, sorting, and pagination."""
        allowed_patient_ids: Optional[List[int]] = None
        allowed_doctor_id: Optional[int] = None

        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical prescriptions.")

            if current_user.role == UserRole.PATIENT:
                patient = self.get_patient_for_user(current_user.id)
                if not patient:
                    return [], 0
                allowed_patient_ids = [patient.id]

            elif current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor:
                    return [], 0
                allowed_doctor_id = doctor.id

            # ADMIN role retains full access

        return self.prescription_repo.get_all_filtered(
            allowed_patient_ids=allowed_patient_ids,
            allowed_doctor_id=allowed_doctor_id,
            patient_id=patient_id,
            doctor_id=doctor_id,
            search=search,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    def get_by_id(self, prescription_id: int, current_user: Optional[User] = None) -> Prescription:
        """Fetch prescription by ID with role domain ownership verification."""
        prescription = self.prescription_repo.get_by_id(prescription_id)
        if not prescription:
            raise ValueError(f"Prescription with ID {prescription_id} not found.")

        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical prescriptions.")

            if current_user.role == UserRole.PATIENT:
                patient = self.get_patient_for_user(current_user.id)
                if not patient or prescription.patient_id != patient.id:
                    raise PermissionError("Access denied: You are not authorized to view another patient's prescription.")

            elif current_user.role == UserRole.DOCTOR:
                doctor = self.get_doctor_for_user(current_user.id)
                if not doctor or not self.doctor_has_patient_relationship(doctor.id, prescription.patient_id):
                    raise PermissionError("Access denied: No active appointment relationship with this patient.")

            # ADMIN role is allowed to view any prescription

        return prescription

    def update_prescription(
        self, prescription_id: int, schema: PrescriptionBase, current_user: Optional[User] = None
    ) -> Prescription:
        """Update prescription diagnosis or notes after domain ownership validation and preventing field escalation."""
        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical prescriptions.")

            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to modify prescriptions.")

        prescription = self.get_by_id(prescription_id, current_user=current_user)

        update_data = schema.model_dump(exclude_unset=True)
        # Prevent field escalation: strip patient_id and doctor_id if present
        update_data.pop("patient_id", None)
        update_data.pop("doctor_id", None)

        return self.prescription_repo.update(prescription, update_data)

    def delete_prescription(self, prescription_id: int, current_user: Optional[User] = None) -> bool:
        """Delete prescription by ID after role permission and domain ownership validation."""
        if current_user:
            if current_user.role == UserRole.RECEPTIONIST:
                raise PermissionError("Access denied: Receptionists are not permitted to access clinical prescriptions.")

            if current_user.role == UserRole.PATIENT:
                raise PermissionError("Access denied: Patients are not permitted to delete prescriptions.")

            if current_user.role == UserRole.DOCTOR:
                raise PermissionError("Access denied: Doctors are not permitted to delete prescriptions.")

        prescription = self.get_by_id(prescription_id, current_user=current_user)

        return self.prescription_repo.delete(prescription.id)
