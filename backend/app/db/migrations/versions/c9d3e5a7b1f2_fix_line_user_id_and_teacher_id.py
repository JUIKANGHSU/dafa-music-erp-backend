"""Fix line_user_id column rename and add teacher_id to lesson_packages

Revision ID: c9d3e5a7b1f2
Revises: 4b37acb68147
Create Date: 2026-05-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c9d3e5a7b1f2'
down_revision: Union[str, None] = '4b37acb68147'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('students', 'line_notify_token', new_column_name='line_user_id')

    op.add_column('lesson_packages', sa.Column('teacher_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(
        'fk_lesson_packages_teacher_id',
        'lesson_packages', 'users',
        ['teacher_id'], ['id'],
    )


def downgrade() -> None:
    op.drop_constraint('fk_lesson_packages_teacher_id', 'lesson_packages', type_='foreignkey')
    op.drop_column('lesson_packages', 'teacher_id')
    op.alter_column('students', 'line_user_id', new_column_name='line_notify_token')
