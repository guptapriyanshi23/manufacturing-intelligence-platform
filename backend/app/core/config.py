import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Manufacturing Intelligence Platform"
    API_V1_STR: str = "/api/v1"
    
    # Database settings. Fallback to a default local URI if not set.
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    
    SECRET_KEY: str = "deloittemanufacturingsecretkey12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 1 day

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
