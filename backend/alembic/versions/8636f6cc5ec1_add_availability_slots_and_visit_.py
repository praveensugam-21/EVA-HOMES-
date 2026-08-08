"""add availability slots and visit reminder fields

Revision ID: 8636f6cc5ec1
Revises: fab501bccd14
Create Date: 2026-08-08 13:08:23.624428

New table `availability_slots` — seller-defined, specific-date (not
recurring) visit slots per property. `visits` gains `slot_id` (nullable —
visits booked before this feature existed have none) and
`reminder_sent_at` (idempotency stamp for the "1 hour before" cron job).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8636f6cc5ec1'
down_revision: Union[str, None] = 'fab501bccd14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'availability_slots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('seller_id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('specific_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('is_booked', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['seller_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_availability_slots_id'), 'availability_slots', ['id'], unique=False)
    op.create_index(op.f('ix_availability_slots_seller_id'), 'availability_slots', ['seller_id'], unique=False)
    op.create_index(op.f('ix_availability_slots_property_id'), 'availability_slots', ['property_id'], unique=False)

    op.add_column('visits', sa.Column('slot_id', sa.Integer(), nullable=True))
    op.add_column('visits', sa.Column('reminder_sent_at', sa.DateTime(), nullable=True))
    op.create_index(op.f('ix_visits_slot_id'), 'visits', ['slot_id'], unique=False)
    with op.batch_alter_table('visits') as batch_op:
        batch_op.create_foreign_key(
            'visits_slot_id_fkey', 'availability_slots', ['slot_id'], ['id'], ondelete='SET NULL'
        )


def downgrade() -> None:
    with op.batch_alter_table('visits') as batch_op:
        batch_op.drop_constraint('visits_slot_id_fkey', type_='foreignkey')
        batch_op.drop_index(op.f('ix_visits_slot_id'))
        batch_op.drop_column('reminder_sent_at')
        batch_op.drop_column('slot_id')

    op.drop_index(op.f('ix_availability_slots_property_id'), table_name='availability_slots')
    op.drop_index(op.f('ix_availability_slots_seller_id'), table_name='availability_slots')
    op.drop_index(op.f('ix_availability_slots_id'), table_name='availability_slots')
    op.drop_table('availability_slots')
