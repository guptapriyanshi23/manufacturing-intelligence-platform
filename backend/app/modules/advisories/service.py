from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.advisories import Advisory
from backend.app.modules.advisories.schemas import AdvisoryUpdate

def get_advisories(db: Session) -> List[Advisory]:
    return db.query(Advisory).order_by(Advisory.id.desc()).all()

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
