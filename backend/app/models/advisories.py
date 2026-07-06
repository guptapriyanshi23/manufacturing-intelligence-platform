import datetime
from sqlalchemy import Column, Integer, String, DateTime
from backend.app.core.database import Base

class Advisory(Base):
    __tablename__ = "advisories"

    id = Column(Integer, primary_key=True, index=True)
    tag = Column(String, nullable=False)
    asset = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # e.g., 'critical', 'warning', 'info'
    description = Column(String, nullable=False)
    first_detected = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    status = Column(String, nullable=False, default="open")  # 'open', 'acknowledged', 'resolved'
    image_path = Column(String, nullable=True)
    root_cause_description = Column(String, nullable=True)
    action_taken = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
