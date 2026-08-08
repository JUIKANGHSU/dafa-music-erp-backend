"""Add event_id to attendance_logs

Revision ID: d1a2b3c4e5f6
Revises: c9d3e5a7b1f2
Create Date: 2026-08-08 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1a2b3c4e5f6'
down_revision: Union[str, None] = 'c9d3e5a7b1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('attendance_logs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('event_id', sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            'fk_attendance_logs_event_id_events', 'events', ['event_id'], ['id']
        )


def downgrade() -> None:
    with op.batch_alter_table('attendance_logs', schema=None) as batch_op:
        batch_op.drop_constraint('fk_attendance_logs_event_id_events', type_='foreignkey')
        batch_op.drop_column('event_id')
