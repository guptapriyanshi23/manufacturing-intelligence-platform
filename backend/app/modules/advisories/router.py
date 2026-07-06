from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.modules.advisories.schemas import AdvisoryResponse, AdvisoryUpdate
from backend.app.modules.advisories import service

router = APIRouter(prefix="/advisories", tags=["Advisories"])

@router.get("", response_model=List[AdvisoryResponse])
def get_advisories(db: Session = Depends(get_db)):
    """
    Retrieve active system optimization/maintenance advisories from the database.
    """
    return service.get_advisories(db)

@router.patch("/{advisory_id}", response_model=AdvisoryResponse)
def update_advisory(
    advisory_id: int,
    advisory_in: AdvisoryUpdate,
    db: Session = Depends(get_db)
):
    """
    Update advisory status, action taken, root cause description, etc.
    """
    advisory = service.update_advisory(db, advisory_id, advisory_in)
    if not advisory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Advisory with ID {advisory_id} not found"
        )
    return advisory


import os
import shutil
from fastapi import UploadFile, File

UPLOAD_DIR = "backend/app/static/uploads"

@router.post("/upload")
def upload_advisory_image(file: UploadFile = File(...)):
    """
    Upload an image file and return its static URL path.
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"/static/uploads/{file.filename}"}
