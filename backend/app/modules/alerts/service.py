from typing import List
from sqlalchemy.orm import Session
from backend.app.models.alerts import Alert, AlertRule
from backend.app.modules.alerts.schemas import AlertCreate, AlertRuleCreate

def get_alerts(db: Session) -> List[Alert]:
    return db.query(Alert).order_by(Alert.timestamp.desc()).all()

def create_alert(db: Session, alert_in: AlertCreate) -> Alert:
    db_alert = Alert(
        node_id=alert_in.node_id,
        sensor_id=alert_in.sensor_id,
        severity=alert_in.severity,
        message=alert_in.message,
        status=alert_in.status
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

def get_alert_rules(db: Session) -> List[AlertRule]:
    return db.query(AlertRule).order_by(AlertRule.id.asc()).all()

def create_alert_rule(db: Session, rule_in: AlertRuleCreate) -> AlertRule:
    db_rule = AlertRule(
        name=rule_in.name,
        description=rule_in.description,
        severity=rule_in.severity,
        node_id=rule_in.node_id,
        condition_type=rule_in.condition_type,
        sensor_id=rule_in.sensor_id,
        alert_type=rule_in.alert_type,
        value=rule_in.value,
        delay=rule_in.delay,
        pending_period=rule_in.pending_period,
        keep_firing=rule_in.keep_firing,
        notify_email=rule_in.notify_email,
        status=rule_in.status
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

def update_alert_rule(db: Session, rule_id: int, rule_in: AlertRuleCreate) -> AlertRule:
    db_rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not db_rule:
        return None
    db_rule.name = rule_in.name
    db_rule.description = rule_in.description
    db_rule.severity = rule_in.severity
    db_rule.node_id = rule_in.node_id
    db_rule.condition_type = rule_in.condition_type
    db_rule.sensor_id = rule_in.sensor_id
    db_rule.alert_type = rule_in.alert_type
    db_rule.value = rule_in.value
    db_rule.delay = rule_in.delay
    db_rule.pending_period = rule_in.pending_period
    db_rule.keep_firing = rule_in.keep_firing
    db_rule.notify_email = rule_in.notify_email
    db_rule.status = rule_in.status
    db.commit()
    db.refresh(db_rule)
    return db_rule

def delete_alert_rule(db: Session, rule_id: int) -> bool:
    db_rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not db_rule:
        return False
    db.delete(db_rule)
    db.commit()
    return True
