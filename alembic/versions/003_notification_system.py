"""Notification System Tables and Indexes (Notifications, NotificationPreferences, NotificationDeliveries).

Revision ID: 003_notification_system
Revises: 002_audit_logging_enhancements
Create Date: 2026-09-26 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_notification_system'
down_revision: Union[str, None] = '002_audit_logging_enhancements'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('recipient_user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('notification_type', sa.String(length=64), nullable=False),
        sa.Column('category', sa.String(length=64), nullable=False, server_default='SECURITY_ALERTS'),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(length=32), nullable=False, server_default='INFO'),
        sa.Column('priority', sa.String(length=32), nullable=False, server_default='NORMAL'),
        sa.Column('source_type', sa.String(length=64), nullable=True),
        sa.Column('source_id', sa.String(length=100), nullable=True),
        sa.Column('delivery_status', sa.String(length=32), nullable=False, server_default='DELIVERED'),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('dismissed_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('deduplication_key', sa.String(length=255), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_notifications_recipient_user_id', 'notifications', ['recipient_user_id'])
    op.create_index('ix_notifications_notification_type', 'notifications', ['notification_type'])
    op.create_index('ix_notifications_category', 'notifications', ['category'])
    op.create_index('ix_notifications_severity', 'notifications', ['severity'])
    op.create_index('ix_notifications_priority', 'notifications', ['priority'])
    op.create_index('ix_notifications_source_type', 'notifications', ['source_type'])
    op.create_index('ix_notifications_source_id', 'notifications', ['source_id'])
    op.create_index('ix_notifications_delivery_status', 'notifications', ['delivery_status'])
    op.create_index('ix_notifications_read_at', 'notifications', ['read_at'])
    op.create_index('ix_notifications_deduplication_key', 'notifications', ['deduplication_key'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])
    op.create_index('ix_notifications_recipient_read', 'notifications', ['recipient_user_id', 'read_at'])
    op.create_index('ix_notifications_recipient_created', 'notifications', ['recipient_user_id', 'created_at'])
    op.create_index('ix_notifications_dedup_created', 'notifications', ['deduplication_key', 'created_at'])

    # 2. Create notification_preferences table
    op.create_table(
        'notification_preferences',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category', sa.String(length=64), nullable=False),
        sa.Column('channel', sa.String(length=32), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'category', 'channel', name='uq_user_category_channel')
    )
    op.create_index('ix_notification_preferences_user_id', 'notification_preferences', ['user_id'])
    op.create_index('ix_notification_preferences_category', 'notification_preferences', ['category'])
    op.create_index('ix_notification_preferences_channel', 'notification_preferences', ['channel'])

    # 3. Create notification_deliveries table
    op.create_table(
        'notification_deliveries',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('notification_id', sa.String(length=36), sa.ForeignKey('notifications.id', ondelete='CASCADE'), nullable=False),
        sa.Column('channel', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='DELIVERED'),
        sa.Column('attempt_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('last_attempt_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('provider_reference', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_notification_deliveries_notification_id', 'notification_deliveries', ['notification_id'])
    op.create_index('ix_notification_deliveries_channel', 'notification_deliveries', ['channel'])
    op.create_index('ix_notification_deliveries_status', 'notification_deliveries', ['status'])


def downgrade() -> None:
    op.drop_table('notification_deliveries')
    op.drop_table('notification_preferences')
    op.drop_table('notifications')
