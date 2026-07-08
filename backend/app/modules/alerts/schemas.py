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


class AlertRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    severity: str
    node_id: int
    condition_type: Optional[str] = None
    sensor_id: Optional[str] = None
    alert_type: Optional[str] = None
    value: Optional[float] = None
    delay: Optional[int] = None
    pending_period: Optional[str] = None
    keep_firing: Optional[str] = None
    notify_email: Optional[str] = None
    status: str = "Active"


class AlertRuleCreate(AlertRuleBase):
    pass


class AlertRuleResponse(AlertRuleBase):
    id: int

    class Config:
        from_attributes = True
