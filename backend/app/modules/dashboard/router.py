from fastapi import APIRouter
from backend.app.modules.dashboard.schemas import DashboardSummaryResponse
from backend.app.modules.dashboard import service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_summary():
    """
    Get factory OEE and KPI summary analytics.
    """
    return service.get_dashboard_summary()
