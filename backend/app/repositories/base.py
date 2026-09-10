"""Generic Base Repository providing standard CRUD database operations."""

from typing import Any, Generic, List, Optional, Type, TypeVar
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Abstract generic repository handling fundamental database CRUD operations."""

    def __init__(self, model: Type[ModelType], db: Session):
        """Initialize repository with target ORM model and injected database session."""
        self.model = model
        self.db = db

    def get_by_id(self, id: Any) -> Optional[ModelType]:
        """Fetch a single model record by primary key."""
        return self.db.get(self.model, id)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Fetch multiple model records with pagination."""
        stmt = select(self.model).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def create(self, obj: ModelType) -> ModelType:
        """Add and persist a new model instance."""
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, db_obj: ModelType, update_data: dict) -> ModelType:
        """Update fields on an existing model instance."""
        for field, value in update_data.items():
            if hasattr(db_obj, field) and value is not None:
                setattr(db_obj, field, value)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, id: Any) -> bool:
        """Remove a model instance by primary key."""
        obj = self.get_by_id(id)
        if obj:
            self.db.delete(obj)
            self.db.commit()
            return True
        return False
