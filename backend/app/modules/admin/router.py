from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import check_permissions
from backend.app.modules.admin.schemas import SystemStatusResponse
from backend.app.modules.admin import service

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/status", response_model=SystemStatusResponse, dependencies=[Depends(check_permissions(["admin:view"]))])
def get_status(db: Session = Depends(get_db)):
    """
    Get system connectivity and diagnostic status.
    """
    return service.get_system_status(db)
