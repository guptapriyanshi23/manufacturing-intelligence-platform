from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class FailureFactor(BaseModel):
    name: str
    probability: float  # 0.0 to 1.0
    category: str       # e.g., 'mechanical', 'electrical', 'human_error', 'process'
    description: str

class RootCauseAnalysisResponse(BaseModel):
    event_id: str
    asset_name: str
    anomaly_type: str
    detected_at: datetime
    possible_causes: List[FailureFactor]
    recommendation: str
