from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session, aliased
from backend.app.models.advisories import Advisory, RCA
from backend.app.modules.advisories.schemas import AdvisoryUpdate

def get_advisories(
    db: Session,
    node_id: Optional[int] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None
) -> List[Advisory]:
    query = db.query(Advisory)
    
    if status:
        query = query.filter(Advisory.status == status)
    if severity:
        severity_map = {"critical": 1, "high": 2, "warning": 3, "medium": 3, "low": 4, "info": 5, "informational": 5}
        severity_int = severity_map.get(severity.lower()) or (int(severity) if severity.isdigit() else None)
        if severity_int:
            query = query.filter(Advisory.severity == severity_int)
    if start_time:
        query = query.filter(Advisory.detected_at >= start_time)
    if end_time:
        query = query.filter(Advisory.detected_at <= end_time)
        
    if node_id:
        from backend.app.models.hierarchy import HierarchyNode
        anchor = db.query(HierarchyNode.id).filter(HierarchyNode.id == node_id)
        descendants_cte = anchor.cte(name="descendants", recursive=True)
        node_alias = aliased(HierarchyNode, name="h")
        cte_alias = aliased(descendants_cte, name="d")
        recursive_part = db.query(node_alias.id).join(cte_alias, node_alias.parent_id == cte_alias.c.id)
        descendants_cte = descendants_cte.union_all(recursive_part)
        descendant_ids = [row[0] for row in db.query(descendants_cte.c.id).all()]
        query = query.filter(Advisory.node_id.in_(descendant_ids))

    return query.order_by(Advisory.id.desc()).all()

def get_advisory(db: Session, advisory_id: int) -> Optional[Advisory]:
    return db.query(Advisory).filter(Advisory.id == advisory_id).first()

def update_advisory(db: Session, advisory_id: int, advisory_in: AdvisoryUpdate) -> Optional[Advisory]:
    advisory = get_advisory(db, advisory_id)
    if not advisory:
        return None
    
    try:
        from sqlalchemy.exc import SQLAlchemyError
        from backend.app.core.enums import AdvisoryStatus, RcaStatus
        
        update_data = advisory_in.model_dump(exclude_unset=True)
        
        # Extract RCA fields
        rca_desc = update_data.pop("root_cause_description", None)
        rca_action = update_data.pop("action_taken", None)
        
        with db.begin_nested():
            # Update advisory fields
            for field, value in update_data.items():
                setattr(advisory, field, value)
                
            # Update or create RCA record
            if rca_desc is not None or rca_action is not None:
                rca = db.query(RCA).filter(RCA.advisory_id == advisory_id).first()
                if not rca:
                    rca = RCA(advisory_id=advisory_id, status=RcaStatus.INITIATED)
                    db.add(rca)
                if rca_desc is not None:
                    rca.root_cause_description = rca_desc
                if rca_action is not None:
                    rca.action_taken = rca_action
                
                # Align RCA status with advisory status
                current_status = update_data.get("status") or advisory.status
                if current_status == AdvisoryStatus.RESOLVED:
                    rca.status = RcaStatus.COMPLETED
                else:
                    rca.status = RcaStatus.INITIATED
                    
        db.commit()
        db.refresh(advisory)
        return advisory
    except SQLAlchemyError as e:
        db.rollback()
        raise e


def get_advisory_stats(
    db: Session,
    node_id: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    allowed_node_ids: Optional[List[int]] = None
) -> dict:
    query = db.query(Advisory)
    if node_id is not None:
        from backend.app.models.hierarchy import HierarchyNode
        anchor = db.query(HierarchyNode.id).filter(HierarchyNode.id == node_id)
        descendants_cte = anchor.cte(name="descendants", recursive=True)
        node_alias = aliased(HierarchyNode, name="h")
        cte_alias = aliased(descendants_cte, name="d")
        recursive_part = db.query(node_alias.id).join(cte_alias, node_alias.parent_id == cte_alias.c.id)
        descendants_cte = descendants_cte.union_all(recursive_part)
        descendant_ids = [row[0] for row in db.query(descendants_cte.c.id).all()]
        query = query.filter(Advisory.node_id.in_(descendant_ids))
    if start_time is not None:
        query = query.filter(Advisory.detected_at >= start_time)
    if end_time is not None:
        query = query.filter(Advisory.detected_at <= end_time)
        
    advisories = query.all()
    if allowed_node_ids is not None:
        advisories = [a for a in advisories if a.node_id in allowed_node_ids]

    from backend.app.core.enums import AdvisoryStatus, SeverityLevel
    status_counts = {
        "open": 0,
        "acknowledged": 0,
        "in_progress": 0,
        "resolved": 0
    }
    severity_counts = {sev.value: 0 for sev in SeverityLevel}
    
    for adv in advisories:
        status_val = adv.status.value if hasattr(adv.status, 'value') else adv.status
        if status_val == AdvisoryStatus.OPEN:
            status_counts["open"] += 1
        elif status_val == AdvisoryStatus.ACKNOWLEDGED:
            status_counts["acknowledged"] += 1
        elif status_val == AdvisoryStatus.IN_PROGRESS:
            status_counts["in_progress"] += 1
        elif status_val == AdvisoryStatus.RESOLVED:
            status_counts["resolved"] += 1
            
        adv_sev = adv.severity.value if hasattr(adv.severity, 'value') else adv.severity
        if adv_sev in severity_counts:
            severity_counts[adv_sev] += 1
            
    return {
        "total": len(advisories),
        "status_counts": status_counts,
        "severity_counts": severity_counts
    }
