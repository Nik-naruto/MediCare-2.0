"""add custom_slots to doctor_schedules

Revision ID: b7d80c08_custom_slots
Revises: ade8b7d80c08
Create Date: 2026-09-04 20:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7d80c08_custom_slots'
down_revision: Union[str, None] = 'ade8b7d80c08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('doctor_schedules', sa.Column('custom_slots', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('doctor_schedules', 'custom_slots')
