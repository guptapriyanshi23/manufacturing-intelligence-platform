"""Initial schema setup

Revision ID: 001
Revises: 
Create Date: 2026-07-03 13:51:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create hierarchy_nodes table
    op.create_table(
        'hierarchy_nodes',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('parent_id', sa.Integer(), sa.ForeignKey('hierarchy_nodes.id', ondelete='CASCADE'), nullable=True),
        sa.Column('node_type', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('display_name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now())
    )
    op.create_index(op.f('ix_hierarchy_nodes_id'), 'hierarchy_nodes', ['id'], unique=False)

    # 2. Create plant_metadata table
    op.create_table(
        'plant_metadata',
        sa.Column('node_id', sa.Integer(), sa.ForeignKey('hierarchy_nodes.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('use_case', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=True)
    )

    # 3. Create asset_metadata table
    op.create_table(
        'asset_metadata',
        sa.Column('node_id', sa.Integer(), sa.ForeignKey('hierarchy_nodes.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('asset_id', sa.String(), nullable=False),
        sa.Column('manufacturer', sa.String(), nullable=True),
        sa.Column('model', sa.String(), nullable=True)
    )
    op.create_index(op.f('ix_asset_metadata_asset_id'), 'asset_metadata', ['asset_id'], unique=False)

    # 4. Create sensor_metadata table
    op.create_table(
        'sensor_metadata',
        sa.Column('node_id', sa.Integer(), sa.ForeignKey('hierarchy_nodes.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('sensor_id', sa.String(), nullable=False),
        sa.Column('unit', sa.String(), nullable=True),
        sa.Column('sampling_rate', sa.Float(), nullable=True)
    )
    op.create_index(op.f('ix_sensor_metadata_sensor_id'), 'sensor_metadata', ['sensor_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_sensor_metadata_sensor_id'), table_name='sensor_metadata')
    op.drop_table('sensor_metadata')
    op.drop_index(op.f('ix_asset_metadata_asset_id'), table_name='asset_metadata')
    op.drop_table('asset_metadata')
    op.drop_table('plant_metadata')
    op.drop_index(op.f('ix_hierarchy_nodes_id'), table_name='hierarchy_nodes')
    op.drop_table('hierarchy_nodes')
