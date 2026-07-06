import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from backend.app.core.database import Base

class SensorThreshold(Base):
    __tablename__ = "sensor_thresholds"

    sensor_id = Column(String, primary_key=True, index=True)
    alarm_limit = Column(Float, nullable=True)
    trip_limit = Column(Float, nullable=True)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(String, nullable=True, index=True)
    node_id = Column(Integer, nullable=True, index=True)
    severity = Column(String, nullable=False)  # 'critical', 'warning', 'info'
    message = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")  # 'active', 'acknowledged', 'resolved'
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
