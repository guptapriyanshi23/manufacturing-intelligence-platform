"""sensor telemetry table

Revision ID: 002
Revises: 001
Create Date: 2026-07-06 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the sensor telemetry table structured for timescaledb compatibility
    op.create_table(
        'sensor_telemetry',
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('sensor_id', sa.String(), nullable=False),
        sa.Column('sensor_name', sa.String(), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('inserted_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('timestamp', 'sensor_id')
    )
    
    # Eagerly convert to TimescaleDB hypertable if extension is active
    bind = op.get_bind()
    try:
        has_timescale = bind.execute(sa.text("SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'")).scalar()
        if has_timescale:
            bind.execute(sa.text("SELECT create_hypertable('sensor_telemetry', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);"))
    except Exception:
        pass


def downgrade() -> None:
    op.drop_table('sensor_telemetry')
