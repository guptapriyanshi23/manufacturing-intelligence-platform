import sys
import os
from datetime import datetime, timedelta, timezone

# Add parent directory of 'backend' to sys.path to allow imports like 'backend.app...'
backend_parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_parent_dir not in sys.path:
    sys.path.insert(0, backend_parent_dir)

import time
import random
import math
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 1. Retrieve connection string
# Try loading from backend settings config first
try:
    from backend.app.core.config import settings
    db_url = settings.DATABASE_URL
except ImportError:
    import os
    db_url = os.getenv("DATABASE_URL")

if not db_url:
    print("Error: DATABASE_URL is not set. Please set the environment variable or configure a .env file.")
    sys.exit(1)

# Handle asyncpg scheme conversion
if db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

print(f"Connecting to database: {db_url.split('@')[-1]}")
engine = create_engine(db_url)
SessionLocal = sessionmaker(bind=engine)


def get_active_sensors(session):
    """
    Fetch actual sensors defined in the hierarchy_nodes tables to make mock telemetry realistic.
    Falls back to a default list if none exist.
    """
    try:
        # Query sensor nodes and join their metadata
        result = session.execute(text(
            "SELECT n.name, s.sensor_id, s.unit FROM hierarchy_nodes n "
            "JOIN sensor_metadata s ON n.id = s.node_id WHERE n.node_type = 'sensor'"
        )).fetchall()
        
        if result:
            sensors = []
            for row in result:
                sensors.append({
                    "id": row[1],
                    "name": row[0],
                    "unit": row[2] or "units"
                })
            return sensors
    except Exception as e:
        print(f"Warning: Could not query active sensors: {e}. Using fallback defaults.")
        
    return [
        {"id": "SEN-TMP-001", "name": "bearing_temperature", "unit": "°C"},
        {"id": "SEN-VIB-002", "name": "spindle_vibration", "unit": "mm/s"},
        {"id": "SEN-HUM-003", "name": "kiln_humidity", "unit": "%RH"},
        {"id": "SEN-PRS-004", "name": "hydraulic_pressure", "unit": "bar"}
    ]


def generate_value(sensor_name, timestamp):
    """
    Generate realistic mock telemetry values with sine wave baseline, noise, and occasional spikes.
    """
    name = sensor_name.lower()
    epoch = timestamp.timestamp()
    
    # 1. Base sine wave pattern (diurnal cycle: 24h = 86400 seconds)
    sine = math.sin(2 * math.pi * epoch / 86400)
    
    # 2. Occasional spike window: 2-minute duration spike window every hour
    is_spike = (int(epoch) % 3600 < 120) and (random.random() < 0.3)

    if "temp" in name:
        base = 70.0 + 10.0 * sine + random.uniform(-1.5, 1.5)
        val = base * 1.3 if is_spike else base
        return round(val, 2)
    elif "vib" in name:
        base = 2.0 + 0.8 * sine + random.uniform(-0.15, 0.15)
        val = base * 3.5 if is_spike else base
        return round(val, 2)
    elif "hum" in name:
        base = 50.0 + 8.0 * sine + random.uniform(-2.0, 2.0)
        val = base * 1.4 if is_spike else base
        return round(val, 2)
    elif "press" in name or "prs" in name:
        base = 140.0 + 15.0 * sine + random.uniform(-3.0, 3.0)
        val = base * 1.25 if is_spike else base
        return round(val, 2)
        
    base = 50.0 + 15.0 * sine + random.uniform(-2.0, 2.0)
    val = base * 1.5 if is_spike else base
    return round(val, 2)


