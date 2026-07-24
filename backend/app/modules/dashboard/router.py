from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import check_permissions
from backend.app.modules.dashboard.schemas import DashboardSummaryResponse, TelemetryRequest
from backend.app.modules.dashboard import service
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.post("/telemetry", dependencies=[Depends(check_permissions(["dashboard:view"]))])
def get_telemetry(
    payload: TelemetryRequest,
    db: Session = Depends(get_db)
):
    """
    Get telemetry history data for a list of sensor IDs.
    """
    return service.get_sensor_telemetry(
        db=db,
        sensor_ids=payload.sensor_ids,
        hours=payload.hours,
        granularity=payload.granularity,
        start_time=payload.start_time,
        end_time=payload.end_time
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

