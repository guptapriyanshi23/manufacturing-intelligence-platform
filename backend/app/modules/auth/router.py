import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, create_access_token, get_current_user
from backend.app.models.users import User
from backend.app.modules.auth.schemas import LoginRequest, Token, UserOut

router = APIRouter()

@router.get("/config")
def get_auth_config():
    """
    Returns the auth configuration settings.
    This allows configuring whether standard password login, SSO login, or both are enabled.
    """
    # By default enable both or read from environment variables
    return {
        "jwt_enabled": os.getenv("ENABLE_JWT_LOGIN", "true").lower() == "true",
        "sso_enabled": os.getenv("ENABLE_SSO_LOGIN", "true").lower() == "true"
    }

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Standard JWT Authentication Login endpoint.
    """
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Fetch the logged-in user profile along with permissions list.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "permissions": [p.name for p in current_user.permissions]
    }
