"""Audit Logging Subsystem Enhancements (Actor Types, Severity, Source, Error Messages, Composite Indexes).

Revision ID: 002_audit_logging_enhancements
Revises: 001_initial_schema
Create Date: 2026-09-26 19:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_audit_logging_enhancements'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safely add columns to audit_logs
    with op.batch_alter_table('audit_logs') as batch_op:
        batch_op.add_column(sa.Column('actor_type', sa.String(length=50), nullable=True, server_default='USER'))
        batch_op.add_column(sa.Column('severity', sa.String(length=20), nullable=True, server_default='INFO'))
        batch_op.add_column(sa.Column('source', sa.String(length=50), nullable=True, server_default='API'))
        batch_op.add_column(sa.Column('error_message', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('session_id', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('event_version', sa.String(length=10), nullable=True, server_default='1.0'))

        batch_op.create_index('ix_audit_logs_actor_type', ['actor_type'], unique=False)
        batch_op.create_index('ix_audit_logs_severity', ['severity'], unique=False)
        batch_op.create_index('ix_audit_logs_source', ['source'], unique=False)
        batch_op.create_index('ix_audit_logs_request_id', ['request_id'], unique=False)
        batch_op.create_index('ix_audit_logs_correlation_id', ['correlation_id'], unique=False)
        batch_op.create_index('ix_audit_logs_timestamp_severity', ['timestamp', 'severity'], unique=False)
        batch_op.create_index('ix_audit_logs_action_result', ['action', 'result'], unique=False)
        batch_op.create_index('ix_audit_logs_entity_composite', ['entity_type', 'entity_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('audit_logs') as batch_op:
        batch_op.drop_index('ix_audit_logs_entity_composite')
        batch_op.drop_index('ix_audit_logs_action_result')
        batch_op.drop_index('ix_audit_logs_timestamp_severity')
        batch_op.drop_index('ix_audit_logs_correlation_id')
        batch_op.drop_index('ix_audit_logs_request_id')
        batch_op.drop_index('ix_audit_logs_source')
        batch_op.drop_index('ix_audit_logs_severity')
        batch_op.drop_index('ix_audit_logs_actor_type')

        batch_op.drop_column('event_version')
        batch_op.drop_column('session_id')
        batch_op.drop_column('error_message')
        batch_op.drop_column('source')
        batch_op.drop_column('severity')
        batch_op.drop_column('actor_type')