def generate_history(session, sensors, hours=24):
    """
    Pre-populate the database with historical data points for the last N hours
    """
    print(f"Generating {hours} hours of historical telemetry for {len(sensors)} sensors...")
    now = datetime.now(timezone.utc)
    start_time = now - timedelta(hours=hours)
    
    n_sensors = len(sensors)
    if n_sensors == 0:
        return
        
    # Calculate interval per sensor to yield exactly 10 points per minute per sensor
    interval_seconds = 6.0
    interval = timedelta(seconds=interval_seconds)
    current_time = start_time
    
    data_points = []
    
    while current_time <= now:
        for sensor in sensors:
            val = generate_value(sensor["name"], current_time)
            data_points.append({
                "timestamp": current_time,
                "sensor_id": sensor["id"],
                "sensor_name": sensor["name"],
                "value": val,
                "inserted_at": now
            })
        current_time += interval

    # Batch insert in chunks of 1000 to prevent memory pressure, packet size limits, or server timeouts
    if data_points:
        chunk_size = 1000
        for i in range(0, len(data_points), chunk_size):
            chunk = data_points[i:i+chunk_size]
            try:
                session.execute(
                    text(
                        "INSERT INTO sensor_telemetry (timestamp, sensor_id, sensor_name, value, inserted_at) "
                        "VALUES (:timestamp, :sensor_id, :sensor_name, :value, :inserted_at) "
                        "ON CONFLICT (timestamp, sensor_id) DO NOTHING"
                    ),
                    chunk
                )
                session.commit()
                print(f"Inserted chunk {i // chunk_size + 1}/{math.ceil(len(data_points) / chunk_size)} ({len(chunk)} points)...")
            except Exception as e:
                session.rollback()
                print(f"Error during historical batch insert chunk: {e}")


def seed_thresholds_and_alerts(db, sensors):
    """
    Seed alarm & trip limits and insert mock alert logs if not present.
    """
    print("Seeding sensor thresholds and mock alerts...")
    for s in sensors:
        name = s["name"].lower()
        # Default thresholds
        alarm_limit = 80.0
        trip_limit = 95.0
        
        if "temp" in name:
            alarm_limit = 80.0
            trip_limit = 95.0
        elif "vib" in name:
            alarm_limit = 5.0
            trip_limit = 8.0
        elif "hum" in name:
            alarm_limit = 70.0
            trip_limit = 85.0
        elif "press" in name or "prs" in name:
            alarm_limit = 150.0
            trip_limit = 175.0
        
        db.execute(text("""
            INSERT INTO sensor_thresholds (sensor_id, alarm_limit, trip_limit)
            VALUES (:sensor_id, :alarm_limit, :trip_limit)
            ON CONFLICT (sensor_id) DO NOTHING
        """), {
            "sensor_id": s["id"],
            "alarm_limit": alarm_limit,
            "trip_limit": trip_limit
        })
    
    # Seed mock alerts if none exist
    has_alerts = db.execute(text("SELECT 1 FROM alerts LIMIT 1")).scalar()
    if not has_alerts:
        now = datetime.now(timezone.utc)
        mock_alerts = [
            {
                "sensor_id": sensors[0]["id"] if sensors else "SEN-TMP-001",
                "node_id": 1,
                "severity": "critical",
                "message": f"Critical threshold breach on {sensors[0]['name'] if sensors else 'Bearing'}",
                "status": "active",
                "timestamp": now - timedelta(minutes=15)
            },
            {
                "sensor_id": sensors[1]["id"] if len(sensors) > 1 else "SEN-VIB-002",
                "node_id": 2,
                "severity": "warning",
                "message": f"Vibration anomaly warning on {sensors[1]['name'] if len(sensors) > 1 else 'Spindle'}",
                "status": "active",
                "timestamp": now - timedelta(hours=1)
            }
        ]
        db.execute(text("""
            INSERT INTO alerts (sensor_id, node_id, severity, message, status, timestamp)
            VALUES (:sensor_id, :node_id, :severity, :message, :status, :timestamp)
        """), mock_alerts)
        
    db.commit()


