from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class AlertBase(BaseModel):
    node_id: int
    name: Optional[str] = None
    description: Optional[str] = None
    condition: Optional[str] = None
    threshold: Optional[float] = None
    severity: int  # 1 = critical, 2 = high, 3 = warning, 4 = low, 5 = info
    message: str
    status: str  # 'active', 'acknowledged', 'resolved'

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: int
    timestamp: datetime
    sensor_id: Optional[str] = None
    asset_name: Optional[str] = None
    sensor_name: Optional[str] = None

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
