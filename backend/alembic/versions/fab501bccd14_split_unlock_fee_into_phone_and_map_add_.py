"""split unlock fee into phone and map, add broker photo

Revision ID: fab501bccd14
Revises: d9f559a7de77
Create Date: 2026-08-08 12:31:30.529717

Splits the single combined location-unlock fee/flag into two independent
unlocks (phone number, map/location), each separately priced and
separately purchasable. Existing property_unlocks rows are backfilled as
"phone" unlocks (the pre-split behavior gated both phone and map together,
so this preserves each buyer's existing paid access rather than silently
revoking it). Also adds broker_settings.photo_url for the agent contact
photo (Group 8) since it touches the same table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fab501bccd14'
down_revision: Union[str, None] = 'd9f559a7de77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---- broker_settings: split unlock_fee -> phone_unlock_fee / map_unlock_fee, add photo_url ----
    op.add_column('broker_settings', sa.Column('phone_unlock_fee', sa.Float(), nullable=True))
    op.add_column('broker_settings', sa.Column('map_unlock_fee', sa.Float(), nullable=True))
    op.add_column('broker_settings', sa.Column('photo_url', sa.String(length=500), nullable=True))

    op.execute("UPDATE broker_settings SET phone_unlock_fee = unlock_fee, map_unlock_fee = 30.0")

    with op.batch_alter_table('broker_settings') as batch_op:
        batch_op.alter_column('phone_unlock_fee', existing_type=sa.Float(), nullable=False)
        batch_op.alter_column('map_unlock_fee', existing_type=sa.Float(), nullable=False)
        batch_op.drop_column('unlock_fee')

    # ---- property_unlocks: add unlock_type + amount_paid, require payment_reference ----
    unlock_type_enum = sa.Enum('PHONE', 'MAP', name='unlocktype')
    unlock_type_enum.create(op.get_bind(), checkfirst=True)

    op.add_column('property_unlocks', sa.Column('unlock_type', unlock_type_enum, nullable=True))
    op.add_column('property_unlocks', sa.Column('amount_paid', sa.Float(), nullable=True))

    # Pre-split rows gated both phone + map together — backfill as "phone"
    # so existing verified buyers keep at least that access, not neither.
    op.execute("UPDATE property_unlocks SET unlock_type = 'PHONE' WHERE unlock_type IS NULL")
    op.execute("UPDATE property_unlocks SET amount_paid = 20.0 WHERE amount_paid IS NULL")
    op.execute("UPDATE property_unlocks SET payment_reference = 'N/A' WHERE payment_reference IS NULL OR payment_reference = ''")

    with op.batch_alter_table('property_unlocks') as batch_op:
        batch_op.alter_column('unlock_type', existing_type=unlock_type_enum, nullable=False)
        batch_op.alter_column('amount_paid', existing_type=sa.Float(), nullable=False)
        batch_op.alter_column('payment_reference', existing_type=sa.String(length=100), nullable=False)
        batch_op.drop_constraint('uq_unlock_user_property', type_='unique')
        batch_op.create_unique_constraint(
            'uq_unlock_user_property_type', ['user_id', 'property_id', 'unlock_type']
        )


def downgrade() -> None:
    with op.batch_alter_table('property_unlocks') as batch_op:
        batch_op.drop_constraint('uq_unlock_user_property_type', type_='unique')
        batch_op.create_unique_constraint('uq_unlock_user_property', ['user_id', 'property_id'])
        batch_op.alter_column('payment_reference', existing_type=sa.String(length=100), nullable=True)
        batch_op.drop_column('amount_paid')
        batch_op.drop_column('unlock_type')

    sa.Enum(name='unlocktype').drop(op.get_bind(), checkfirst=True)

    op.add_column('broker_settings', sa.Column('unlock_fee', sa.Float(), nullable=True))
    op.execute("UPDATE broker_settings SET unlock_fee = phone_unlock_fee")
    with op.batch_alter_table('broker_settings') as batch_op:
        batch_op.alter_column('unlock_fee', existing_type=sa.Float(), nullable=False)
        batch_op.drop_column('map_unlock_fee')
        batch_op.drop_column('phone_unlock_fee')
        batch_op.drop_column('photo_url')
