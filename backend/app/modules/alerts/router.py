from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.modules.alerts.schemas import AlertResponse, AlertCreate
from backend.app.modules.alerts import service

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(db: Session = Depends(get_db)):
    """
    Retrieve all current active/inactive alerts.
    """
    return service.get_alerts(db)

@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(alert_in: AlertCreate, db: Session = Depends(get_db)):
    """
    Trigger a new alert mock.
    """
    return service.create_alert(db, alert_in)
