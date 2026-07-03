from typing import List
from fastapi import APIRouter
from backend.app.modules.reports.schemas import ReportResponse
from backend.app.modules.reports import service

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("", response_model=List[ReportResponse])
def get_reports():
    """
    Retrieve list of generated manufacturing reports.
    """
    return service.get_reports()
