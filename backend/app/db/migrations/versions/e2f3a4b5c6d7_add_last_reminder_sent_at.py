"""Add last_reminder_sent_at to lesson_packages

Revision ID: e2f3a4b5c6d7
Revises: d1a2b3c4e5f6
Create Date: 2026-08-09 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, None] = 'd1a2b3c4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'lesson_packages',
        sa.Column('last_reminder_sent_at', sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('lesson_packages', 'last_reminder_sent_at')
