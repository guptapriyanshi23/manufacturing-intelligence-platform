from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from backend.app.core.enums import AdvisoryStatus, RcaStatus, SeverityLevel

class AdvisoryBase(BaseModel):
    node_id: Optional[int] = None
    severity: SeverityLevel
    description: str
    detected_at: datetime
    status: AdvisoryStatus
    image_path: Optional[str] = None

class AdvisoryCreate(AdvisoryBase):
    pass

class AdvisoryUpdate(BaseModel):
    status: Optional[AdvisoryStatus] = None
    image_path: Optional[str] = None
    root_cause_description: Optional[str] = None
    action_taken: Optional[str] = None

class AdvisoryResponse(AdvisoryBase):
    id: int
    sensor_id: Optional[str] = None
    sensor_name: Optional[str] = None
    asset: Optional[str] = None
    root_cause_description: Optional[str] = None
    action_taken: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RCABase(BaseModel):
    advisory_id: int
    root_cause_description: Optional[str] = None
    action_taken: Optional[str] = None
    user_id: Optional[int] = None
    status: RcaStatus = RcaStatus.INITIATED

class RCACreate(RCABase):
    pass

class RCAResponse(RCABase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


