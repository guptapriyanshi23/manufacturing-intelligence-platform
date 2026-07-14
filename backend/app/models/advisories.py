import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from backend.app.core.database import Base

class Advisory(Base):
    __tablename__ = "advisories"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("hierarchy_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    severity = Column(Integer, nullable=False)  # 1 = critical, 2 = high, 3 = warning, 4 = low, 5 = info
    description = Column(String, nullable=False)
    first_detected = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    status = Column(String, nullable=False, default="open")  # 'open', 'acknowledged', 'resolved'
    image_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class RCA(Base):
    __tablename__ = "rcas"

    id = Column(Integer, primary_key=True, index=True)
    advisory_id = Column(Integer, ForeignKey("advisories.id", ondelete="CASCADE"), nullable=False, index=True)
    root_cause_description = Column(String, nullable=True)
    action_taken = Column(String, nullable=True)
    user_id = Column(Integer, nullable=True)
    status = Column(String, nullable=False, default="initiated")  # 'initiated', 'completed'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

