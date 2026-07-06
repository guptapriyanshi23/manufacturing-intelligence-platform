from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class AdvisoryBase(BaseModel):
    tag: str
    asset: str
    severity: str
    description: str
    first_detected: datetime
    status: str
    image_path: Optional[str] = None
    root_cause_description: Optional[str] = None
    action_taken: Optional[str] = None

class AdvisoryCreate(AdvisoryBase):
    pass

class AdvisoryUpdate(BaseModel):
    status: Optional[str] = None
    image_path: Optional[str] = None
    root_cause_description: Optional[str] = None
    action_taken: Optional[str] = None

class AdvisoryResponse(AdvisoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