def seed_advisories(db, sensors):
    """
    Seed mock advisories if the advisories table is empty.
    """
    has_advisories = db.execute(text("SELECT 1 FROM advisories LIMIT 1")).scalar()
    if not has_advisories:
        print("Seeding mock advisories...")
        now = datetime.now(timezone.utc)
        
        mock_advisories = []
        for s in sensors:
            sensor_id = s["id"]
            sensor_name = s["name"]
            
            # Find the display name of the ancestor asset node dynamically
            asset_display_name = None
            try:
                asset_res = db.execute(text("""
                    WITH RECURSIVE ancestor AS (
                        SELECT id, parent_id, node_type, display_name
                        FROM hierarchy_nodes
                        WHERE name = :sensor_name
                        UNION ALL
                        SELECT n.id, n.parent_id, n.node_type, n.display_name
                        FROM hierarchy_nodes n
                        JOIN ancestor a ON n.id = a.parent_id
                    )
                    SELECT display_name FROM ancestor WHERE node_type = 'asset' LIMIT 1;
                """), {"sensor_name": sensor_name}).scalar()
                if asset_res:
                    asset_display_name = asset_res
            except Exception as e:
                print(f"Warning: Could not query asset ancestor for {sensor_name}: {e}")
                
            if not asset_display_name:
                asset_display_name = "Pump / Filler"  # Fallback asset name
                
            # Create a relevant advisory based on the sensor type
            s_name_lower = sensor_name.lower()
            if "temp" in s_name_lower:
                mock_advisories.append({
                    "sensor_id": sensor_id,
                    "sensor_name": sensor_name,
                    "asset": asset_display_name,
                    "severity": "critical",
                    "description": f"Bearing temperature on sensor {sensor_id} has trended 44% above the twin baseline over the last 6 hours — consistent with advancing bearing wear. Severity has escalated S4 → S3 → S2 → S1 as the deviation sustained. The legacy 85°C alarm is only now starting to fire — the twin flagged this a full 6 hours earlier, well ahead of the 95°C trip limit.",
                    "first_detected": now - timedelta(hours=6),
                    "status": "open",
                    "image_path": None,
                    "root_cause_description": None,
                    "action_taken": None,
                    "created_at": now - timedelta(hours=6),
                    "updated_at": now - timedelta(hours=6)
                })
            elif "press" in s_name_lower or "prs" in s_name_lower or "unique" in sensor_id.lower() or "new_1" in s_name_lower:
                mock_advisories.append({
                    "sensor_id": sensor_id,
                    "sensor_name": sensor_name,
                    "asset": asset_display_name,
                    "severity": "warning",
                    "description": f"Sensor {sensor_id} ({sensor_name}) pressure profile indicates a minor 1.5 bar drop over the last 24 hours. We recommend scheduled greasing and gasket inspection within the next 48 production hours to avoid seal failure.",
                    "first_detected": now - timedelta(days=1),
                    "status": "open",
                    "image_path": None,
                    "root_cause_description": None,
                    "action_taken": None,
                    "created_at": now - timedelta(days=1),
                    "updated_at": now - timedelta(days=1)
                })
            else:
                mock_advisories.append({
                    "sensor_id": sensor_id,
                    "sensor_name": sensor_name,
                    "asset": asset_display_name,
                    "severity": "info",
                    "description": f"Measurement anomaly detected on sensor {sensor_id} ({sensor_name}). The signal variance has increased by 15% over the baseline. Monitor for further deviation.",
                    "first_detected": now - timedelta(days=2),
                    "status": "open",
                    "image_path": None,
                    "root_cause_description": None,
                    "action_taken": None,
                    "created_at": now - timedelta(days=2),
                    "updated_at": now - timedelta(days=2)
                })
                
        if mock_advisories:
            db.execute(text("""
                INSERT INTO advisories (sensor_id, sensor_name, asset, severity, description, first_detected, status, image_path, root_cause_description, action_taken, created_at, updated_at)
                VALUES (:sensor_id, :sensor_name, :asset, :severity, :description, :first_detected, :status, :image_path, :root_cause_description, :action_taken, :created_at, :updated_at)
            """), mock_advisories)
            db.commit()


