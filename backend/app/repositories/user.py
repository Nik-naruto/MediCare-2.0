"""User Data Repository."""

from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import UserRole
from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository handling database queries for User accounts."""

    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        """Fetch a user record by unique email address."""
        stmt = select(User).where(User.email == email)
        return self.db.scalars(stmt).first()

    def get_all_users(
        self,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> tuple[List[User], int]:
        """Fetch all users with DB-level search, filtering, sorting, pagination, and total count calculation."""
        stmt = select(User)
        if search:
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                (User.full_name.ilike(search_pattern))
                | (User.email.ilike(search_pattern))
                | (User.phone.ilike(search_pattern))
            )
        if role is not None:
            stmt = stmt.where(User.role == role)
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)

        # Count total matching records before offset/limit
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = self.db.scalar(count_stmt) or 0

        # Apply safe sorting
        allowlist = {
            "id": User.id,
            "created_at": User.created_at,
            "full_name": User.full_name,
            "email": User.email,
            "role": User.role,
            "is_active": User.is_active,
        }
        from app.core.pagination import apply_safe_sorting
        stmt = apply_safe_sorting(stmt, User, sort_by, sort_order, allowlist, User.id.asc())

        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        users = list(self.db.scalars(stmt).all())
        return users, total_count

    def count_active_admins(self) -> int:
        """Count the number of active users with Admin role."""
        stmt = select(func.count(User.id)).where(User.role == UserRole.ADMIN, User.is_active.is_(True))
        return self.db.scalar(stmt) or 0
