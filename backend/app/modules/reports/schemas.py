from datetime import datetime
from pydantic import BaseModel

class ReportResponse(BaseModel):
    id: int
    name: str
    report_type: str  # 'shift_summary', 'oee_analysis', 'maintenance_log'
    status: str       # 'ready', 'generating', 'failed'
    created_at: datetime
    download_url: str

    class Config:
        from_attributes = True
