from typing import List
from fastapi import APIRouter
from backend.app.modules.advisories.schemas import AdvisoryResponse
from backend.app.modules.advisories import service

router = APIRouter(prefix="/advisories", tags=["Advisories"])

@router.get("", response_model=List[AdvisoryResponse])
def get_advisories():
    """
    Retrieve active system optimization/maintenance advisories.
    """
    return service.get_advisories()
