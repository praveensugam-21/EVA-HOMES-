"""add ondelete cascade to foreign keys

Revision ID: d9f559a7de77
Revises: dc216813fd0c
Create Date: 2026-08-05 13:26:46.163407

Every FK in the original schema was created with no ON DELETE behavior,
which defaults to RESTRICT on Postgres — deleting a property with any
enquiry/visit/offer/saved-property/unlock still pointing at it (or a user
who owns anything) fails with a ForeignKeyViolation. SQLite never enforced
these anyway (this app never turns on `PRAGMA foreign_keys`), so this
migration only touches Postgres — nothing to change for local SQLite dev.

Naming follows Postgres's own default for unnamed constraints
(`<table>_<column>_fkey`), which is exactly what every prior migration in
this project left behind since none of them passed an explicit `name=`.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9f559a7de77'
down_revision: Union[str, None] = 'dc216813fd0c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (table, column, referenced_table, ondelete)
CASCADE_FKS = [
    ("properties", "owner_id", "users", "CASCADE"),
    ("property_images", "property_id", "properties", "CASCADE"),
    ("enquiries", "property_id", "properties", "CASCADE"),
    ("enquiries", "user_id", "users", "CASCADE"),
    ("enquiry_notes", "enquiry_id", "enquiries", "CASCADE"),
    ("notifications", "user_id", "users", "CASCADE"),
    ("notification_preferences", "user_id", "users", "CASCADE"),
    ("offers", "property_id", "properties", "CASCADE"),
    ("offers", "buyer_id", "users", "CASCADE"),
    ("otp_codes", "user_id", "users", "CASCADE"),
    ("saved_properties", "property_id", "properties", "CASCADE"),
    ("saved_properties", "user_id", "users", "CASCADE"),
    ("seller_documents", "seller_profile_id", "seller_profiles", "CASCADE"),
    ("seller_profiles", "user_id", "users", "CASCADE"),
    ("visits", "property_id", "properties", "CASCADE"),
    ("visits", "buyer_id", "users", "CASCADE"),
    ("property_unlocks", "property_id", "properties", "CASCADE"),
    ("property_unlocks", "user_id", "users", "CASCADE"),
    # SET NULL, not CASCADE: reviewed_by is provenance on the buyer's own
    # unlock request, not the reviewing admin's data — deleting that admin
    # shouldn't destroy every unlock request they ever verified.
    ("property_unlocks", "reviewed_by", "users", "SET NULL"),
]


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return  # SQLite doesn't enforce these constraints in this app

    for table, column, ref_table, ondelete in CASCADE_FKS:
        constraint_name = f"{table}_{column}_fkey"
        op.drop_constraint(constraint_name, table, type_="foreignkey")
        op.create_foreign_key(
            constraint_name, table, ref_table, [column], ["id"], ondelete=ondelete
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for table, column, ref_table, _ondelete in CASCADE_FKS:
        constraint_name = f"{table}_{column}_fkey"
        op.drop_constraint(constraint_name, table, type_="foreignkey")
        op.create_foreign_key(constraint_name, table, ref_table, [column], ["id"])
