"""add seller_profiles.photo_url

Revision ID: d98ba646b589
Revises: 8636f6cc5ec1
Create Date: 2026-08-22 13:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd98ba646b589'
down_revision: Union[str, None] = '8636f6cc5ec1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('seller_profiles', sa.Column('photo_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('seller_profiles', 'photo_url')