def seed_users_and_permissions(db):
    """
    Seed default users and permissions if tables are empty.
    """
    # 1. Seed Permissions
    has_perms = db.execute(text("SELECT 1 FROM permissions LIMIT 1")).scalar()
    if not has_perms:
        print("Seeding permissions...")
        perms = [
            {"name": "alerts:view", "description": "Permission to view alerts page"},
            {"name": "dashboard:view", "description": "Permission to view dashboard page"},
            {"name": "advisories:view", "description": "Permission to view system advisories"},
            {"name": "advisories:acknowledge", "description": "Permission to acknowledge advisories"},
            {"name": "advisories:rca", "description": "Permission to view/perform root cause analysis"},
            {"name": "reports:view", "description": "Permission to view reports page"},
            {"name": "admin:view", "description": "Permission to view administration page"}
        ]
        db.execute(text("""
            INSERT INTO permissions (name, description)
            VALUES (:name, :description)
        """), perms)
        db.commit()

    # 2. Seed Users
    has_users = db.execute(text("SELECT 1 FROM users LIMIT 1")).scalar()
    if not has_users:
        print("Seeding users...")
        from backend.app.core.security import hash_password
        
        users = [
            {"email": "admin@deloitte.com", "hashed_password": hash_password("adminpass"), "is_active": True, "created_at": datetime.now(timezone.utc)},
            {"email": "operator@deloitte.com", "hashed_password": hash_password("operatorpass"), "is_active": True, "created_at": datetime.now(timezone.utc)},
            {"email": "viewer@deloitte.com", "hashed_password": hash_password("viewerpass"), "is_active": True, "created_at": datetime.now(timezone.utc)}
        ]
        
        # Insert users
        for u in users:
            db.execute(text("""
                INSERT INTO users (email, hashed_password, is_active, created_at)
                VALUES (:email, :hashed_password, :is_active, :created_at)
            """), u)
        db.commit()

        # Fetch IDs to assign user permissions
        admin_id = db.execute(text("SELECT id FROM users WHERE email = 'admin@deloitte.com'")).scalar()
        operator_id = db.execute(text("SELECT id FROM users WHERE email = 'operator@deloitte.com'")).scalar()
        viewer_id = db.execute(text("SELECT id FROM users WHERE email = 'viewer@deloitte.com'")).scalar()

        # Admin permissions: all of them
        all_perms = ["alerts:view", "dashboard:view", "advisories:view", "advisories:acknowledge", "advisories:rca", "reports:view", "admin:view"]
        admin_mappings = [{"user_id": admin_id, "permission_name": p} for p in all_perms]

        # Operator permissions
        operator_perms = ["alerts:view", "dashboard:view", "advisories:view", "advisories:acknowledge", "advisories:rca"]
        operator_mappings = [{"user_id": operator_id, "permission_name": p} for p in operator_perms]

        # Viewer permissions
        viewer_perms = ["dashboard:view", "advisories:view", "reports:view"]
        viewer_mappings = [{"user_id": viewer_id, "permission_name": p} for p in viewer_perms]

        all_mappings = admin_mappings + operator_mappings + viewer_mappings
        db.execute(text("""
            INSERT INTO user_permissions (user_id, permission_name)
            VALUES (:user_id, :permission_name)
        """), all_mappings)
        db.commit()
        print("Successfully seeded users, permissions, and mappings!")




