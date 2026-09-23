"""Initial Database Schema with complete domain entities, relationships, constraints, and indexes.

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-19 03:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Roles
    op.create_table(
        'roles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_roles_name'), 'roles', ['name'], unique=True)

    # 2. Permissions
    op.create_table(
        'permissions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_permissions_name'), 'permissions', ['name'], unique=True)

    # 3. Role Permissions Association
    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.String(length=36), nullable=False),
        sa.Column('permission_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('role_id', 'permission_id')
    )

    # 4. Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role_id', sa.String(length=36), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # 5. Merchants
    op.create_table(
        'merchants',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('merchant_code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('country', sa.String(length=10), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('risk_level', sa.String(length=20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_merchants_merchant_code'), 'merchants', ['merchant_code'], unique=True)
    op.create_index(op.f('ix_merchants_name'), 'merchants', ['name'], unique=False)
    op.create_index(op.f('ix_merchants_category'), 'merchants', ['category'], unique=False)

    # 6. Devices
    op.create_table(
        'devices',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('device_identifier', sa.String(length=100), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('device_type', sa.String(length=50), nullable=True),
        sa.Column('operating_system', sa.String(length=50), nullable=True),
        sa.Column('browser', sa.String(length=50), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('country', sa.String(length=10), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('first_seen_at', sa.DateTime(), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_devices_device_identifier'), 'devices', ['device_identifier'], unique=True)
    op.create_index(op.f('ix_devices_user_id'), 'devices', ['user_id'], unique=False)

    # 7. Fraud Rules
    op.create_table(
        'fraud_rules',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('rule_code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('default_severity', sa.String(length=20), nullable=True),
        sa.Column('severity', sa.String(length=20), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=True),
        sa.Column('weight', sa.Float(), nullable=True),
        sa.Column('condition_config', sa.JSON(), nullable=True),
        sa.Column('version', sa.String(length=20), nullable=True),
        sa.Column('created_by', sa.String(length=100), nullable=True),
        sa.Column('updated_by', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_fraud_rules_rule_code'), 'fraud_rules', ['rule_code'], unique=True)

    # 8. Fraud Rule Versions
    op.create_table(
        'fraud_rule_versions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('rule_id', sa.String(length=50), nullable=False),
        sa.Column('version', sa.String(length=20), nullable=False),
        sa.Column('configuration', sa.JSON(), nullable=True),
        sa.Column('threshold', sa.Float(), nullable=True),
        sa.Column('weight', sa.Float(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_by', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['rule_id'], ['fraud_rules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_fraud_rule_versions_rule_id'), 'fraud_rule_versions', ['rule_id'], unique=False)

    # 9. Model Versions
    op.create_table(
        'model_versions',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=False),
        sa.Column('algorithm', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('training_dataset', sa.String(length=255), nullable=True),
        sa.Column('feature_version', sa.String(length=50), nullable=True),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('metrics', sa.JSON(), nullable=True),
        sa.Column('drift_metrics', sa.JSON(), nullable=True),
        sa.Column('artifact_path', sa.String(length=500), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('trained_at', sa.DateTime(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('deployed_at', sa.DateTime(), nullable=True),
        sa.Column('retired_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_model_versions_version'), 'model_versions', ['version'], unique=True)
    op.create_index(op.f('ix_model_versions_status'), 'model_versions', ['status'], unique=False)

    # 10. Transactions
    op.create_table(
        'transactions',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('transaction_id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=True),
        sa.Column('user_name', sa.String(length=255), nullable=True),
        sa.Column('merchant_id', sa.String(length=50), nullable=True),
        sa.Column('device_id', sa.String(length=100), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=True),
        sa.Column('transaction_type', sa.String(length=50), nullable=True),
        sa.Column('payment_method', sa.String(length=50), nullable=False),
        sa.Column('merchant_name', sa.String(length=255), nullable=True),
        sa.Column('merchant_category', sa.String(length=100), nullable=True),
        sa.Column('country', sa.String(length=10), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('transaction_timestamp', sa.DateTime(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('source', sa.String(length=50), nullable=True),
        sa.Column('failed_attempts', sa.Integer(), nullable=True),
        sa.Column('risk_score', sa.Float(), nullable=True),
        sa.Column('risk_level', sa.String(length=20), nullable=True),
        sa.Column('ml_anomaly_score', sa.Float(), nullable=True),
        sa.Column('rules_triggered', sa.JSON(), nullable=True),
        sa.Column('risk_factors', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['merchant_id'], ['merchants.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transactions_transaction_id'), 'transactions', ['transaction_id'], unique=True)
    op.create_index(op.f('ix_transactions_user_id'), 'transactions', ['user_id'], unique=False)
    op.create_index(op.f('ix_transactions_merchant_id'), 'transactions', ['merchant_id'], unique=False)
    op.create_index(op.f('ix_transactions_device_id'), 'transactions', ['device_id'], unique=False)
    op.create_index(op.f('ix_transactions_merchant_name'), 'transactions', ['merchant_name'], unique=False)
    op.create_index(op.f('ix_transactions_merchant_category'), 'transactions', ['merchant_category'], unique=False)
    op.create_index(op.f('ix_transactions_transaction_timestamp'), 'transactions', ['transaction_timestamp'], unique=False)
    op.create_index(op.f('ix_transactions_timestamp'), 'transactions', ['timestamp'], unique=False)
    op.create_index(op.f('ix_transactions_status'), 'transactions', ['status'], unique=False)
    op.create_index(op.f('ix_transactions_risk_level'), 'transactions', ['risk_level'], unique=False)
    op.create_index(op.f('ix_transactions_created_at'), 'transactions', ['created_at'], unique=False)

    # 11. Feature Snapshots
    op.create_table(
        'feature_snapshots',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('transaction_id', sa.String(length=50), nullable=False),
        sa.Column('features', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('transaction_id')
    )

    # 12. Rule Executions
    op.create_table(
        'rule_executions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('transaction_id', sa.String(length=50), nullable=False),
        sa.Column('rule_id', sa.String(length=50), nullable=False),
        sa.Column('rule_version_id', sa.String(length=36), nullable=True),
        sa.Column('triggered', sa.Boolean(), nullable=True),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('execution_time_ms', sa.Float(), nullable=True),
        sa.Column('points_awarded', sa.Float(), nullable=True),
        sa.Column('execution_detail', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['rule_id'], ['fraud_rules.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['rule_version_id'], ['fraud_rule_versions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rule_executions_transaction_id'), 'rule_executions', ['transaction_id'], unique=False)
    op.create_index(op.f('ix_rule_executions_rule_id'), 'rule_executions', ['rule_id'], unique=False)
    op.create_index(op.f('ix_rule_executions_created_at'), 'rule_executions', ['created_at'], unique=False)

    # 13. ML Predictions
    op.create_table(
        'ml_predictions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('transaction_id', sa.String(length=50), nullable=False),
        sa.Column('model_version_id', sa.String(length=50), nullable=True),
        sa.Column('anomaly_score', sa.Float(), nullable=False),
        sa.Column('prediction', sa.String(length=50), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('feature_snapshot', sa.JSON(), nullable=True),
        sa.Column('inference_time_ms', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['model_version_id'], ['model_versions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ml_predictions_transaction_id'), 'ml_predictions', ['transaction_id'], unique=False)
    op.create_index(op.f('ix_ml_predictions_model_version_id'), 'ml_predictions', ['model_version_id'], unique=False)
    op.create_index(op.f('ix_ml_predictions_created_at'), 'ml_predictions', ['created_at'], unique=False)

    # 14. Risk Scores
    op.create_table(
        'risk_scores',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('transaction_id', sa.String(length=50), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('risk_level', sa.String(length=20), nullable=True),
        sa.Column('rule_score', sa.Float(), nullable=True),
        sa.Column('ml_score', sa.Float(), nullable=True),
        sa.Column('behavior_score', sa.Float(), nullable=True),
        sa.Column('explanation', sa.JSON(), nullable=True),
        sa.Column('scoring_version', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.CheckConstraint('score >= 0 AND score <= 100', name='check_risk_score_range'),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('transaction_id')
    )
    op.create_index(op.f('ix_risk_scores_risk_level'), 'risk_scores', ['risk_level'], unique=False)
    op.create_index(op.f('ix_risk_scores_created_at'), 'risk_scores', ['created_at'], unique=False)

    # 15. Alerts
    op.create_table(
        'alerts',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('alert_id', sa.String(length=50), nullable=False),
        sa.Column('transaction_id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=True),
        sa.Column('risk_score_id', sa.String(length=36), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('assigned_to', sa.String(length=36), nullable=True),
        sa.Column('risk_score', sa.Float(), nullable=True),
        sa.Column('alert_reason', sa.Text(), nullable=True),
        sa.Column('triggered_rules', sa.JSON(), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=True),
        sa.Column('case_id', sa.String(length=50), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['risk_score_id'], ['risk_scores.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alerts_alert_id'), 'alerts', ['alert_id'], unique=True)
    op.create_index(op.f('ix_alerts_transaction_id'), 'alerts', ['transaction_id'], unique=False)
    op.create_index(op.f('ix_alerts_user_id'), 'alerts', ['user_id'], unique=False)
    op.create_index(op.f('ix_alerts_severity'), 'alerts', ['severity'], unique=False)
    op.create_index(op.f('ix_alerts_status'), 'alerts', ['status'], unique=False)
    op.create_index(op.f('ix_alerts_assigned_to'), 'alerts', ['assigned_to'], unique=False)
    op.create_index(op.f('ix_alerts_created_at'), 'alerts', ['created_at'], unique=False)

    # 16. Cases
    op.create_table(
        'cases',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('case_id', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('severity', sa.String(length=20), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('assigned_to', sa.String(length=36), nullable=True),
        sa.Column('assigned_analyst', sa.String(length=100), nullable=True),
        sa.Column('user_id', sa.String(length=50), nullable=True),
        sa.Column('created_by', sa.String(length=36), nullable=True),
        sa.Column('risk_score', sa.Float(), nullable=True),
        sa.Column('related_transaction_ids', sa.JSON(), nullable=True),
        sa.Column('related_alert_ids', sa.JSON(), nullable=True),
        sa.Column('resolution', sa.String(length=50), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('resolved_by', sa.String(length=100), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cases_case_id'), 'cases', ['case_id'], unique=True)
    op.create_index(op.f('ix_cases_severity'), 'cases', ['severity'], unique=False)
    op.create_index(op.f('ix_cases_status'), 'cases', ['status'], unique=False)
    op.create_index(op.f('ix_cases_assigned_to'), 'cases', ['assigned_to'], unique=False)
    op.create_index(op.f('ix_cases_user_id'), 'cases', ['user_id'], unique=False)
    op.create_index(op.f('ix_cases_created_at'), 'cases', ['created_at'], unique=False)

    # 17. Case-Alerts Association
    op.create_table(
        'case_alerts',
        sa.Column('case_id', sa.String(length=50), nullable=False),
        sa.Column('alert_id', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['alert_id'], ['alerts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('case_id', 'alert_id')
    )

    # 18. Case-Transactions Association
    op.create_table(
        'case_transactions',
        sa.Column('case_id', sa.String(length=50), nullable=False),
        sa.Column('transaction_id', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('case_id', 'transaction_id')
    )

    # 19. Case Notes
    op.create_table(
        'case_notes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('case_id', sa.String(length=50), nullable=False),
        sa.Column('author_id', sa.String(length=36), nullable=True),
        sa.Column('author', sa.String(length=100), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_case_notes_case_id'), 'case_notes', ['case_id'], unique=False)

    # 20. Case Evidence
    op.create_table(
        'case_evidence',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('case_id', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('evidence_type', sa.String(length=50), nullable=True),
        sa.Column('file_reference', sa.String(length=500), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('uploaded_by', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_case_evidence_case_id'), 'case_evidence', ['case_id'], unique=False)

    # 21. Case History
    op.create_table(
        'case_history',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('case_id', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('from_status', sa.String(length=30), nullable=True),
        sa.Column('to_status', sa.String(length=30), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('actor_id', sa.String(length=36), nullable=True),
        sa.Column('actor_name', sa.String(length=100), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_case_history_case_id'), 'case_history', ['case_id'], unique=False)
    op.create_index(op.f('ix_case_history_created_at'), 'case_history', ['created_at'], unique=False)

    # 22. User Risk Profiles
    op.create_table(
        'user_risk_profiles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('user_name', sa.String(length=100), nullable=True),
        sa.Column('average_transaction_amount', sa.Float(), nullable=True),
        sa.Column('transaction_count', sa.Integer(), nullable=True),
        sa.Column('total_transactions_count', sa.Integer(), nullable=True),
        sa.Column('total_spend_amount', sa.Float(), nullable=True),
        sa.Column('usual_country', sa.String(length=10), nullable=True),
        sa.Column('usual_city', sa.String(length=100), nullable=True),
        sa.Column('usual_transaction_hours', sa.JSON(), nullable=True),
        sa.Column('known_device_count', sa.Integer(), nullable=True),
        sa.Column('known_merchant_count', sa.Integer(), nullable=True),
        sa.Column('baseline_spending', sa.Float(), nullable=True),
        sa.Column('std_dev_spending', sa.Float(), nullable=True),
        sa.Column('fraud_incident_count', sa.Integer(), nullable=True),
        sa.Column('risk_score', sa.Float(), nullable=True),
        sa.Column('risk_level', sa.String(length=20), nullable=True),
        sa.Column('active_risk_level', sa.String(length=20), nullable=True),
        sa.Column('last_known_risk_score', sa.Float(), nullable=True),
        sa.Column('known_devices', sa.JSON(), nullable=True),
        sa.Column('known_locations', sa.JSON(), nullable=True),
        sa.Column('merchant_preferences', sa.JSON(), nullable=True),
        sa.Column('last_calculated_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_user_risk_profiles_user_id'), 'user_risk_profiles', ['user_id'], unique=True)

    # 23. Device Risk Profiles
    op.create_table(
        'device_risk_profiles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('device_id', sa.String(length=100), nullable=False),
        sa.Column('transaction_count', sa.Integer(), nullable=True),
        sa.Column('total_transactions', sa.Integer(), nullable=True),
        sa.Column('failed_transaction_count', sa.Integer(), nullable=True),
        sa.Column('anomalous_transactions', sa.Integer(), nullable=True),
        sa.Column('associated_user_count', sa.Integer(), nullable=True),
        sa.Column('risk_score', sa.Float(), nullable=True),
        sa.Column('risk_level', sa.String(length=20), nullable=True),
        sa.Column('is_blacklisted', sa.String(length=10), nullable=True),
        sa.Column('associated_users', sa.JSON(), nullable=True),
        sa.Column('locations_used', sa.JSON(), nullable=True),
        sa.Column('first_seen_at', sa.DateTime(), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(), nullable=True),
        sa.Column('last_calculated_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('device_id')
    )
    op.create_index(op.f('ix_device_risk_profiles_device_id'), 'device_risk_profiles', ['device_id'], unique=True)

    # 24. Merchant Risk Profiles
    op.create_table(
        'merchant_risk_profiles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('merchant_id', sa.String(length=50), nullable=True),
        sa.Column('merchant_name', sa.String(length=100), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('transaction_count', sa.Integer(), nullable=True),
        sa.Column('total_transactions', sa.Integer(), nullable=True),
        sa.Column('alert_count', sa.Integer(), nullable=True),
        sa.Column('fraud_count', sa.Integer(), nullable=True),
        sa.Column('fraud_confirmed_count', sa.Integer(), nullable=True),
        sa.Column('total_volume', sa.Float(), nullable=True),
        sa.Column('risk_score', sa.Float(), nullable=True),
        sa.Column('risk_level', sa.String(length=20), nullable=True),
        sa.Column('base_risk_tier', sa.String(length=20), nullable=True),
        sa.Column('last_calculated_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['merchant_id'], ['merchants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('merchant_id')
    )
    op.create_index(op.f('ix_merchant_risk_profiles_merchant_id'), 'merchant_risk_profiles', ['merchant_id'], unique=True)
    op.create_index(op.f('ix_merchant_risk_profiles_merchant_name'), 'merchant_risk_profiles', ['merchant_name'], unique=False)

    # 25. Audit Logs
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('actor_user_id', sa.String(length=36), nullable=True),
        sa.Column('actor_email', sa.String(length=255), nullable=True),
        sa.Column('actor_role', sa.String(length=50), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=100), nullable=False),
        sa.Column('entity_id', sa.String(length=100), nullable=False),
        sa.Column('result', sa.String(length=20), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('request_id', sa.String(length=100), nullable=True),
        sa.Column('correlation_id', sa.String(length=100), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('diff_old', sa.JSON(), nullable=True),
        sa.Column('diff_new', sa.JSON(), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_actor_user_id'), 'audit_logs', ['actor_user_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_entity_type'), 'audit_logs', ['entity_type'], unique=False)
    op.create_index(op.f('ix_audit_logs_entity_id'), 'audit_logs', ['entity_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)
    op.create_index(op.f('ix_audit_logs_timestamp'), 'audit_logs', ['timestamp'], unique=False)

    # 26. System Settings
    op.create_table(
        'system_settings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.JSON(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('updated_by', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_system_settings_key'), 'system_settings', ['key'], unique=True)


def downgrade() -> None:
    op.drop_table('system_settings')
    op.drop_table('audit_logs')
    op.drop_table('merchant_risk_profiles')
    op.drop_table('device_risk_profiles')
    op.drop_table('user_risk_profiles')
    op.drop_table('case_history')
    op.drop_table('case_evidence')
    op.drop_table('case_notes')
    op.drop_table('case_transactions')
    op.drop_table('case_alerts')
    op.drop_table('cases')
    op.drop_table('alerts')
    op.drop_table('risk_scores')
    op.drop_table('ml_predictions')
    op.drop_table('rule_executions')
    op.drop_table('feature_snapshots')
    op.drop_table('transactions')
    op.drop_table('model_versions')
    op.drop_table('fraud_rule_versions')
    op.drop_table('fraud_rules')
    op.drop_table('devices')
    op.drop_table('merchants')
    op.drop_table('users')
    op.drop_table('role_permissions')
    op.drop_table('permissions')
    op.drop_table('roles')
