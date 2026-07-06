"""alerts and thresholds tables

Revision ID: 003
Revises: 002
Create Date: 2026-07-06 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create sensor_thresholds table
    op.create_table(
        'sensor_thresholds',
        sa.Column('sensor_id', sa.String(), nullable=False, primary_key=True),
        sa.Column('alarm_limit', sa.Float(), nullable=True),
        sa.Column('trip_limit', sa.Float(), nullable=True)
    )
    op.create_index(op.f('ix_sensor_thresholds_sensor_id'), 'sensor_thresholds', ['sensor_id'], unique=False)

    # 2. Create alerts table
    op.create_table(
        'alerts',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('sensor_id', sa.String(), nullable=True),
        sa.Column('node_id', sa.Integer(), nullable=True),
        sa.Column('severity', sa.String(), nullable=False),
        sa.Column('message', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.func.now())
    )
    op.create_index(op.f('ix_alerts_id'), 'alerts', ['id'], unique=False)
    op.create_index(op.f('ix_alerts_sensor_id'), 'alerts', ['sensor_id'], unique=False)
    op.create_index(op.f('ix_alerts_node_id'), 'alerts', ['node_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_alerts_node_id'), table_name='alerts')
    op.drop_index(op.f('ix_alerts_sensor_id'), table_name='alerts')
    op.drop_index(op.f('ix_alerts_id'), table_name='alerts')
    op.drop_table('alerts')
    op.drop_index(op.f('ix_sensor_thresholds_sensor_id'), table_name='sensor_thresholds')
    op.drop_table('sensor_thresholds')
