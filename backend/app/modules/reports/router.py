from typing import List
from fastapi import APIRouter, Depends
from backend.app.core.security import check_permissions
from backend.app.modules.reports.schemas import ReportResponse
from backend.app.modules.reports import service

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("", response_model=List[ReportResponse], dependencies=[Depends(check_permissions(["reports:view"]))])
def get_reports():
    """
    Retrieve list of generated manufacturing reports.
    """
    return service.get_reports()
