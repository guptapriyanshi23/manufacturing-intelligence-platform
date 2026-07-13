import sys
import os
import random
from datetime import datetime, timedelta

# Add parent directory of 'backend' to sys.path to allow imports like 'backend.app...'
backend_parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_parent_dir not in sys.path:
    sys.path.insert(0, backend_parent_dir)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from backend.app.core.config import settings
from backend.app.models.alerts import Alert
from backend.app.models.advisories import Advisory
from backend.app.models.hierarchy import HierarchyNode, SensorMetadata

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(db_url)
SessionLocal = sessionmaker(bind=engine)

def seed_alerts_advisories():
    db = SessionLocal()
    try:
        # 1. Fetch sensor nodes from database
        sensors = db.query(HierarchyNode).filter(HierarchyNode.node_type == "sensor").all()
        if not sensors:
            print("No sensor nodes found. Please run seed_hierarchy.py first.")
            return

        # 2. Clear existing alerts and advisories to maintain cleanliness
        db.query(Alert).delete()
        db.query(Advisory).delete()
        db.commit()

        # 3. Create some realistic advisories for sensors
        advisories_seed = [
            {
                "name_type": "Bearing Temperature Warning",
                "desc": "Axis bearing temperature exceeded warning limit of 80°C. Machine is experiencing localized friction.",
                "severity": "warning",
                "status": "open"
            },
            {
                "name_type": "Spindle Vibration Critical",
                "desc": "Vibration intensity on the rotation spindle exceeded safety limit. Immediate inspection advised.",
                "severity": "critical",
                "status": "in_progress"
            },
            {
                "name_type": "Voltage Fluctuations Alert",
                "desc": "Supply voltage dropped below 18V threshold. Verify electrical connection lines.",
                "severity": "info",
                "status": "acknowledged"
            },
            {
                "name_type": "Coolant Flow Rate Low",
                "desc": "Coolant fluid level flow rate dropped. Spindle heat risk detected.",
                "severity": "warning",
                "status": "resolved"
            }
        ]

        # Seed 12 random advisories across the newly seeded sensors
        advisory_count = 0
        selected_sensors = random.sample(sensors, min(len(sensors), 12))
        
        for sensor in selected_sensors:
            # Find parent asset
            parent_asset = db.query(HierarchyNode).filter(HierarchyNode.id == sensor.parent_id).first()
            asset_name = parent_asset.display_name if parent_asset else "Unknown Asset"
            
            seed_data = advisories_seed[advisory_count % len(advisories_seed)]
            
            db_advisory = Advisory(
                sensor_id=sensor.sensor_metadata.sensor_id if sensor.sensor_metadata else None,
                sensor_name=sensor.display_name,
                asset=asset_name,
                severity=seed_data["severity"],
                description=seed_data["desc"],
                status=seed_data["status"],
                first_detected=datetime.utcnow() - timedelta(hours=random.randint(1, 24)),
                root_cause_description="Lube decay or loose bolts" if seed_data["status"] in ("resolved", "in_progress") else None,
                action_taken="Re-tightened mounts and re-lubricated bearings" if seed_data["status"] == "resolved" else None
            )
            db.add(db_advisory)
            advisory_count += 1

        # 4. Create matching alerts
        alerts_seed = [
            {
                "name": "Temperature Limit Overstep",
                "desc": "Measured temperature has spiked above the maximum safe parameter.",
                "condition": "temperature > 80",
                "threshold": 80.0,
                "severity": "critical",
                "status": "active"
            },
            {
                "name": "High Mechanical Vibration",
                "desc": "Vibrational G-force limits on the support spindle have exceeded standard bounds.",
                "condition": "vibration > 2.5",
                "threshold": 2.5,
                "severity": "warning",
                "status": "active"
            },
            {
                "name": "Electrical Arc Voltage Dip",
                "desc": "Voltage sag detected during welding operation. Risk of low-weld quality.",
                "condition": "voltage < 18",
                "threshold": 18.0,
                "severity": "info",
                "status": "acknowledged"
            }
        ]

        # Seed 20 random alerts across the newly seeded sensors
        alert_count = 0
        alert_sensors = random.sample(sensors, min(len(sensors), 20))
        
        for sensor in alert_sensors:
            # Find parent asset
            parent_asset = db.query(HierarchyNode).filter(HierarchyNode.id == sensor.parent_id).first()
            asset_name = parent_asset.display_name if parent_asset else "Unknown Asset"
            
            seed_data = alerts_seed[alert_count % len(alerts_seed)]
            
            db_alert = Alert(
                node_id=sensor.id,
                sensor_id=sensor.sensor_metadata.sensor_id if sensor.sensor_metadata else None,
                name=seed_data["name"],
                description=seed_data["desc"],
                asset_name=asset_name,
                sensor_name=sensor.display_name,
                condition=seed_data["condition"],
                threshold=seed_data["threshold"],
                severity=seed_data["severity"],
                message=seed_data["desc"],
                status=seed_data["status"],
                timestamp=datetime.utcnow() - timedelta(minutes=random.randint(10, 400))
            )
            db.add(db_alert)
            alert_count += 1

        db.commit()
        print(f"Successfully seeded {advisory_count} advisories and {alert_count} alerts.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding alerts/advisories: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_alerts_advisories()
