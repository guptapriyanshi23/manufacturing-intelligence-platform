import time
import random
import sys
from datetime import datetime, timedelta, timezone
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


def generate_value(sensor_name):
    """
    Generate realistic mock telemetry values depending on sensor type
    """
    name = sensor_name.lower()
    if "temp" in name:
        return round(random.uniform(55.0, 85.0), 2)  # 55-85 °C
    elif "vib" in name:
        return round(random.uniform(0.8, 4.5), 2)   # 0.8-4.5 mm/s
    elif "hum" in name:
        return round(random.uniform(35.0, 65.0), 2)  # 35-65 %
    elif "press" in name or "prs" in name:
        return round(random.uniform(120.0, 160.0), 2) # 120-160 bar
    return round(random.uniform(10.0, 100.0), 2)


def generate_history(session, sensors, hours=24):
    """
    Pre-populate the database with historical data points for the last N hours
    """
    print(f"Generating {hours} hours of historical telemetry for {len(sensors)} sensors...")
    now = datetime.now(timezone.utc)
    start_time = now - timedelta(hours=hours)
    
    # 5-minute intervals
    interval = timedelta(minutes=5)
    current_time = start_time
    
    data_points = []
    
    while current_time <= now:
        for sensor in sensors:
            val = generate_value(sensor["name"])
            data_points.append({
                "timestamp": current_time,
                "sensor_id": sensor["id"],
                "sensor_name": sensor["name"],
                "value": val,
                "inserted_at": now
            })
        current_time += interval

    # Batch insert
    if data_points:
        try:
            session.execute(
                text(
                    "INSERT INTO sensor_telemetry (timestamp, sensor_id, sensor_name, value, inserted_at) "
                    "VALUES (:timestamp, :sensor_id, :sensor_name, :value, :inserted_at)"
                ),
                data_points
            )
            session.commit()
            print(f"Successfully inserted {len(data_points)} historical telemetry data points!")
        except Exception as e:
            session.rollback()
            print(f"Error during historical batch insert: {e}")


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


def stream_live_telemetry(session, sensors):
    """
    Infinite loop that streams live data points to the database
    """
    print(f"Starting live telemetry stream. Press CTRL+C to stop.")
    print("Streaming data for:")
    for s in sensors:
        print(f" - {s['id']} ({s['name']})")
    print("-" * 50)
    
    try:
        while True:
            now = datetime.now(timezone.utc)
            for sensor in sensors:
                val = generate_value(sensor["name"])
                
                session.execute(
                    text(
                        "INSERT INTO sensor_telemetry (timestamp, sensor_id, sensor_name, value, inserted_at) "
                        "VALUES (:timestamp, :sensor_id, :sensor_name, :value, :inserted_at)"
                    ),
                    {
                        "timestamp": now,
                        "sensor_id": sensor["id"],
                        "sensor_name": sensor["name"],
                        "value": val,
                        "inserted_at": now
                    }
                )
                print(f"[{now.strftime('%H:%M:%S')}] {sensor['id']} -> {val} {sensor['unit']}")
            
            session.commit()
            time.sleep(5)  # insert every 5 seconds
            
    except KeyboardInterrupt:
        print("\nStreaming stopped by user.")
    except Exception as e:
        print(f"Streaming error: {e}")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        # Auto-create the table if migrations have not been run
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS sensor_telemetry (
                timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
                sensor_id VARCHAR NOT NULL,
                sensor_name VARCHAR NOT NULL,
                value DOUBLE PRECISION NOT NULL,
                inserted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                PRIMARY KEY (timestamp, sensor_id)
            );
        """))
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS sensor_thresholds (
                sensor_id VARCHAR PRIMARY KEY,
                alarm_limit DOUBLE PRECISION,
                trip_limit DOUBLE PRECISION
            );
        """))
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS alerts (
                id SERIAL PRIMARY KEY,
                sensor_id VARCHAR,
                node_id INTEGER,
                severity VARCHAR NOT NULL,
                message VARCHAR NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'active',
                timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
        """))
        db.commit()

        # Eagerly convert to TimescaleDB hypertable if extension is active
        try:
            has_timescale = db.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'")).scalar()
            if has_timescale:
                db.execute(text("SELECT create_hypertable('sensor_telemetry', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);"))
                db.commit()
                print("TimescaleDB hypertable verified/created successfully.")
        except Exception as e:
            db.rollback()
            print(f"Note: Could not convert to TimescaleDB hypertable: {e}")
        
        active_sensors = get_active_sensors(db)
        
        # Seed thresholds and alerts
        seed_thresholds_and_alerts(db, active_sensors)
        
        # 1. Ask or default to generating 24h history
        generate_history(db, active_sensors, hours=24)
        
        # 2. Start live streaming
        stream_live_telemetry(db, active_sensors)
    finally:
        db.close()
