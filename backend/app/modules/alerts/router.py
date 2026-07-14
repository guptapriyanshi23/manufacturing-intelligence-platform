from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, check_permissions
from backend.app.modules.alerts.schemas import AlertResponse, AlertCreate, AlertRuleResponse, AlertRuleCreate
from backend.app.modules.alerts import service
from backend.app.models.hierarchy import HierarchyNode

router = APIRouter(prefix="/alerts", tags=["Alerts"])

def resolve_alert_details(db: Session, alert) -> dict:
    if not alert:
        return {}
    sensor_name = "N/A"
    sensor_id = None
    asset_name = "N/A"
    
    if alert.node_id:
        node = db.query(HierarchyNode).filter(HierarchyNode.id == alert.node_id).first()
        if node:
            if node.node_type == 'sensor':
                sensor_name = node.display_name
                if node.sensor_metadata:
                    sensor_id = node.sensor_metadata.sensor_id
            else:
                sensor_name = node.display_name
            
            curr = node
            while curr:
                if curr.node_type == 'asset':
                    asset_name = curr.display_name
                    break
                curr = curr.parent
                
    return {
        "id": alert.id,
        "node_id": alert.node_id,
        "sensor_id": sensor_id,
        "sensor_name": sensor_name,
        "asset_name": asset_name,
        "name": alert.name,
        "description": alert.description,
        "condition": alert.condition,
        "threshold": alert.threshold,
        "severity": alert.severity,
        "message": alert.message,
        "status": alert.status,
        "timestamp": alert.timestamp
    }
def resolve_all_alerts(db: Session, alerts: List) -> List[dict]:
    if not alerts:
        return []
    nodes = db.query(HierarchyNode).all()
    node_map = {n.id: n for n in nodes}
    
    asset_cache = {}
    def get_asset_name(node_id: int) -> str:
        if not node_id:
            return "N/A"
        if node_id in asset_cache:
            return asset_cache[node_id]
        
        curr_id = node_id
        visited = set()
        while curr_id and curr_id not in visited:
            visited.add(curr_id)
            n = node_map.get(curr_id)
            if not n:
                break
            if n.node_type == 'asset':
                asset_cache[node_id] = n.display_name
                return n.display_name
            curr_id = n.parent_id
            
        asset_cache[node_id] = "N/A"
        return "N/A"

    result = []
    for alert in alerts:
        sensor_name = "N/A"
        sensor_id = None
        asset_name = "N/A"
        
        if alert.node_id:
            node = node_map.get(alert.node_id)
            if node:
                sensor_name = node.display_name
                if node.sensor_metadata:
                    sensor_id = node.sensor_metadata.sensor_id
                asset_name = get_asset_name(alert.node_id)
                
        result.append({
            "id": alert.id,
            "node_id": alert.node_id,
            "sensor_id": sensor_id,
            "sensor_name": sensor_name,
            "asset_name": asset_name,
            "name": alert.name,
            "description": alert.description,
            "condition": alert.condition,
            "threshold": alert.threshold,
            "severity": alert.severity,
            "message": alert.message,
            "status": alert.status,
            "timestamp": alert.timestamp
        })
    return result

from typing import List, Optional

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    node_id: Optional[int] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    current_user = Depends(check_permissions(["alerts:view"])),
    db: Session = Depends(get_db)
):
    """
    Retrieve all current active/inactive alerts.
    """
    from backend.app.core.security import get_allowed_node_ids
    allowed_ids = get_allowed_node_ids(current_user, db)
    
    alerts = service.get_alerts(db, node_id=node_id, severity=severity, status=status)
    if allowed_ids is not None:
        alerts = [a for a in alerts if a.node_id in allowed_ids]
    return resolve_all_alerts(db, alerts)

@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(get_current_user)])
def create_alert(alert_in: AlertCreate, db: Session = Depends(get_db)):
    """
    Trigger a new alert mock.
    """
    alert = service.create_alert(db, alert_in)
    return resolve_alert_details(db, alert)


@router.get("/rules", response_model=List[AlertRuleResponse], dependencies=[Depends(check_permissions(["alerts:view"]))])
def get_alert_rules(db: Session = Depends(get_db)):
    """
    Retrieve all alert rules.
    """
    return service.get_alert_rules(db)


@router.post("/rules", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(get_current_user)])
def create_alert_rule(rule_in: AlertRuleCreate, db: Session = Depends(get_db)):
    """
    Create a new alert rule.
    """
    return service.create_alert_rule(db, rule_in)


@router.put("/rules/{id}", response_model=AlertRuleResponse, dependencies=[Depends(get_current_user)])
def update_alert_rule(id: int, rule_in: AlertRuleCreate, db: Session = Depends(get_db)):
    """
    Update an existing alert rule.
    """
    from fastapi import HTTPException
    rule = service.update_alert_rule(db, id, rule_in)
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    return rule


@router.delete("/rules/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(get_current_user)])
def delete_alert_rule(id: int, db: Session = Depends(get_db)):
    """
    Delete an alert rule.
    """
    from fastapi import HTTPException
    success = service.delete_alert_rule(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    return {}

@router.patch("/{id}", response_model=AlertResponse, dependencies=[Depends(get_current_user)])
def update_alert(id: int, status_in: dict, db: Session = Depends(get_db)):
    """
    Update status of an alert (e.g. acknowledge).
    """
    from fastapi import HTTPException
    alert = service.update_alert_status(db, id, status_in.get("status", "acknowledged"))
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return resolve_alert_details(db, alert)
