from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.advisories import Advisory, RCA
from backend.app.modules.advisories.schemas import AdvisoryUpdate

def get_advisories(
    db: Session,
    node_id: Optional[int] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None
) -> List[Advisory]:
    query = db.query(Advisory)
    
    if status:
        query = query.filter(Advisory.status == status)
    if severity:
        severity_map = {"critical": 1, "high": 2, "warning": 3, "medium": 3, "low": 4, "info": 5, "informational": 5}
        severity_int = severity_map.get(severity.lower()) or (int(severity) if severity.isdigit() else None)
        if severity_int:
            query = query.filter(Advisory.severity == severity_int)
        
    if node_id:
        from sqlalchemy import text
        descendants_query = text("""
            WITH RECURSIVE descendants AS (
                SELECT id FROM hierarchy_nodes WHERE id = :node_id
                UNION ALL
                SELECT h.id FROM hierarchy_nodes h
                JOIN descendants d ON h.parent_id = d.id
            )
            SELECT id FROM descendants;
        """)
        rows = db.execute(descendants_query, {"node_id": node_id}).fetchall()
        descendant_ids = [row[0] for row in rows]
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
                if current_status in (AdvisoryStatus.RESOLVED, "resolved"):
                    rca.status = RcaStatus.COMPLETED
                else:
                    rca.status = RcaStatus.INITIATED
                    
        db.commit()
        db.refresh(advisory)
        return advisory
    except SQLAlchemyError as e:
        db.rollback()
        raise e

