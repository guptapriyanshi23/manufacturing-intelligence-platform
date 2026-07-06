from typing import List
from sqlalchemy.orm import Session
from backend.app.models.alerts import Alert
from backend.app.modules.alerts.schemas import AlertCreate

def get_alerts(db: Session) -> List[Alert]:
    return db.query(Alert).order_by(Alert.timestamp.desc()).all()

def create_alert(db: Session, alert_in: AlertCreate) -> Alert:
    db_alert = Alert(
        node_id=alert_in.node_id,
        sensor_id=alert_in.sensor_id,
        severity=alert_in.severity,
        message=alert_in.message,
        status=alert_in.status
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert
