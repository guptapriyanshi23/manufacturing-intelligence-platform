from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import check_permissions
from backend.app.modules.dashboard.schemas import DashboardSummaryResponse
from backend.app.modules.dashboard import service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse, dependencies=[Depends(check_permissions(["dashboard:view"]))])
def get_summary():
    """
    Get factory OEE and KPI summary analytics.
    """
    return service.get_dashboard_summary()

@router.get("/telemetry", dependencies=[Depends(check_permissions(["dashboard:view"]))])
def get_telemetry(
    sensor_ids: List[str] = Query(None),
    hours: int = 24,
    granularity: str = Query(None),
    start_time: datetime = Query(None),
    end_time: datetime = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get telemetry history data for a list of sensor IDs.
    """
    return service.get_sensor_telemetry(
        db=db, sensor_ids=sensor_ids, hours=hours, granularity=granularity,
        start_time=start_time, end_time=end_time
    )

@router.get("/shift-timings", dependencies=[Depends(check_permissions(["dashboard:view"]))])
def get_shift_timings(
    detected_at: datetime = Query(...),
    db: Session = Depends(get_db)
):
    """
    Get shift start and end times for a given timestamp.
    """
    return service.get_shift_timings(db=db, detected_at=detected_at)

