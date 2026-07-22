from sqlalchemy import Column, BigInteger, String, Time, Integer
from backend.app.core.database import Base

class Shift(Base):
    __tablename__ = "shifts"

    id = Column(BigInteger, primary_key=True, index=True)
    shift_name = Column(String(20), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    duration_hours = Column(Integer, nullable=False)
