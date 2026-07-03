import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class HierarchyNode(Base):
    __tablename__ = "hierarchy_nodes"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("hierarchy_nodes.id", ondelete="CASCADE"), nullable=True)
    node_type = Column(String, nullable=False)  # 'enterprise', 'site', 'plant', 'asset', 'sensor'
    name = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Self-referential relationship
    parent = relationship("HierarchyNode", remote_side=[id], back_populates="children")
    children = relationship("HierarchyNode", back_populates="parent", cascade="all, delete-orphan")

    # Metadata associations (1-to-1)
    plant_metadata = relationship("PlantMetadata", uselist=False, back_populates="node", cascade="all, delete-orphan")
    asset_metadata = relationship("AssetMetadata", uselist=False, back_populates="node", cascade="all, delete-orphan")
    sensor_metadata = relationship("SensorMetadata", uselist=False, back_populates="node", cascade="all, delete-orphan")


class PlantMetadata(Base):
    __tablename__ = "plant_metadata"

    node_id = Column(Integer, ForeignKey("hierarchy_nodes.id", ondelete="CASCADE"), primary_key=True)
    use_case = Column(String, nullable=True)
    location = Column(String, nullable=True)
    description = Column(String, nullable=True)

    node = relationship("HierarchyNode", back_populates="plant_metadata")


class AssetMetadata(Base):
    __tablename__ = "asset_metadata"

    node_id = Column(Integer, ForeignKey("hierarchy_nodes.id", ondelete="CASCADE"), primary_key=True)
    asset_id = Column(String, nullable=False, index=True)
    manufacturer = Column(String, nullable=True)
    model = Column(String, nullable=True)

    node = relationship("HierarchyNode", back_populates="asset_metadata")


class SensorMetadata(Base):
    __tablename__ = "sensor_metadata"

    node_id = Column(Integer, ForeignKey("hierarchy_nodes.id", ondelete="CASCADE"), primary_key=True)
    sensor_id = Column(String, nullable=False, index=True)
    unit = Column(String, nullable=True)
    sampling_rate = Column(Float, nullable=True)

    node = relationship("HierarchyNode", back_populates="sensor_metadata")
