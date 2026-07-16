import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from backend.app.core.database import Base
from backend.app.core.enums import AdvisoryStatus, RcaStatus

class Advisory(Base):
    __tablename__ = "advisories"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("hierarchy_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    severity = Column(Integer, nullable=False)  # 1 = critical, 2 = high, 3 = warning, 4 = low, 5 = info
    description = Column(String, nullable=False)
    detected_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    status = Column(Enum(AdvisoryStatus, native_enum=False, values_callable=lambda x: [item.value for item in x]), nullable=False, default=AdvisoryStatus.OPEN)
    image_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class RCA(Base):
    __tablename__ = "root_cause_analyses"

    id = Column(Integer, primary_key=True, index=True)
    advisory_id = Column(Integer, ForeignKey("advisories.id", ondelete="CASCADE"), nullable=False, index=True)
    root_cause_description = Column(String, nullable=True)
    action_taken = Column(String, nullable=True)
    user_id = Column(Integer, nullable=True)
    status = Column(Enum(RcaStatus, native_enum=False, values_callable=lambda x: [item.value for item in x]), nullable=False, default=RcaStatus.INITIATED)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


