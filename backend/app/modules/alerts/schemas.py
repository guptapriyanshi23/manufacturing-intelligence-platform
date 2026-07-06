from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class AlertBase(BaseModel):
    node_id: int
    sensor_id: Optional[str] = None
    severity: str  # 'critical', 'warning', 'info'
    message: str
    status: str  # 'active', 'acknowledged', 'resolved'

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True
