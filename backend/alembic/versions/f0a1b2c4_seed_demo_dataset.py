"""seed complete demo dataset (60 doctors, 5 receptionists, 20 patients, schedules, appointments)

Revision ID: f0a1b2c4_seed_demo_dataset
Revises: e0f1a2b3_dept_master
Create Date: 2026-10-04 15:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.db.seed_demo_data import seed_demo_dataset

# revision identifiers, used by Alembic.
revision: str = 'f0a1b2c4_seed_demo_dataset'
down_revision: Union[str, None] = 'e0f1a2b3_dept_master'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Run idempotent seed script against the active database connection
    seed_demo_dataset()


def downgrade() -> None:
    pass
