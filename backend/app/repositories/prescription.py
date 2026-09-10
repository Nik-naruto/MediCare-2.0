"""Prescription Data Repository."""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.prescription import Prescription
from app.repositories.base import BaseRepository


class PrescriptionRepository(BaseRepository[Prescription]):
    """Repository handling database queries for Prescriptions."""

    def __init__(self, db: Session):
        super().__init__(Prescription, db)

    def get_by_patient_id(self, patient_id: int) -> List[Prescription]:
        """Fetch all prescriptions issued to a patient."""
        stmt = select(Prescription).where(Prescription.patient_id == patient_id)
        return list(self.db.scalars(stmt).all())

    def get_by_patient_ids(self, patient_ids: List[int]) -> List[Prescription]:
        """Fetch prescriptions belonging to a list of patient IDs."""
        if not patient_ids:
            return []
        stmt = select(Prescription).where(Prescription.patient_id.in_(patient_ids))
        return list(self.db.scalars(stmt).all())

    def get_by_appointment_id(self, appointment_id: int) -> Optional[Prescription]:
        """Fetch prescription issued for a specific appointment."""
        stmt = select(Prescription).where(Prescription.appointment_id == appointment_id)
        return self.db.scalars(stmt).first()

    def get_all_filtered(
        self,
        allowed_patient_ids: Optional[List[int]] = None,
        allowed_doctor_id: Optional[int] = None,
        patient_id: Optional[int] = None,
        doctor_id: Optional[int] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[Prescription], int]:
        """Fetch prescriptions with domain ownership authorization, DB-level search, filtering, sorting, and pagination."""
        from sqlalchemy import func
        from app.core.pagination import apply_safe_sorting

        stmt = select(Prescription)

        # Enforce domain ownership authorization
        if allowed_patient_ids is not None:
            if not allowed_patient_ids:
                return [], 0
            stmt = stmt.where(Prescription.patient_id.in_(allowed_patient_ids))
        if allowed_doctor_id is not None:
            stmt = stmt.where(Prescription.doctor_id == allowed_doctor_id)

        if patient_id is not None:
            stmt = stmt.where(Prescription.patient_id == patient_id)
        if doctor_id is not None:
            stmt = stmt.where(Prescription.doctor_id == doctor_id)

        if search:
            from app.models.patient import Patient
            from app.models.user import User
            from app.models.prescription import PrescriptionItem
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.outerjoin(Patient, Prescription.patient_id == Patient.id).outerjoin(User, Patient.user_id == User.id).outerjoin(PrescriptionItem, Prescription.id == PrescriptionItem.prescription_id).where(
                (Prescription.diagnosis.ilike(search_pattern))
                | (Prescription.notes.ilike(search_pattern))
                | (User.full_name.ilike(search_pattern))
                | (PrescriptionItem.medicine_name.ilike(search_pattern))
            ).distinct()


        # Count total matching records before offset/limit
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = self.db.scalar(count_stmt) or 0

        # Apply safe sorting
        allowlist = {
            "id": Prescription.id,
            "created_at": Prescription.created_at,
            "diagnosis": Prescription.diagnosis,
        }
        stmt = apply_safe_sorting(stmt, Prescription, sort_by, sort_order, allowlist, Prescription.id.desc())

        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        prescriptions = list(self.db.scalars(stmt).all())
        return prescriptions, total_count
