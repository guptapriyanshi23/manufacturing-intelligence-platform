from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, check_permissions
from backend.app.modules.advisories.schemas import AdvisoryResponse, AdvisoryUpdate
from backend.app.modules.advisories import service
import os
import shutil
from fastapi import UploadFile, File

router = APIRouter(prefix="/advisories", tags=["Advisories"])
UPLOAD_DIR = "backend/app/static/uploads"

@router.get("", response_model=List[AdvisoryResponse])
def get_advisories(
    node_id: Optional[int] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    current_user = Depends(check_permissions(["advisories:view"])),
    db: Session = Depends(get_db)
):
    """
    Retrieve active system optimization/maintenance advisories from the database.
    """
    from backend.app.core.security import get_allowed_node_ids
    allowed_ids = get_allowed_node_ids(current_user, db)
    
    advisories = service.get_advisories(db, node_id=node_id, status=status, severity=severity)
    if allowed_ids is not None:
        if not allowed_ids:
            return []
        from sqlalchemy import text
        nodes_stmt = text("SELECT display_name FROM hierarchy_nodes WHERE id IN :ids")
        allowed_names = {r[0] for r in db.execute(nodes_stmt, {"ids": tuple(allowed_ids)}).fetchall()}
        advisories = [a for a in advisories if a.asset in allowed_names]
    return advisories

@router.patch("/{advisory_id}", response_model=AdvisoryResponse)
def update_advisory(
    advisory_id: int,
    advisory_in: AdvisoryUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update advisory status, action taken, root cause description, etc.
    """
    user_perms = {p.name for p in current_user.permissions}
    if advisory_in.status == 'acknowledged' and 'advisories:acknowledge' not in user_perms:
        raise HTTPException(status_code=403, detail="Not authorized to acknowledge advisories")
    if advisory_in.status == 'resolved' and 'advisories:rca' not in user_perms:
        raise HTTPException(status_code=403, detail="Not authorized to resolve advisories")
    if 'advisories:view' not in user_perms:
        raise HTTPException(status_code=403, detail="Not authorized to view advisories")

    advisory = service.update_advisory(db, advisory_id, advisory_in)
    if not advisory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Advisory with ID {advisory_id} not found"
        )
    return advisory

@router.post("/upload")
def upload_advisory_image(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """
    Upload an image file and return its static URL path.
    """
    user_perms = {p.name for p in current_user.permissions}
    if 'advisories:rca' not in user_perms:
        raise HTTPException(status_code=403, detail="Not authorized to perform RCA uploads")
        
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"/static/uploads/{file.filename}"}
