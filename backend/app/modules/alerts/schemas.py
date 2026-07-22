from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from backend.app.core.enums import AlertStatus, SeverityLevel

class AlertBase(BaseModel):
    node_id: int
    name: Optional[str] = None
    description: Optional[str] = None
    condition: Optional[str] = None
    threshold: Optional[float] = None
    severity: SeverityLevel
    message: str
    status: AlertStatus

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
    severity: SeverityLevel
    node_id: int
    condition_type: Optional[str] = None
    sensor_id: Optional[str] = None
    alert_type: Optional[str] = None
    threshold: Optional[float] = None
    delay: Optional[int] = None
    pending_period: Optional[str] = None
    keep_firing: Optional[str] = None
    notify_email: Optional[str] = None
    status: AlertStatus = AlertStatus.ACTIVE


class AlertRuleCreate(AlertRuleBase):
    pass


class AlertRuleResponse(AlertRuleBase):
    id: int

    class Config:
        from_attributes = True


class AlertCountRequest(BaseModel):
    node_ids: List[int]


class AlertCountResponse(BaseModel):
    total_alerts: int
