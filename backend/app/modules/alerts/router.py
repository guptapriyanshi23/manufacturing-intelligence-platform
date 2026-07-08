from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, check_permissions
from backend.app.modules.alerts.schemas import AlertResponse, AlertCreate, AlertRuleResponse, AlertRuleCreate
from backend.app.modules.alerts import service

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    current_user = Depends(check_permissions(["alerts:view"])),
    db: Session = Depends(get_db)
):
    """
    Retrieve all current active/inactive alerts.
    """
    from backend.app.core.security import get_allowed_node_ids
    allowed_ids = get_allowed_node_ids(current_user, db)
    
    alerts = service.get_alerts(db)
    if allowed_ids is not None:
        alerts = [a for a in alerts if a.node_id in allowed_ids]
    return alerts

@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(get_current_user)])
def create_alert(alert_in: AlertCreate, db: Session = Depends(get_db)):
    """
    Trigger a new alert mock.
    """
    return service.create_alert(db, alert_in)


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
