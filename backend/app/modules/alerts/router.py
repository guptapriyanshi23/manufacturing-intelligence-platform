from typing import List
from fastapi import APIRouter, status
from backend.app.modules.alerts.schemas import AlertResponse, AlertCreate
from backend.app.modules.alerts import service

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts():
    """
    Retrieve all current active/inactive alerts.
    """
    return service.get_alerts()

@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(alert_in: AlertCreate):
    """
    Trigger a new alert mock.
    """
    return service.create_alert(alert_in)
