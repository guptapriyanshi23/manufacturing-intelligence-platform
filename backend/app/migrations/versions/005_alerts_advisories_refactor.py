"""refactor alerts and advisories, create rcas table

Revision ID: 005
Revises: 004
Create Date: 2026-07-14 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create rcas table
    op.create_table(
        'rcas',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('advisory_id', sa.Integer(), sa.ForeignKey('advisories.id', ondelete='CASCADE'), nullable=False),
        sa.Column('root_cause_description', sa.String(), nullable=True),
        sa.Column('action_taken', sa.String(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='initiated'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'))
    )
    op.create_index(op.f('ix_rcas_id'), 'rcas', ['id'], unique=False)
    op.create_index(op.f('ix_rcas_advisory_id'), 'rcas', ['advisory_id'], unique=False)

    # 2. Add node_id to advisories table (nullable first to populate)
    op.add_column('advisories', sa.Column('node_id', sa.Integer(), sa.ForeignKey('hierarchy_nodes.id', ondelete='SET NULL'), nullable=True))
    op.create_index(op.f('ix_advisories_node_id'), 'advisories', ['node_id'], unique=False)

    # 3. Migrate data before altering types / dropping columns
    bind = op.get_bind()

    # Map string severities to integers:
    # critical -> 1, high -> 2, warning -> 3, medium -> 3, low -> 4, info -> 5
    bind.execute(sa.text("UPDATE alerts SET severity = '1' WHERE LOWER(severity) IN ('critical', 's1')"))
    bind.execute(sa.text("UPDATE alerts SET severity = '2' WHERE LOWER(severity) IN ('high', 's2')"))
    bind.execute(sa.text("UPDATE alerts SET severity = '3' WHERE LOWER(severity) IN ('warning', 'medium', 's3')"))
    bind.execute(sa.text("UPDATE alerts SET severity = '4' WHERE LOWER(severity) IN ('low', 's4')"))
    bind.execute(sa.text("UPDATE alerts SET severity = '5' WHERE LOWER(severity) IN ('info', 'informational', 's5')"))
    # Default fallback for any unexpected string severity values
    bind.execute(sa.text("UPDATE alerts SET severity = '5' WHERE severity NOT IN ('1', '2', '3', '4', '5')"))

    bind.execute(sa.text("UPDATE advisories SET severity = '1' WHERE LOWER(severity) IN ('critical', 's1')"))
    bind.execute(sa.text("UPDATE advisories SET severity = '2' WHERE LOWER(severity) IN ('high', 's2')"))
    bind.execute(sa.text("UPDATE advisories SET severity = '3' WHERE LOWER(severity) IN ('warning', 'medium', 's3')"))
    bind.execute(sa.text("UPDATE advisories SET severity = '4' WHERE LOWER(severity) IN ('low', 's4')"))
    bind.execute(sa.text("UPDATE advisories SET severity = '5' WHERE LOWER(severity) IN ('info', 'informational', 's5')"))
    bind.execute(sa.text("UPDATE advisories SET severity = '5' WHERE severity NOT IN ('1', '2', '3', '4', '5')"))

    # Populate node_id in alerts using sensor_metadata if node_id is null
    bind.execute(sa.text("""
        UPDATE alerts a
        SET node_id = sm.node_id
        FROM sensor_metadata sm
        WHERE a.sensor_id = sm.sensor_id AND a.node_id IS NULL
    """))

    # Populate node_id in advisories using sensor_metadata or hierarchy_nodes
    bind.execute(sa.text("""
        UPDATE advisories adv
        SET node_id = sm.node_id
        FROM sensor_metadata sm
        WHERE adv.sensor_id = sm.sensor_id AND adv.node_id IS NULL
    """))
    bind.execute(sa.text("""
        UPDATE advisories adv
        SET node_id = hn.id
        FROM hierarchy_nodes hn
        WHERE LOWER(adv.asset) = LOWER(hn.name) AND adv.node_id IS NULL
    """))

    # Copy existing RCA details to the rcas table
    bind.execute(sa.text("""
        INSERT INTO rcas (advisory_id, root_cause_description, action_taken, status, created_at)
        SELECT id, root_cause_description, action_taken, 'completed', COALESCE(created_at, NOW())
        FROM advisories
        WHERE root_cause_description IS NOT NULL OR action_taken IS NOT NULL
    """))

    # Clean up any dangling node_id values that are not in hierarchy_nodes to avoid FK violations
    bind.execute(sa.text("UPDATE alerts SET node_id = NULL WHERE node_id NOT IN (SELECT id FROM hierarchy_nodes)"))
    bind.execute(sa.text("UPDATE advisories SET node_id = NULL WHERE node_id NOT IN (SELECT id FROM hierarchy_nodes)"))

    # 4. Alter column types
    op.execute("ALTER TABLE alerts ALTER COLUMN severity TYPE INTEGER USING (severity::integer)")
    op.execute("ALTER TABLE advisories ALTER COLUMN severity TYPE INTEGER USING (severity::integer)")

    # 5. Add foreign key constraint to alerts.node_id
    op.create_foreign_key('fk_alerts_hierarchy_nodes', 'alerts', 'hierarchy_nodes', ['node_id'], ['id'], ondelete='SET NULL')

    # 6. Drop name columns that are no longer needed
    op.drop_column('alerts', 'sensor_id')
    op.drop_column('alerts', 'asset_name')
    op.drop_column('alerts', 'sensor_name')

    op.drop_column('advisories', 'sensor_id')
    op.drop_column('advisories', 'sensor_name')
    op.drop_column('advisories', 'asset')
    op.drop_column('advisories', 'root_cause_description')
    op.drop_column('advisories', 'action_taken')


def downgrade() -> None:
    # Adding columns back as nullable
    op.add_column('advisories', sa.Column('sensor_id', sa.String(), nullable=True))
    op.add_column('advisories', sa.Column('sensor_name', sa.String(), nullable=True))
    op.add_column('advisories', sa.Column('asset', sa.String(), nullable=True))
    op.add_column('advisories', sa.Column('root_cause_description', sa.String(), nullable=True))
    op.add_column('advisories', sa.Column('action_taken', sa.String(), nullable=True))

    op.add_column('alerts', sa.Column('sensor_id', sa.String(), nullable=True))
    op.add_column('alerts', sa.Column('asset_name', sa.String(), nullable=True))
    op.add_column('alerts', sa.Column('sensor_name', sa.String(), nullable=True))

    # Re-migrate data back from ids to string fields where possible
    bind = op.get_bind()

    # Convert severity back to string 'critical', 'warning', 'info'
    op.execute("ALTER TABLE alerts ALTER COLUMN severity TYPE VARCHAR USING "
               "CASE severity WHEN 1 THEN 'critical' WHEN 2 THEN 'high' WHEN 3 THEN 'warning' WHEN 4 THEN 'low' ELSE 'info' END")
    op.execute("ALTER TABLE advisories ALTER COLUMN severity TYPE VARCHAR USING "
               "CASE severity WHEN 1 THEN 'critical' WHEN 2 THEN 'high' WHEN 3 THEN 'warning' WHEN 4 THEN 'low' ELSE 'info' END")

    # Restore advisory name fields
    bind.execute(sa.text("""
        UPDATE advisories adv
        SET sensor_id = sm.sensor_id, sensor_name = hn.display_name
        FROM hierarchy_nodes hn
        LEFT JOIN sensor_metadata sm ON hn.id = sm.node_id
        WHERE adv.node_id = hn.id AND hn.node_type = 'sensor'
    """))
    bind.execute(sa.text("""
        UPDATE advisories adv
        SET asset = hn.display_name
        FROM hierarchy_nodes hn
        WHERE adv.node_id = hn.id AND hn.node_type = 'asset'
    """))

    # Restore alerts name fields
    bind.execute(sa.text("""
        UPDATE alerts a
        SET sensor_id = sm.sensor_id, sensor_name = hn.display_name
        FROM hierarchy_nodes hn
        LEFT JOIN sensor_metadata sm ON hn.id = sm.node_id
        WHERE a.node_id = hn.id AND hn.node_type = 'sensor'
    """))

    # Restore RCA details to advisories
    bind.execute(sa.text("""
        UPDATE advisories adv
        SET root_cause_description = rca.root_cause_description, action_taken = rca.action_taken
        FROM rcas rca
        WHERE adv.id = rca.advisory_id
    """))

    # Drop new FK and tables
    op.drop_constraint('fk_alerts_hierarchy_nodes', 'alerts', type_='foreignkey')
    op.drop_index(op.f('ix_advisories_node_id'), table_name='advisories')
    op.drop_column('advisories', 'node_id')

    op.drop_index(op.f('ix_rcas_advisory_id'), table_name='rcas')
    op.drop_index(op.f('ix_rcas_id'), table_name='rcas')
    op.drop_table('rcas')
