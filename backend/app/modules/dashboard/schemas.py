from typing import List, Dict
from pydantic import BaseModel

class MetricItem(BaseModel):
    label: str
    value: float
    unit: str
    trend: float  # Percentage change

class PerformanceData(BaseModel):
    timestamp: str
    oee: float
    availability: float
    performance: float
    quality: float

class DashboardSummaryResponse(BaseModel):
    oee: MetricItem
    availability: MetricItem
    performance: MetricItem
    quality: MetricItem
    weekly_chart: List[PerformanceData]


from datetime import datetime
from typing import Optional

class TelemetryRequest(BaseModel):
    sensor_ids: List[str]
    hours: Optional[int] = 24
    granularity: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
