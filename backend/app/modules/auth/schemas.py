from pydantic import BaseModel, EmailStr
from typing import List

class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserOut(BaseModel):
    id: int
    email: str
    is_active: bool
    permissions: List[str]

    class Config:
        from_attributes = True
