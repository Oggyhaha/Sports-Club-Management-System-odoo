"""add social play and walkin booking support

Revision ID: 909a1bf19fd6
Revises: 67a56946e12c
Create Date: 2026-11-21 22:10:56.259437

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '909a1bf19fd6'
down_revision: Union[str, Sequence[str], None] = '67a56946e12c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Update bookings table for walk-in support and cancellation audit
    op.alter_column('bookings', 'member_id',
               existing_type=sa.UUID(),
               nullable=True)
    op.add_column('bookings', sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('bookings', sa.Column('walk_in_name', sa.String(length=100), nullable=True))
    op.add_column('bookings', sa.Column('walk_in_phone', sa.String(length=20), nullable=True))

    # 2. Create social_play_sessions table
    op.create_table('social_play_sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('court_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=100), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('max_capacity', sa.Integer(), server_default='8', nullable=False),
        sa.Column('fee_per_participant', sa.Numeric(precision=10, scale=2), server_default='0.00', nullable=False),
        sa.Column('status', sa.String(length=20), server_default='scheduled', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['court_id'], ['courts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_social_play_sessions_court_id'), 'social_play_sessions', ['court_id'], unique=False)
    op.create_index(op.f('ix_social_play_sessions_start_time'), 'social_play_sessions', ['start_time'], unique=False)
    op.create_index(op.f('ix_social_play_sessions_status'), 'social_play_sessions', ['status'], unique=False)

    # 3. Create social_play_participants table
    op.create_table('social_play_participants',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('member_id', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='joined', nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['session_id'], ['social_play_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_social_play_participants_member_id'), 'social_play_participants', ['member_id'], unique=False)
    op.create_index(op.f('ix_social_play_participants_session_id'), 'social_play_participants', ['session_id'], unique=False)
    op.create_index(op.f('ix_social_play_participants_status'), 'social_play_participants', ['status'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_social_play_participants_status'), table_name='social_play_participants')
    op.drop_index(op.f('ix_social_play_participants_session_id'), table_name='social_play_participants')
    op.drop_index(op.f('ix_social_play_participants_member_id'), table_name='social_play_participants')
    op.drop_table('social_play_participants')

    op.drop_index(op.f('ix_social_play_sessions_status'), table_name='social_play_sessions')
    op.drop_index(op.f('ix_social_play_sessions_start_time'), table_name='social_play_sessions')
    op.drop_index(op.f('ix_social_play_sessions_court_id'), table_name='social_play_sessions')
    op.drop_table('social_play_sessions')

    op.drop_column('bookings', 'walk_in_phone')
    op.drop_column('bookings', 'walk_in_name')
    op.drop_column('bookings', 'cancelled_at')
    op.alter_column('bookings', 'member_id',
               existing_type=sa.UUID(),
               nullable=False)
