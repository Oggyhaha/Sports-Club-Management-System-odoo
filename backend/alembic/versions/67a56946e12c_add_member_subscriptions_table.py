"""add member_subscriptions table and extend membership_plans

Revision ID: 67a56946e12c
Revises: 01f0239295a6
Create Date: 2026-11-21 21:48:08.381801

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '67a56946e12c'
down_revision: Union[str, Sequence[str], None] = '01f0239295a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add is_active column to membership_plans
    op.add_column(
        'membership_plans',
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False)
    )

    # 2. Create member_subscriptions table
    op.create_table(
        'member_subscriptions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('member_id', sa.UUID(), nullable=False),
        sa.Column('plan_id', sa.UUID(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('price_paid', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('plan_name_snapshot', sa.String(length=50), nullable=False),
        sa.Column('duration_days_snapshot', sa.Integer(), nullable=False),
        sa.Column('court_discount_snapshot', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('shop_discount_snapshot', sa.Numeric(precision=5, scale=2), server_default='0.00', nullable=False),
        sa.Column('bar_discount_snapshot', sa.Numeric(precision=5, scale=2), server_default='0.00', nullable=False),
        sa.Column('subscription_status', sa.String(length=20), server_default='active', nullable=False),
        sa.Column('payment_status', sa.String(length=20), server_default='unpaid', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['plan_id'], ['membership_plans.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_index(op.f('ix_member_subscriptions_member_id'), 'member_subscriptions', ['member_id'], unique=False)
    op.create_index(op.f('ix_member_subscriptions_plan_id'), 'member_subscriptions', ['plan_id'], unique=False)
    op.create_index(op.f('ix_member_subscriptions_subscription_status'), 'member_subscriptions', ['subscription_status'], unique=False)
    op.create_index(op.f('ix_member_subscriptions_payment_status'), 'member_subscriptions', ['payment_status'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_member_subscriptions_payment_status'), table_name='member_subscriptions')
    op.drop_index(op.f('ix_member_subscriptions_subscription_status'), table_name='member_subscriptions')
    op.drop_index(op.f('ix_member_subscriptions_plan_id'), table_name='member_subscriptions')
    op.drop_index(op.f('ix_member_subscriptions_member_id'), table_name='member_subscriptions')
    op.drop_table('member_subscriptions')
    op.drop_column('membership_plans', 'is_active')