def stream_live_telemetry(session, sensors):
    """
    Infinite loop that streams live data points to the database at 100 points/minute
    """
    print(f"Starting live telemetry stream (100 points/min total). Press CTRL+C to stop.")
    N = len(sensors)
    if N == 0:
        return
    
    current_session = session
    index = 0
    while True:
        try:
            while True:
                now = datetime.now(timezone.utc)
                sensor = sensors[index]
                val = generate_value(sensor["name"], now)
                
                current_session.execute(
                    text(
                        "INSERT INTO sensor_telemetry (timestamp, sensor_id, sensor_name, value, inserted_at) "
                        "VALUES (:timestamp, :sensor_id, :sensor_name, :value, :inserted_at) "
                        "ON CONFLICT (timestamp, sensor_id) DO NOTHING"
                    ),
                    {
                        "timestamp": now,
                        "sensor_id": sensor["id"],
                        "sensor_name": sensor["name"],
                        "value": val,
                        "inserted_at": now
                    }
                )
                current_session.commit()
                print(f"[{now.strftime('%H:%M:%S')}] {sensor['id']} -> {val} {sensor['unit']}")
                
                index = (index + 1) % N
                time.sleep(0.6) # 0.6 seconds sleep = 100 points per minute total
                
        except KeyboardInterrupt:
            print("\nLive streaming stopped by user.")
            break
        except Exception as e:
            print(f"Streaming error: {e}")
            print("Database connection lost or error occurred. Retrying connection in 5 seconds...")
            try:
                current_session.rollback()
            except Exception:
                pass
            try:
                current_session.close()
            except Exception:
                pass
            time.sleep(5)
            current_session = SessionLocal()
            print("Reconnected to database. Resuming stream...")


