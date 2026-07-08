from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, check_permissions
from backend.app.modules.alerts.schemas import AlertResponse, AlertCreate
from backend.app.modules.alerts import service

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    current_user = Depends(check_permissions(["alerts:view"])),
    db: Session = Depends(get_db)
):
    """
    Retrieve all current active/inactive alerts.
    """
    from backend.app.core.security import get_allowed_node_ids
    allowed_ids = get_allowed_node_ids(current_user, db)
    
    alerts = service.get_alerts(db)
    if allowed_ids is not None:
        alerts = [a for a in alerts if a.node_id in allowed_ids]
    return alerts

@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(get_current_user)])
def create_alert(alert_in: AlertCreate, db: Session = Depends(get_db)):
    """
    Trigger a new alert mock.
    """
    return service.create_alert(db, alert_in)
