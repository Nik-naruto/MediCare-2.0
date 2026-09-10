"""add profile_photo_url to doctors

Revision ID: d9f01e23_doc_photo_url
Revises: c8e91d09_med_reg_no
Create Date: 2026-09-05 02:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9f01e23_doc_photo_url'
down_revision: Union[str, None] = 'c8e91d09_med_reg_no'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('doctors', sa.Column('profile_photo_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('doctors', 'profile_photo_url')
