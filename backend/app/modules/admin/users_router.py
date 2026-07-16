from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from pydantic import BaseModel
from backend.app.core.database import get_db
from backend.app.core.security import check_permissions
from backend.app.models.users import User, Permission

router = APIRouter()

class UserPermissionsUpdate(BaseModel):
    permissions: List[str]

class UserListItem(BaseModel):
    id: int
    email: str
    is_active: bool
    permissions: List[str]

class PermissionItem(BaseModel):
    name: str
    description: str

@router.get("/users", response_model=List[UserListItem], dependencies=[Depends(check_permissions(["admin:view"]))])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "email": u.email,
            "is_active": u.is_active,
            "permissions": [p.name for p in u.permissions]
        })
    return result

@router.get("/permissions", response_model=List[PermissionItem], dependencies=[Depends(check_permissions(["admin:view"]))])
def list_permissions(db: Session = Depends(get_db)):
    permissions = db.query(Permission).all()
    return permissions

@router.put("/users/{user_id}/permissions", dependencies=[Depends(check_permissions(["admin:view"]))])
def update_user_permissions(user_id: int, payload: UserPermissionsUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify all permissions exist
    requested_perms = db.query(Permission).filter(Permission.name.in_(payload.permissions)).all()
    if len(requested_perms) != len(payload.permissions):
        raise HTTPException(status_code=400, detail="One or more permissions are invalid")
    
    # Update permissions
    user.permissions = requested_perms
    db.commit()
    return {"message": "Permissions updated successfully"}

class UserHierarchyUpdate(BaseModel):
    nodes: List[int]

@router.get("/users/{user_id}/hierarchy", response_model=List[int], dependencies=[Depends(check_permissions(["admin:view"]))])
def get_user_hierarchy(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return [p.node_id for p in user.hierarchy_permissions]

@router.put("/users/{user_id}/hierarchy", dependencies=[Depends(check_permissions(["admin:view"]))])
def update_user_hierarchy(user_id: int, payload: UserHierarchyUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    try:
        from backend.app.models.users import UserHierarchyPermission
        from sqlalchemy.exc import SQLAlchemyError
        
        with db.begin_nested():
            # Delete existing
            db.query(UserHierarchyPermission).filter(UserHierarchyPermission.user_id == user_id).delete()
            
            # Insert new mappings
            if payload.nodes:
                for nid in payload.nodes:
                    db.add(UserHierarchyPermission(user_id=user_id, node_id=nid))
                    
        db.commit()
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")
        
    return {"message": "User hierarchy permissions updated successfully"}

