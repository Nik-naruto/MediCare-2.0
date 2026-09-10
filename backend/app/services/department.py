"""Department Business Service."""

from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.department import Department
from app.repositories.department import DepartmentRepository
from app.repositories.doctor import DoctorRepository
from app.schemas.department import DepartmentCreate, DepartmentUpdate


class DepartmentService:
    """Business service governing Clinical Department setups."""

    def __init__(self, db: Session):
        self.db = db
        self.dept_repo = DepartmentRepository(db)
        self.doctor_repo = DoctorRepository(db)

    def create_department(self, schema: DepartmentCreate) -> Department:
        """Create new clinical department."""
        existing = self.dept_repo.get_by_name(schema.name)
        if existing:
            raise ValueError(f"Department '{schema.name}' already exists.")

        if schema.head_doctor_id is not None:
            doctor = self.doctor_repo.get_by_id(schema.head_doctor_id)
            if not doctor:
                raise ValueError(f"Head Doctor with ID {schema.head_doctor_id} does not exist.")

        new_dept = Department(
            name=schema.name,
            description=schema.description,
            location=schema.location,
            head_doctor_id=schema.head_doctor_id,
        )
        return self.dept_repo.create(new_dept)

    def list_all(
        self,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
    ) -> tuple[List[Department], int]:
        """List all clinical departments with DB-level search, sorting, and pagination."""
        return self.dept_repo.get_all_filtered(
            search=search,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    def get_by_id(self, department_id: int) -> Optional[Department]:
        """Fetch department by ID."""
        return self.dept_repo.get_by_id(department_id)

    def update_department(self, department_id: int, schema: DepartmentUpdate) -> Department:
        """Update department details."""
        dept = self.dept_repo.get_by_id(department_id)
        if not dept:
            raise ValueError(f"Department with ID {department_id} not found.")

        if schema.name is not None and schema.name != dept.name:
            existing = self.dept_repo.get_by_name(schema.name)
            if existing:
                raise ValueError(f"Department '{schema.name}' already exists.")

        if schema.head_doctor_id is not None:
            doctor = self.doctor_repo.get_by_id(schema.head_doctor_id)
            if not doctor:
                raise ValueError(f"Head Doctor with ID {schema.head_doctor_id} does not exist.")

        update_data = schema.model_dump(exclude_unset=True)
        return self.dept_repo.update(dept, update_data)

    def delete_department(self, department_id: int) -> bool:
        """Delete department by ID."""
        dept = self.dept_repo.get_by_id(department_id)
        if not dept:
            raise ValueError(f"Department with ID {department_id} not found.")
        return self.dept_repo.delete(department_id)
