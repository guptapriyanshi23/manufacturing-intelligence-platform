from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class AdvisoryBase(BaseModel):
    title: str
    category: str      # 'energy', 'maintenance', 'process_optimization'
    priority: str      # 'critical', 'high', 'medium', 'low'
    description: str
    impact: str        # Estimated savings or output bump description
    status: str        # 'active', 'implemented', 'ignored'

class AdvisoryResponse(AdvisoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
