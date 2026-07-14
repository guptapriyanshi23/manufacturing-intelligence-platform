import sys
import os
import time
import math
import random
from datetime import datetime, timedelta, timezone

# Load backend/.env file to ensure DATABASE_URL is available
from dotenv import load_dotenv
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(backend_dir, ".env"))

# Add parent directory of 'backend' to sys.path to allow imports like 'backend.app...'
backend_parent_dir = os.path.dirname(backend_dir)
if backend_parent_dir not in sys.path:
    sys.path.insert(0, backend_parent_dir)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from backend.app.core.config import settings
from backend.app.models.hierarchy import HierarchyNode

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(db_url)
SessionLocal = sessionmaker(bind=engine)

def get_active_sensors(session):
    try:
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
    ]

def generate_value(sensor_name, timestamp):
    name = sensor_name.lower()
    epoch = timestamp.timestamp()
    
    # 1. Base sine wave pattern
    sine = math.sin(2 * math.pi * epoch / 86400)
    
    # 2. Occasional spike window
    is_spike = (int(epoch) % 3600 < 120) and (random.random() < 0.3)

    if "temp" in name:
        base = 70.0 + 10.0 * sine + random.uniform(-1.5, 1.5)
        val = base * 1.3 if is_spike else base
        return round(val, 2)
    elif "vib" in name:
        base = 2.0 + 0.8 * sine + random.uniform(-0.15, 0.15)
        val = base * 3.5 if is_spike else base
        return round(val, 2)
    elif "volt" in name:
        base = 24.0 + 2.0 * sine + random.uniform(-0.5, 0.5)
        val = base * 0.7 if is_spike else base
        return round(val, 2)
    elif "hum" in name:
        base = 50.0 + 8.0 * sine + random.uniform(-2.0, 2.0)
        val = base * 1.4 if is_spike else base
        return round(val, 2)
    
    base = 50.0 + 15.0 * sine + random.uniform(-2.0, 2.0)
    val = base * 1.5 if is_spike else base
    return round(val, 2)

def generate_history(session, sensors, hours=1):
    if hours <= 0:
        print("Skipping historical telemetry generation.")
        return
        
    print(f"Generating {hours} hours of historical telemetry for {len(sensors)} sensors...")
    now = datetime.now(timezone.utc)
    start_time = now - timedelta(hours=hours)
    
    n_sensors = len(sensors)
    if n_sensors == 0:
        return
        
    # Generate 1 point every 2 minutes per sensor for history to stay lightweight
    interval_seconds = 120.0
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

    if data_points:
        chunk_size = 100
        total_chunks = math.ceil(len(data_points) / chunk_size)
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
                print(f"Inserted history chunk {i // chunk_size + 1}/{total_chunks} ({len(chunk)} points)...")
                time.sleep(0.05)  # Let the database breathe
            except Exception as e:
                session.rollback()
                print(f"Error during historical batch insert chunk: {e}")

def stream_live_telemetry(session, sensors, rates_config=None):
    if rates_config is None:
        rates_config = {"unique": 100.0, "temp_1": 100.0}

    matched_sensors = []
    sensor_intervals = {}

    for sensor in sensors:
        sid = sensor["id"]
        sname = sensor["name"]
        
        # Check if matches any pattern in rates_config
        matched_pattern = None
        for pattern in rates_config:
            if pattern.lower() in sid.lower() or pattern.lower() in sname.lower():
                matched_pattern = pattern
                break
                
        if matched_pattern:
            ppm = rates_config[matched_pattern]
            # rate in PPM -> interval in seconds is 60.0 / ppm
            interval = 60.0 / ppm
            matched_sensors.append(sensor)
            sensor_intervals[sid] = interval

    if not matched_sensors:
        print("No active sensors matched the specified streaming patterns.")
        return

    print(f"Starting live streaming telemetry for {len(matched_sensors)} sensors (Ctrl+C to exit)...")
    for s in matched_sensors:
        interval = sensor_intervals[s["id"]]
        print(f"  - {s['name']} ({s['id']}): rate = {60.0/interval:.1f} PPM (every {interval:.3f}s)")

    last_run = {s["id"]: 0.0 for s in matched_sensors}

    current_session = session
    while True:
        try:
            while True:
                now_time = time.time()
                now_dt = datetime.fromtimestamp(now_time, tz=timezone.utc)
                
                for sensor in matched_sensors:
                    sid = sensor["id"]
                    interval = sensor_intervals[sid]
                    
                    if now_time - last_run[sid] >= interval:
                        val = generate_value(sensor["name"], now_dt)
                        current_session.execute(
                            text(
                                "INSERT INTO sensor_telemetry (timestamp, sensor_id, sensor_name, value, inserted_at) "
                                "VALUES (:timestamp, :sensor_id, :sensor_name, :value, :inserted_at) "
                                "ON CONFLICT (timestamp, sensor_id) DO UPDATE SET value = EXCLUDED.value, inserted_at = EXCLUDED.inserted_at"
                            ),
                            {
                                "timestamp": now_dt,
                                "sensor_id": sid,
                                "sensor_name": sensor["name"],
                                "value": val,
                                "inserted_at": now_dt
                            }
                        )
                        current_session.commit()
                        print(f"[{now_dt.strftime('%H:%M:%S')}] {sid} -> {val} {sensor['unit']}")
                        last_run[sid] = now_time
                
                time.sleep(0.01)  # small sleep for responsiveness and fast rates
                
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
            # Recreate session
            current_session = SessionLocal()
            print("Reconnected to database. Resuming stream...")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        sensors = get_active_sensors(db)
        
        # Parse arguments manually to keep compatibility with positional history_hours
        history_hours = 1
        rates_config = {"unique": 100.0, "temp_1": 100.0}
        
        args = sys.argv[1:]
        if args and not args[0].startswith("-"):
            try:
                history_hours = int(args[0])
                args = args[1:]
            except ValueError:
                pass
                
        import argparse
        parser = argparse.ArgumentParser(description="Stream mock telemetry data to database.")
        parser.add_argument(
            "--sensors", 
            type=str, 
            default="unique:100,temp_1:100",
            help="Comma-separated pattern:rate_ppm pairs, e.g. unique:100,temp_1:100"
        )
        
        parsed_args, unknown = parser.parse_known_args(args)
        
        if parsed_args.sensors:
            rates_config = {}
            for part in parsed_args.sensors.split(","):
                if ":" in part:
                    pattern, rate_str = part.split(":", 1)
                    try:
                        rates_config[pattern.strip()] = float(rate_str.strip())
                    except ValueError:
                        print(f"Warning: Invalid rate for sensor pattern '{pattern}': {rate_str}")
                else:
                    rates_config[part.strip()] = 10.0 # default to 10 PPM
        
        generate_history(db, sensors, hours=history_hours)
        stream_live_telemetry(db, sensors, rates_config=rates_config)
    finally:
        db.close()
