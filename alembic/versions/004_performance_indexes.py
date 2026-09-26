"""Performance Composite Indexes for High-Throughput Ingestion, Filtering, and Analytics.

Revision ID: 004_performance_indexes
Revises: 003_notification_system
Create Date: 2026-09-26 20:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_performance_indexes'
down_revision: Union[str, None] = '003_notification_system'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Transactions table composite indexes for feature extraction, filtering, and time-range aggregations
    op.create_index('ix_transactions_user_timestamp', 'transactions', ['user_id', 'timestamp'])
    op.create_index('ix_transactions_device_timestamp', 'transactions', ['device_id', 'timestamp'])
    op.create_index('ix_transactions_status_timestamp', 'transactions', ['status', 'timestamp'])
    op.create_index('ix_transactions_risk_level_timestamp', 'transactions', ['risk_level', 'timestamp'])
    op.create_index('ix_transactions_currency_timestamp', 'transactions', ['currency', 'timestamp'])
    op.create_index('ix_transactions_merchant_timestamp', 'transactions', ['merchant_name', 'timestamp'])

    # 2. Alerts table composite indexes for triage queries and lifecycle filtering
    op.create_index('ix_alerts_status_severity', 'alerts', ['status', 'severity'])
    op.create_index('ix_alerts_user_created', 'alerts', ['user_id', 'created_at'])
    op.create_index('ix_alerts_status_created', 'alerts', ['status', 'created_at'])

    # 3. Cases table composite indexes for workload and status filtering
    op.create_index('ix_cases_status_severity', 'cases', ['status', 'severity'])
    op.create_index('ix_cases_assigned_status', 'cases', ['assigned_to', 'status'])
    op.create_index('ix_cases_user_created', 'cases', ['user_id', 'created_at'])

    # 4. Audit logs table composite indexes for actor and action timelines
    op.create_index('ix_audit_logs_actor_timestamp', 'audit_logs', ['actor_user_id', 'timestamp'])
    op.create_index('ix_audit_logs_action_timestamp', 'audit_logs', ['action', 'timestamp'])


def downgrade() -> None:
    op.drop_index('ix_audit_logs_action_timestamp', 'audit_logs')
    op.drop_index('ix_audit_logs_actor_timestamp', 'audit_logs')

    op.drop_index('ix_cases_user_created', 'cases')
    op.drop_index('ix_cases_assigned_status', 'cases')
    op.drop_index('ix_cases_status_severity', 'cases')

    op.drop_index('ix_alerts_status_created', 'alerts')
    op.drop_index('ix_alerts_user_created', 'alerts')
    op.drop_index('ix_alerts_status_severity', 'alerts')

    op.drop_index('ix_transactions_merchant_timestamp', 'transactions')
    op.drop_index('ix_transactions_currency_timestamp', 'transactions')
    op.drop_index('ix_transactions_risk_level_timestamp', 'transactions')
    op.drop_index('ix_transactions_status_timestamp', 'transactions')
    op.drop_index('ix_transactions_device_timestamp', 'transactions')
    op.drop_index('ix_transactions_user_timestamp', 'transactions')
