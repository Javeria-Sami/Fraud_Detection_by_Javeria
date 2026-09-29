"""Add priority column to cases table.

Revision ID: 005_case_priority
Revises: 004_performance_indexes
Create Date: 2026-09-27 02:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_case_priority'
down_revision: Union[str, None] = '004_performance_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('cases', schema=None) as batch_op:
        batch_op.add_column(sa.Column('priority', sa.String(length=20), nullable=True, server_default='MEDIUM'))
        batch_op.create_index('ix_cases_priority', ['priority'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('cases', schema=None) as batch_op:
        batch_op.drop_index('ix_cases_priority')
        batch_op.drop_column('priority')
