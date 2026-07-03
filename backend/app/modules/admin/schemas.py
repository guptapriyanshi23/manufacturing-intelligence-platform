from pydantic import BaseModel

class SystemStatusResponse(BaseModel):
    database_connected: bool
    version: str
    uptime_seconds: float
    nodes_count: int
