"""add medical_registration_number to doctors

Revision ID: c8e91d09_med_reg_no
Revises: b7d80c08_custom_slots
Create Date: 2026-09-04 20:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8e91d09_med_reg_no'
down_revision: Union[str, None] = 'b7d80c08_custom_slots'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add column as nullable=True
    op.add_column('doctors', sa.Column('medical_registration_number', sa.String(length=100), nullable=True))
    
    # 2. Create unique index
    op.create_index(op.f('ix_doctors_medical_registration_number'), 'doctors', ['medical_registration_number'], unique=True)
    
    # 3. Safe backfill for existing local/demo doctor records so existing data has valid demo values
    op.execute(
        "UPDATE doctors SET medical_registration_number = 'MCI-DEMO-100' || id WHERE medical_registration_number IS NULL;"
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_doctors_medical_registration_number'), table_name='doctors')
    op.drop_column('doctors', 'medical_registration_number')
