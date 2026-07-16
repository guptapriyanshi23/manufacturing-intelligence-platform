import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.users import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    password_bytes = password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def check_permissions(required_permissions: List[str]):
    def dependency(current_user: User = Depends(get_current_user)):
        user_perms = {p.name for p in current_user.permissions}
        for perm in required_permissions:
            if perm not in user_perms:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to access this resource"
                )
        return current_user
    return dependency

def get_allowed_node_ids(user: User, db: Session) -> set:
    from sqlalchemy import text
    user_perms = {p.name for p in user.permissions}
    if 'admin:view' in user_perms:
        return None # Admin has no restrictions
    
    # Query assigned node IDs using ORM
    explicit_ids = [p.node_id for p in user.hierarchy_permissions]
    if not explicit_ids:
        # Default to full access if no node constraint is explicitly set
        return None

        
    # Get all nodes to build descendants tree
    node_stmt = text("SELECT id, parent_id FROM hierarchy_nodes")
    all_nodes = db.execute(node_stmt).fetchall()
    
    # Map parent_id -> child_ids
    from collections import defaultdict
    children_map = defaultdict(list)
    for nid, parent_id in all_nodes:
        if parent_id is not None:
            children_map[parent_id].append(nid)
            
    allowed = set(explicit_ids)
    queue = list(explicit_ids)
    while queue:
        curr = queue.pop(0)
        for child_id in children_map[curr]:
            if child_id not in allowed:
                allowed.add(child_id)
                queue.append(child_id)
                
    return allowed

