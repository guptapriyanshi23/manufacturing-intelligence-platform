from typing import List
from datetime import datetime, timedelta
from backend.app.modules.alerts.schemas import AlertResponse

# Mock alerts storage
_mock_alerts = [
    AlertResponse(
        id=1,
        node_id=3,
        severity="critical",
        message="High temperature warning on CNC Spindle",
        status="active",
        timestamp=datetime.utcnow() - timedelta(minutes=15)
    ),
    AlertResponse(
        id=2,
        node_id=4,
        severity="warning",
        message="Vibration variance exceeds threshold on Hydraulic Pump",
        status="active",
        timestamp=datetime.utcnow() - timedelta(hours=1)
    ),
    AlertResponse(
        id=3,
        node_id=2,
        severity="info",
        message="Routine maintenance window approaching",
        status="acknowledged",
        timestamp=datetime.utcnow() - timedelta(days=1)
    )
]

def get_alerts() -> List[AlertResponse]:
    return _mock_alerts

def create_alert(alert_in) -> AlertResponse:
    new_alert = AlertResponse(
        id=len(_mock_alerts) + 1,
        node_id=alert_in.node_id,
        severity=alert_in.severity,
        message=alert_in.message,
        status=alert_in.status,
        timestamp=datetime.utcnow()
    )
    _mock_alerts.insert(0, new_alert)
    return new_alert
