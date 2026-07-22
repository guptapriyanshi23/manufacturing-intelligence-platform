import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from backend.app.core.database import Base
from backend.app.core.enums import AlertStatus

class SensorThreshold(Base):
    __tablename__ = "sensor_thresholds"

    sensor_id = Column(String, primary_key=True, index=True)
    alarm_limit = Column(Float, nullable=True)
    trip_limit = Column(Float, nullable=True)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("hierarchy_nodes.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String, nullable=True)
    description = Column(String, nullable=True)
    condition = Column(String, nullable=True)
    threshold = Column(Float, nullable=True)
    severity = Column(Integer, nullable=False)  # 1 = critical, 2 = high, 3 = warning, 4 = low, 5 = info
    message = Column(String, nullable=False)
    status = Column(Integer, nullable=False, default=AlertStatus.ACTIVE)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    severity = Column(Integer, nullable=False, default=3)  # 1 = critical, 2 = high, 3 = warning, 4 = low, 5 = info
    node_id = Column(Integer, ForeignKey("hierarchy_nodes.id", ondelete="CASCADE"), nullable=False)
    condition_type = Column(String, nullable=True)
    alert_type = Column(String, nullable=True)
    threshold = Column(Float, nullable=True)
    delay = Column(Integer, nullable=True)
    pending_period = Column(String, nullable=True)
    keep_firing = Column(String, nullable=True)
    notify_email = Column(String, nullable=True)
    status = Column(Integer, nullable=False, default=AlertStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    node = relationship("HierarchyNode", foreign_keys=[node_id])

    @property
    def sensor_id(self) -> str | None:
        if self.node and self.node.sensor_metadata:
            return self.node.sensor_metadata.sensor_id
        return None


