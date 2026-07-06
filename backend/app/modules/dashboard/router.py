from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.modules.dashboard.schemas import DashboardSummaryResponse
from backend.app.modules.dashboard import service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_summary():
    """
    Get factory OEE and KPI summary analytics.
    """
    return service.get_dashboard_summary()

@router.get("/telemetry")
def get_telemetry(
    sensor_ids: List[str] = Query(None),
    hours: int = 24,
    db: Session = Depends(get_db)
):
    """
    Get telemetry history data for a list of sensor IDs.
    """
    return service.get_sensor_telemetry(db=db, sensor_ids=sensor_ids, hours=hours)
