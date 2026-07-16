import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Manufacturing Intelligence Platform"
    API_V1_STR: str = "/api/v1"
    
    # Database settings. Pydantic automatically checks env for DATABASE_URL.
    DATABASE_URL: str
    
    SECRET_KEY: str = "deloittemanufacturingsecretkey12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 1 day

    # Auth configuration settings
    ENABLE_JWT_LOGIN: bool = True
    ENABLE_SSO_LOGIN: bool = True

    # CORS settings
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    class Config:
        case_sensitive = True
        env_file = "backend/.env"  # Pydantic will check this file relative to workdir
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

