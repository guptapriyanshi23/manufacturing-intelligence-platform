from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class AdvisoryBase(BaseModel):
    node_id: Optional[int] = None
    severity: int  # 1 = critical, 2 = high, 3 = warning, 4 = low, 5 = info
    description: str
    first_detected: datetime
    status: str
    image_path: Optional[str] = None

class AdvisoryCreate(AdvisoryBase):
    pass

class AdvisoryUpdate(BaseModel):
    status: Optional[str] = None
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
    status: str = "initiated"

class RCACreate(RCABase):
    pass

class RCAResponse(RCABase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

