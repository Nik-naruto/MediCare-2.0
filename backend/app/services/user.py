"""User Management Business Service."""

from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    """Business service governing User account operations."""

    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def create_user(self, schema: UserCreate, hashed_password: str) -> User:
        """Validate email uniqueness and create user account with linked patient profile if applicable."""
        existing = self.user_repo.get_by_email(schema.email)
        if existing:
            raise ValueError(f"User with email '{schema.email}' already exists.")

        try:
            new_user = User(
                email=schema.email,
                hashed_password=hashed_password,
                full_name=schema.full_name,
                phone=schema.phone,
                role=schema.role,
                is_active=schema.is_active,
            )
            self.db.add(new_user)
            self.db.flush()

            if schema.role == UserRole.PATIENT:
                from app.models.enums import Gender
                from app.models.patient import Patient

                gender_val = schema.gender if schema.gender is not None else Gender.MALE
                patient_profile = Patient(
                    user_id=new_user.id,
                    gender=gender_val,
                    date_of_birth=schema.date_of_birth,
                    blood_group=schema.blood_group,
                    address=schema.address,
                    emergency_contact=schema.emergency_contact,
                )
                self.db.add(patient_profile)

            elif schema.role == UserRole.DOCTOR:
                from app.models.doctor import Doctor
                from app.repositories.department import DepartmentRepository

                dept_id = schema.department_id
                if not dept_id and schema.department:
                    dept_repo = DepartmentRepository(self.db)
                    dept = dept_repo.get_by_name(schema.department.strip())
                    if not dept:
                        raise ValueError(f"Department '{schema.department}' not found.")
                    dept_id = dept.id

                med_reg_no = schema.medical_registration_number.strip() if schema.medical_registration_number and schema.medical_registration_number.strip() else None
                if med_reg_no:
                    existing_reg = self.db.query(Doctor).filter(Doctor.medical_registration_number == med_reg_no).first()
                    if existing_reg:
                        raise ValueError(f"Doctor with Medical Registration Number '{med_reg_no}' already exists.")

                specialty_val = schema.specialty or schema.specialization or "General Medicine"
                qualification_val = schema.qualification or "MBBS"
                experience_years_val = schema.experience_years if schema.experience_years is not None else 0
                consultation_fee_val = schema.consultation_fee if schema.consultation_fee is not None else 0.0
                room_no_val = schema.room_no or "TBD"
                bio_val = schema.bio

                doctor_profile = Doctor(
                    user_id=new_user.id,
                    department_id=dept_id,
                    medical_registration_number=med_reg_no,
                    qualification=qualification_val,
                    specialty=specialty_val,
                    experience_years=experience_years_val,
                    consultation_fee=consultation_fee_val,
                    room_no=room_no_val,
                    bio=bio_val,
                    is_available=True,
                )
                self.db.add(doctor_profile)

            self.db.commit()
            self.db.refresh(new_user)
            return new_user
        except Exception:
            self.db.rollback()
            raise

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Verify user credentials for login."""
        user = self.user_repo.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def change_password(self, user_id: int, current_password: str, new_hashed_password: str) -> User:
        """Validate current password and update user's hashed password."""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found.")

        if not verify_password(current_password, user.hashed_password):
            raise ValueError("Incorrect current password.")

        return self.user_repo.update(user, {"hashed_password": new_hashed_password})

    def dev_reset_password(self, email: str, new_hashed_password: str) -> User:
        """[DEVELOPMENT ONLY] Reset a user's password directly by email without requiring current password."""
        user = self.user_repo.get_by_email(email)
        if not user:
            raise ValueError(f"User with email '{email}' not found.")

        return self.user_repo.update(user, {"hashed_password": new_hashed_password})

    def get_by_id(self, user_id: int) -> Optional[User]:
        """Fetch user by ID."""
        return self.user_repo.get_by_id(user_id)

    def list_users(
        self,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[User], int]:
        """Fetch list of users with search, role, status, sorting, and pagination."""
        return self.user_repo.get_all_users(
            search=search,
            role=role,
            is_active=is_active,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    def update_user(self, user_id: int, schema: UserUpdate) -> User:
        """Update user basic details while preventing password overwrite, role escalation, and last admin lockout."""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found.")

        update_data = schema.model_dump(exclude_unset=True)
        # Prevent password hash override via update_user
        update_data.pop("password", None)
        update_data.pop("hashed_password", None)

        if "email" in update_data and update_data["email"] != user.email:
            existing = self.user_repo.get_by_email(update_data["email"])
            if existing:
                raise ValueError(f"User with email '{update_data['email']}' already exists.")

        if "role" in update_data and update_data["role"] != user.role:
            if user.role == UserRole.ADMIN and update_data["role"] != UserRole.ADMIN:
                if user.is_active and self.user_repo.count_active_admins() <= 1:
                    raise ValueError("Cannot demote the last active Admin account.")

        if "is_active" in update_data and update_data["is_active"] is False:
            if user.role == UserRole.ADMIN and user.is_active:
                if self.user_repo.count_active_admins() <= 1:
                    raise ValueError("Cannot deactivate the last active Admin account.")

        return self.user_repo.update(user, update_data)

    def change_user_role(self, user_id: int, new_role: UserRole) -> User:
        """Change a user's role while enforcing last active admin protection."""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found.")

        if user.role == UserRole.ADMIN and new_role != UserRole.ADMIN:
            if user.is_active and self.user_repo.count_active_admins() <= 1:
                raise ValueError("Cannot demote the last active Admin account.")

        return self.user_repo.update(user, {"role": new_role})

    def set_user_status(self, user_id: int, is_active: bool) -> User:
        """Activate or deactivate a user account while enforcing last active admin protection."""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID {user_id} not found.")

        if is_active is False and user.role == UserRole.ADMIN and user.is_active:
            if self.user_repo.count_active_admins() <= 1:
                raise ValueError("Cannot deactivate the last active Admin account.")

        return self.user_repo.update(user, {"is_active": is_active})

    def delete_user(self, user_id: int) -> User:
        """Soft-deactivate user account to preserve historical clinical data and audit trails."""
        return self.set_user_status(user_id, is_active=False)
