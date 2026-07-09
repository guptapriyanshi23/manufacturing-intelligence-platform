from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.advisories import Advisory
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
        query = query.filter(Advisory.severity == severity)
        
    if node_id:
        from sqlalchemy import text
        descendants_query = text("""
            WITH RECURSIVE descendants AS (
                SELECT id, display_name FROM hierarchy_nodes WHERE id = :node_id
                UNION ALL
                SELECT h.id, h.display_name FROM hierarchy_nodes h
                JOIN descendants d ON h.parent_id = d.id
            )
            SELECT display_name FROM descendants;
        """)
        descendant_names = [r[0] for r in db.execute(descendants_query, {"node_id": node_id}).fetchall()]
        if descendant_names:
            query = query.filter(Advisory.asset.in_(descendant_names))
        else:
            query = query.filter(Advisory.id == -1)

    return query.order_by(Advisory.id.desc()).all()

def get_advisory(db: Session, advisory_id: int) -> Optional[Advisory]:
    return db.query(Advisory).filter(Advisory.id == advisory_id).first()

def update_advisory(db: Session, advisory_id: int, advisory_in: AdvisoryUpdate) -> Optional[Advisory]:
    advisory = get_advisory(db, advisory_id)
    if not advisory:
        return None
    
    update_data = advisory_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(advisory, field, value)
        
    db.commit()
    db.refresh(advisory)
    return advisory
