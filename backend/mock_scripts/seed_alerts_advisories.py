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
from backend.app.models.advisories import Advisory, RCA
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

        # 2. Clear existing alerts, advisories and RCAs to maintain cleanliness
        db.query(RCA).delete()
        db.query(Alert).delete()
        db.query(Advisory).delete()
        db.commit()

        # 3. Create matching alerts and advisories pairs
        pairs_seed = [
            {
                "name": "Temperature Limit Overstep",
                "desc": "Axis bearing temperature exceeded warning limit of 80°C. Machine is experiencing localized friction. Spindle heat risk detected.",
                "condition": "temperature > 80",
                "threshold": 80.0,
                "severity": 1, # critical
                "status": "open",
                "advisory_desc": "Bearing temperature on sensor has trended 44% above the twin baseline over the last 6 hours — consistent with advancing bearing wear. Severity has escalated S4 → S3 → S2 → S1 as the deviation sustained. The legacy 85°C alarm is only now starting to fire — the twin flagged this a full 6 hours earlier, well ahead of the 95°C trip limit."
            },
            {
                "name": "High Mechanical Vibration",
                "desc": "Vibration intensity on the rotation spindle exceeded safety limit. Immediate inspection advised.",
                "condition": "vibration > 2.5",
                "threshold": 2.5,
                "severity": 3, # warning
                "status": "in_progress",
                "advisory_desc": "Vibration profile indicates a minor alignment issue. Spindle mechanical variance has increased by 15% over the baseline. We recommend scheduled greasing and spindle mounting inspection within the next 48 production hours to avoid coupling wear."
            },
            {
                "name": "Electrical Arc Voltage Dip",
                "desc": "Supply voltage dropped below 18V threshold. Verify electrical connection lines.",
                "condition": "voltage < 18",
                "threshold": 18.0,
                "severity": 5, # info
                "status": "acknowledged",
                "advisory_desc": "Supply voltage dropped below 18V threshold. Voltage sag detected during welding operation. Risk of low-weld quality. Verify electrical transformer connection lines."
            },
            {
                "name": "Coolant Flow Rate Anomaly",
                "desc": "Coolant fluid level flow rate dropped. Spindle heat risk detected.",
                "condition": "flow_rate < 5.0",
                "threshold": 5.0,
                "severity": 3, # warning
                "status": "resolved",
                "advisory_desc": "Coolant flow rate sagged below safety baseline threshold. Spindle cooling efficiency has degraded. System resolved after backup coolant pump cycle initiated."
            }
        ]

        # Seed pairs across all sensors (to guarantee each alert has a matching detailed advisory)
        seed_count = 0
        for sensor in sensors:
            seed_data = pairs_seed[seed_count % len(pairs_seed)]
            
            # Seed Advisory
            db_advisory = Advisory(
                node_id=sensor.id,
                severity=seed_data["severity"],
                description=seed_data["advisory_desc"],
                status=seed_data["status"],
                detected_at=datetime.utcnow() - timedelta(hours=random.randint(1, 24))
            )
            db.add(db_advisory)
            db.flush() # Populates db_advisory.id

            # Seed RCA if resolved/in_progress
            if seed_data["status"] in ("resolved", "in_progress"):
                db_rca = RCA(
                    advisory_id=db_advisory.id,
                    root_cause_description="Lube decay or loose bolts",
                    action_taken="Re-tightened mounts and re-lubricated bearings" if seed_data["status"] == "resolved" else None,
                    status="completed" if seed_data["status"] == "resolved" else "initiated"
                )
                db.add(db_rca)

            # Seed matching Alert
            db_alert = Alert(
                node_id=sensor.id,
                name=seed_data["name"],
                description=seed_data["desc"],
                condition=seed_data["condition"],
                threshold=seed_data["threshold"],
                severity=seed_data["severity"],
                message=seed_data["desc"],
                status="active" if seed_data["status"] in ("open", "in_progress") else ("acknowledged" if seed_data["status"] == "acknowledged" else "resolved"),
                timestamp=db_advisory.detected_at
            )
            db.add(db_alert)
            seed_count += 1

        db.commit()
        print(f"Successfully seeded {seed_count} matching pairs of alerts and advisories.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding alerts/advisories: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_alerts_advisories()
