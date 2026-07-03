from sqlalchemy.orm import Session
from backend.app.models.hierarchy import HierarchyNode
from backend.app.modules.admin.schemas import SystemStatusResponse

def get_system_status(db: Session) -> SystemStatusResponse:
    # Get total count of nodes in the system
    try:
        nodes_count = db.query(HierarchyNode).count()
        db_connected = True
    except Exception:
        nodes_count = 0
        db_connected = False
        
    return SystemStatusResponse(
        database_connected=db_connected,
        version="1.0.0-beta",
        uptime_seconds=3600.0,
        nodes_count=nodes_count
    )