def seed_alerts(db):
    from backend.app.modules.alerts.service import ensure_alert_columns
    from backend.app.models.alerts import Alert

    # Ensure all new columns exist in the database table
    ensure_alert_columns(db)

    # Check if alerts are already seeded
    try:
        if db.query(Alert).count() > 0:
            return
    except Exception as e:
        print(f"Error checking alerts count: {e}. Attempting to run column migration first...")
        db.rollback()
        ensure_alert_columns(db)
        if db.query(Alert).count() > 0:
            return

    mock_alerts = [
        {
            "node_id": 3,
            "sensor_id": "SEN-TEMP-842",
            "name": "Spindle Overheating",
            "description": "Bearing temperature exceeded normal operating limit of 80°C.",
            "asset_name": "CNC Milling Center A",
            "sensor_name": "Spindle Temperature Sensor",
            "condition": "bearing_temperature > 80",
            "threshold": 80.0,
            "severity": "critical",
            "status": "active",
        },
        {
            "node_id": 3,
            "sensor_id": "SEN-VIB-911",
            "name": "High Axis Vibration",
            "description": "Vibration levels on the Y-Axis exceeded warning threshold of 2.5 mm/s².",
            "asset_name": "CNC Milling Center A",
            "sensor_name": "Spindle Vibration Y-Axis",
            "condition": "spindle_vibration > 2.5",
            "threshold": 2.5,
            "severity": "warning",
            "status": "active",
        },
        {
            "node_id": 6,
            "sensor_id": "SEN-VOLT-402",
            "name": "Voltage Sag Detected",
            "description": "Arc voltage dropped below 18V during active weld.",
            "asset_name": "Robotic Welder Cell 7",
            "sensor_name": "Welding Power Arc Voltage",
            "condition": "arc_voltage < 18",
            "threshold": 18.0,
            "severity": "info",
            "status": "acknowledged",
        },
    ]

    for ma in mock_alerts:
        db_alert = Alert(
            node_id=ma["node_id"],
            sensor_id=ma["sensor_id"],
            name=ma["name"],
            description=ma["description"],
            asset_name=ma["asset_name"],
            sensor_name=ma["sensor_name"],
            condition=ma["condition"],
            threshold=ma["threshold"],
            severity=ma["severity"],
            status=ma["status"],
            message=ma["description"] # Keep message for compatibility
        )
        db.add(db_alert)
    db.commit()
    print("Alerts table successfully seeded with mock entries.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        # # Auto-create the table if migrations have not been run
        # db.execute(text("""
        #     CREATE TABLE IF NOT EXISTS sensor_telemetry (
        #         timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        #         sensor_id VARCHAR NOT NULL,
        #         sensor_name VARCHAR NOT NULL,
        #         value DOUBLE PRECISION NOT NULL,
        #         inserted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        #         PRIMARY KEY (timestamp, sensor_id)
        #     );
        # """))
        # db.execute(text("""
        #     CREATE TABLE IF NOT EXISTS sensor_thresholds (
        #         sensor_id VARCHAR PRIMARY KEY,
        #         alarm_limit DOUBLE PRECISION,
        #         trip_limit DOUBLE PRECISION
        #     );
        # """))
        # db.execute(text("""
        #     CREATE TABLE IF NOT EXISTS alerts (
        #         id SERIAL PRIMARY KEY,
        #         sensor_id VARCHAR,
        #         node_id INTEGER,
        #         severity VARCHAR NOT NULL,
        #         message VARCHAR NOT NULL,
        #         status VARCHAR NOT NULL DEFAULT 'active',
        #         timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        #     );
        # """))
        # db.execute(text("DROP TABLE IF EXISTS user_hierarchy_permissions CASCADE;"))
        # db.execute(text("DROP TABLE IF EXISTS user_permissions CASCADE;"))
        # db.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
        # db.execute(text("DROP TABLE IF EXISTS permissions CASCADE;"))
        # db.execute(text("DROP TABLE IF EXISTS advisories CASCADE;"))
        # db.commit()
        # db.execute(text("""
        #     CREATE TABLE IF NOT EXISTS users (
        #         id SERIAL PRIMARY KEY,
        #         email VARCHAR UNIQUE NOT NULL,
        #         hashed_password VARCHAR NOT NULL,
        #         is_active BOOLEAN NOT NULL DEFAULT TRUE,
        #         created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        #     );
        # """))
        # db.execute(text("""
        #     CREATE TABLE IF NOT EXISTS permissions (
        #         name VARCHAR PRIMARY KEY,
        #         description VARCHAR
        #     );
        # """))
        # db.execute(text("""
        #     CREATE TABLE IF NOT EXISTS user_permissions (
        #         user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        #         permission_name VARCHAR REFERENCES permissions(name) ON DELETE CASCADE,
        #         PRIMARY KEY (user_id, permission_name)
        #     );
        # """))
        # db.execute(text("""
        #     CREATE TABLE IF NOT EXISTS user_hierarchy_permissions (
        #         user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        #         node_id INTEGER REFERENCES hierarchy_nodes(id) ON DELETE CASCADE,
        #         PRIMARY KEY (user_id, node_id)
        #     );
        # """))
        # db.execute(text("""
        #     CREATE TABLE IF NOT EXISTS advisories (
        #         id SERIAL PRIMARY KEY,
        #         sensor_id VARCHAR,
        #         sensor_name VARCHAR,
        #         asset VARCHAR NOT NULL,
        #         severity VARCHAR NOT NULL,
        #         description VARCHAR NOT NULL,
        #         first_detected TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        #         status VARCHAR NOT NULL DEFAULT 'open',
        #         image_path VARCHAR,
        #         root_cause_description VARCHAR,
        #         action_taken VARCHAR,
        #         created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        #         updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        #     );
        # """))
        # db.commit()
 
        # # Eagerly convert to TimescaleDB hypertable if extension is active
        # try:
        #     has_timescale = db.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'")).scalar()
        #     if has_timescale:
        #         db.execute(text("SELECT create_hypertable('sensor_telemetry', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);"))
        #         db.commit()
        #         print("TimescaleDB hypertable verified/created successfully.")
        # except Exception as e:
        #     db.rollback()
        #     print(f"Note: Could not convert to TimescaleDB hypertable: {e}")
        
        active_sensors = get_active_sensors(db)
        
        # Seed alerts
        seed_alerts(db)
        
        # 1. Generate 48h (2 days) historical data
        # generate_history(db, active_sensors, hours=48)
        
        # 2. Start live streaming
        # stream_live_telemetry(db, active_sensors)
    finally:
        db.close()
