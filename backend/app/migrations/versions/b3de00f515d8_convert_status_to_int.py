"""convert_status_to_int

Revision ID: b3de00f515d8
Revises: 436626f0a70c
Create Date: 2026-07-22 18:45:26.130679

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b3de00f515d8'
down_revision: Union[str, None] = '436626f0a70c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Transform existing data in advisories table
    op.execute("UPDATE advisories SET status = '1' WHERE status = 'open'")
    op.execute("UPDATE advisories SET status = '2' WHERE status = 'acknowledged'")
    op.execute("UPDATE advisories SET status = '3' WHERE status = 'in_progress'")
    op.execute("UPDATE advisories SET status = '4' WHERE status = 'resolved'")
    op.execute("UPDATE advisories SET status = '1' WHERE status NOT IN ('1', '2', '3', '4') OR status IS NULL")

    # 2. Transform existing data in alerts table
    op.execute("UPDATE alerts SET status = '1' WHERE status IN ('active', 'Active')")
    op.execute("UPDATE alerts SET status = '2' WHERE status = 'acknowledged'")
    op.execute("UPDATE alerts SET status = '3' WHERE status IN ('resolved', 'Closed')")
    op.execute("UPDATE alerts SET status = '1' WHERE status NOT IN ('1', '2', '3') OR status IS NULL")

    # 3. Transform existing data in alert_rules table
    op.execute("UPDATE alert_rules SET status = '1' WHERE status IN ('active', 'Active')")
    op.execute("UPDATE alert_rules SET status = '2' WHERE status = 'acknowledged'")
    op.execute("UPDATE alert_rules SET status = '3' WHERE status IN ('resolved', 'Closed')")
    op.execute("UPDATE alert_rules SET status = '1' WHERE status NOT IN ('1', '2', '3') OR status IS NULL")

    # 4. Drop server defaults before altering types
    op.execute("ALTER TABLE advisories ALTER COLUMN status DROP DEFAULT")
    op.execute("ALTER TABLE alerts ALTER COLUMN status DROP DEFAULT")
    op.execute("ALTER TABLE alert_rules ALTER COLUMN status DROP DEFAULT")

    # 5. Alter column types to INTEGER
    op.execute("ALTER TABLE advisories ALTER COLUMN status TYPE INTEGER USING status::INTEGER")
    op.execute("ALTER TABLE alerts ALTER COLUMN status TYPE INTEGER USING status::INTEGER")
    op.execute("ALTER TABLE alert_rules ALTER COLUMN status TYPE INTEGER USING status::INTEGER")

    # 6. Set new integer-based server defaults
    op.execute("ALTER TABLE advisories ALTER COLUMN status SET DEFAULT 1")
    op.execute("ALTER TABLE alerts ALTER COLUMN status SET DEFAULT 1")
    op.execute("ALTER TABLE alert_rules ALTER COLUMN status SET DEFAULT 1")


def downgrade() -> None:
    # 1. Drop server defaults
    op.execute("ALTER TABLE advisories ALTER COLUMN status DROP DEFAULT")
    op.execute("ALTER TABLE alerts ALTER COLUMN status DROP DEFAULT")
    op.execute("ALTER TABLE alert_rules ALTER COLUMN status DROP DEFAULT")

    # 2. Alter column types back to VARCHAR
    op.execute("ALTER TABLE advisories ALTER COLUMN status TYPE VARCHAR USING status::VARCHAR")
    op.execute("ALTER TABLE alerts ALTER COLUMN status TYPE VARCHAR USING status::VARCHAR")
    op.execute("ALTER TABLE alert_rules ALTER COLUMN status TYPE VARCHAR USING status::VARCHAR")

    # 3. Revert integer values back to strings
    op.execute("UPDATE advisories SET status = 'open' WHERE status = '1'")
    op.execute("UPDATE advisories SET status = 'acknowledged' WHERE status = '2'")
    op.execute("UPDATE advisories SET status = 'in_progress' WHERE status = '3'")
    op.execute("UPDATE advisories SET status = 'resolved' WHERE status = '4'")

    op.execute("UPDATE alerts SET status = 'active' WHERE status = '1'")
    op.execute("UPDATE alerts SET status = 'acknowledged' WHERE status = '2'")
    op.execute("UPDATE alerts SET status = 'resolved' WHERE status = '3'")

    op.execute("UPDATE alert_rules SET status = 'Active' WHERE status = '1'")
    op.execute("UPDATE alert_rules SET status = 'acknowledged' WHERE status = '2'")
    op.execute("UPDATE alert_rules SET status = 'resolved' WHERE status = '3'")

    # 4. Set old server defaults
    op.execute("ALTER TABLE advisories ALTER COLUMN status SET DEFAULT 'open'")
    op.execute("ALTER TABLE alerts ALTER COLUMN status SET DEFAULT 'active'")
    op.execute("ALTER TABLE alert_rules ALTER COLUMN status SET DEFAULT 'Active'")
