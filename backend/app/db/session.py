"""SQLAlchemy Database Engine and Session Factory.

Note: No active PostgreSQL connection will be established or tested in Phase 3.
Real database connection will be configured in Phase 7/8.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Engine configuration (connection disabled during initial phase)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
)

# Session factory for creating database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db():
    """Dependency helper function for obtaining database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
