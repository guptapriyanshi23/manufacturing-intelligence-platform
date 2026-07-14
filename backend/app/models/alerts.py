import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from backend.app.core.database import Base

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
    status = Column(String, nullable=False, default="active")  # 'active', 'acknowledged', 'resolved'
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    severity = Column(String, nullable=False, default="warning")
    node_id = Column(Integer, nullable=False)
    condition_type = Column(String, nullable=True)
    sensor_id = Column(String, nullable=True)
    alert_type = Column(String, nullable=True)
    value = Column(Float, nullable=True)
    delay = Column(Integer, nullable=True)
    pending_period = Column(String, nullable=True)
    keep_firing = Column(String, nullable=True)
    notify_email = Column(String, nullable=True)
    status = Column(String, nullable=False, default="Active")
