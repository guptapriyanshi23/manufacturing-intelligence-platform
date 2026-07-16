"""standardize_schema_and_enums

Revision ID: 436626f0a70c
Revises: 005
Create Date: 2026-07-16 16:39:35.736691

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '436626f0a70c'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Rename table 'rcas' to 'root_cause_analyses'
    op.rename_table('rcas', 'root_cause_analyses')
    
    # 2. Rename constraints and indices (to avoid Postgres naming mismatches)
    try:
        op.execute("ALTER TABLE root_cause_analyses RENAME CONSTRAINT rcas_pkey TO root_cause_analyses_pkey;")
    except Exception:
        pass
    try:
        op.execute("ALTER TABLE root_cause_analyses RENAME CONSTRAINT rcas_advisory_id_fkey TO root_cause_analyses_advisory_id_fkey;")
    except Exception:
        pass
    try:
        op.execute("ALTER INDEX ix_rcas_id RENAME TO ix_root_cause_analyses_id;")
    except Exception:
        pass
    try:
        op.execute("ALTER INDEX ix_rcas_advisory_id RENAME TO ix_root_cause_analyses_advisory_id;")
    except Exception:
        pass

    # 3. Alter Column status type to Enum (native_enum=False maps to VARCHAR with CHECK constraints)
    op.alter_column('root_cause_analyses', 'status',
               existing_type=sa.VARCHAR(),
               type_=sa.Enum('INITIATED', 'COMPLETED', name='rcastatus', native_enum=False),
               existing_nullable=False,
               existing_server_default=sa.text("'initiated'::character varying"))

    # 4. Alter Advisories columns
    op.add_column('advisories', sa.Column('detected_at', sa.DateTime(), nullable=True))
    # Copy data from first_detected to detected_at
    op.execute("UPDATE advisories SET detected_at = first_detected;")
    # Set to non-nullable
    op.alter_column('advisories', 'detected_at', nullable=False)
    
    op.alter_column('advisories', 'created_at',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               type_=sa.DateTime(),
               nullable=True,
               existing_server_default=sa.text('now()'))
    op.alter_column('advisories', 'updated_at',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               type_=sa.DateTime(),
               nullable=True,
               existing_server_default=sa.text('now()'))
    op.alter_column('advisories', 'status',
               existing_type=sa.VARCHAR(),
               type_=sa.Enum('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', name='advisorystatus', native_enum=False),
               existing_nullable=False,
               existing_server_default=sa.text("'open'::character varying"))
    
    op.create_index(op.f('ix_advisories_id'), 'advisories', ['id'], unique=False)
    op.drop_column('advisories', 'first_detected')

    # 5. Alter Alert Rules columns
    op.add_column('alert_rules', sa.Column('threshold', sa.Float(), nullable=True))
    op.execute("UPDATE alert_rules SET threshold = value;")
    
    op.add_column('alert_rules', sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()))
    op.add_column('alert_rules', sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.func.now()))
    
    op.execute("UPDATE alert_rules SET severity = '3' WHERE severity = 'warning';")
    op.execute("UPDATE alert_rules SET severity = '1' WHERE severity = 'critical';")
    op.execute("UPDATE alert_rules SET severity = '2' WHERE severity = 'high';")
    op.execute("UPDATE alert_rules SET severity = '4' WHERE severity = 'low';")
    op.execute("UPDATE alert_rules SET severity = '5' WHERE severity = 'info';")
    
    op.alter_column('alert_rules', 'severity',
               existing_type=sa.VARCHAR(),
               type_=sa.Integer(),
               postgresql_using="severity::integer",
               existing_nullable=False)
               
    op.create_foreign_key('alert_rules_node_id_fkey', 'alert_rules', 'hierarchy_nodes', ['node_id'], ['id'], ondelete='CASCADE')
    op.drop_column('alert_rules', 'sensor_id')
    op.drop_column('alert_rules', 'value')
    op.alter_column('alert_rules', 'status',
               existing_type=sa.VARCHAR(),
               type_=sa.Enum('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', name='alertstatus', native_enum=False),
               existing_nullable=False,
               existing_server_default=sa.text("'Active'::character varying"))

    # 6. Alter Alerts columns
    op.add_column('alerts', sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()))
    op.add_column('alerts', sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.func.now()))
    op.alter_column('alerts', 'status',
               existing_type=sa.VARCHAR(),
               type_=sa.Enum('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', name='alertstatus', native_enum=False),
               existing_nullable=False,
               existing_server_default=sa.text("'active'::character varying"))
    
    # Clean up redundant columns from ensure_alert_columns
    try:
        op.drop_column('alerts', 'asset_name')
    except Exception:
        pass
    try:
        op.drop_column('alerts', 'sensor_name')
    except Exception:
        pass

    # 7. Alter Users columns
    op.create_index(op.f('ix_permissions_name'), 'permissions', ['name'], unique=False)
    op.alter_column('users', 'created_at',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               type_=sa.DateTime(),
               existing_nullable=False,
               existing_server_default=sa.text('now()'))
    try:
        op.drop_constraint('users_email_key', 'users', type_='unique')
    except Exception:
        pass
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)


def downgrade() -> None:
    # 1. Revert Users columns
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.create_unique_constraint('users_email_key', 'users', ['email'])
    op.alter_column('users', 'created_at',
               existing_type=sa.DateTime(),
               type_=postgresql.TIMESTAMP(timezone=True),
               existing_nullable=False,
               existing_server_default=sa.text('now()'))
    op.drop_index(op.f('ix_permissions_name'), table_name='permissions')

    # 2. Revert Alerts columns
    op.add_column('alerts', sa.Column('sensor_name', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('alerts', sa.Column('asset_name', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.drop_column('alerts', 'updated_at')
    op.drop_column('alerts', 'created_at')
    op.alter_column('alerts', 'status',
               existing_type=sa.Enum('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', name='alertstatus', native_enum=False),
               type_=sa.VARCHAR(),
               existing_nullable=False,
               existing_server_default=sa.text("'active'::character varying"))

    # 3. Revert Alert Rules columns
    op.add_column('alert_rules', sa.Column('value', sa.Float(), autoincrement=False, nullable=True))
    op.add_column('alert_rules', sa.Column('sensor_id', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.drop_constraint('alert_rules_node_id_fkey', 'alert_rules', type_='foreignkey')
    op.alter_column('alert_rules', 'severity',
               existing_type=sa.Integer(),
               type_=sa.VARCHAR(),
               existing_nullable=False)
    op.drop_column('alert_rules', 'updated_at')
    op.drop_column('alert_rules', 'created_at')
    op.drop_column('alert_rules', 'threshold')
    op.alter_column('alert_rules', 'status',
               existing_type=sa.Enum('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', name='alertstatus', native_enum=False),
               type_=sa.VARCHAR(),
               existing_nullable=False,
               existing_server_default=sa.text("'Active'::character varying"))

    # 4. Revert Advisories columns
    op.add_column('advisories', sa.Column('first_detected', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False))
    op.execute("UPDATE advisories SET first_detected = detected_at;")
    op.drop_index(op.f('ix_advisories_id'), table_name='advisories')
    op.alter_column('advisories', 'updated_at',
               existing_type=sa.DateTime(),
               type_=postgresql.TIMESTAMP(timezone=True),
               nullable=False,
               existing_server_default=sa.text('now()'))
    op.alter_column('advisories', 'created_at',
               existing_type=sa.DateTime(),
               type_=postgresql.TIMESTAMP(timezone=True),
               nullable=False,
               existing_server_default=sa.text('now()'))
    op.alter_column('advisories', 'status',
               existing_type=sa.Enum('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', name='advisorystatus', native_enum=False),
               type_=sa.VARCHAR(),
               existing_nullable=False,
               existing_server_default=sa.text("'open'::character varying"))
    op.drop_column('advisories', 'detected_at')

    # 5. Revert table 'root_cause_analyses' to 'rcas'
    op.alter_column('root_cause_analyses', 'status',
               existing_type=sa.Enum('INITIATED', 'COMPLETED', name='rcastatus', native_enum=False),
               type_=sa.VARCHAR(),
               existing_nullable=False,
               existing_server_default=sa.text("'initiated'::character varying"))

    try:
        op.execute("ALTER INDEX ix_root_cause_analyses_advisory_id RENAME TO ix_rcas_advisory_id;")
    except Exception:
        pass
    try:
        op.execute("ALTER INDEX ix_root_cause_analyses_id RENAME TO ix_rcas_id;")
    except Exception:
        pass
    try:
        op.execute("ALTER TABLE root_cause_analyses RENAME CONSTRAINT root_cause_analyses_advisory_id_fkey TO rcas_advisory_id_fkey;")
    except Exception:
        pass
    try:
        op.execute("ALTER TABLE root_cause_analyses RENAME CONSTRAINT root_cause_analyses_pkey TO rcas_pkey;")
    except Exception:
        pass

    op.rename_table('root_cause_analyses', 'rcas')
