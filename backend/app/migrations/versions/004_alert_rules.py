"""create alert_rules table

Revision ID: 004
Revises: 003
Create Date: 2026-07-08 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'alert_rules',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('severity', sa.String(), nullable=False, server_default='warning'),
        sa.Column('node_id', sa.Integer(), nullable=False),
        sa.Column('condition_type', sa.String(), nullable=True),
        sa.Column('sensor_id', sa.String(), nullable=True),
        sa.Column('alert_type', sa.String(), nullable=True),
        sa.Column('value', sa.Float(), nullable=True),
        sa.Column('delay', sa.Integer(), nullable=True),
        sa.Column('pending_period', sa.String(), nullable=True),
        sa.Column('keep_firing', sa.String(), nullable=True),
        sa.Column('notify_email', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='Active')
    )
    op.create_index(op.f('ix_alert_rules_id'), 'alert_rules', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_alert_rules_id'), table_name='alert_rules')
    op.drop_table('alert_rules')
