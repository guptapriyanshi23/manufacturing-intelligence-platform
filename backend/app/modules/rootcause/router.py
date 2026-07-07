from fastapi import APIRouter, Depends
from backend.app.core.security import check_permissions
from backend.app.modules.rootcause.schemas import RootCauseAnalysisResponse
from backend.app.modules.rootcause import service

router = APIRouter(prefix="/root-cause", tags=["Root Cause"])

@router.get("/{event_id}", response_model=RootCauseAnalysisResponse, dependencies=[Depends(check_permissions(["advisories:rca"]))])
def get_root_cause(event_id: str):
    """
    Get Root Cause Analysis diagnostics for a specific anomaly event.
    """
    return service.get_rca_by_event(event_id)
