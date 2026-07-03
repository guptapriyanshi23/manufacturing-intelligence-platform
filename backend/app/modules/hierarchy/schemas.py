from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# Metadata Schemas
class PlantMetadataSchema(BaseModel):
    use_case: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class AssetMetadataSchema(BaseModel):
    asset_id: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None

    class Config:
        from_attributes = True


class SensorMetadataSchema(BaseModel):
    sensor_id: str
    unit: Optional[str] = None
    sampling_rate: Optional[float] = None

    class Config:
        from_attributes = True


# Hierarchy Node Schemas
class HierarchyNodeBase(BaseModel):
    parent_id: Optional[int] = None
    node_type: str = Field(..., description="Must be 'enterprise', 'site', 'area', 'line', 'station', 'asset', 'component', or 'sensor'")
    name: str
    display_name: str
    description: Optional[str] = None
    sort_order: int = 0


class HierarchyNodeCreate(HierarchyNodeBase):
    plant_metadata: Optional[PlantMetadataSchema] = None
    asset_metadata: Optional[AssetMetadataSchema] = None
    sensor_metadata: Optional[SensorMetadataSchema] = None


class HierarchyNodeUpdate(BaseModel):
    parent_id: Optional[int] = None
    node_type: Optional[str] = None
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    plant_metadata: Optional[PlantMetadataSchema] = None
    asset_metadata: Optional[AssetMetadataSchema] = None
    sensor_metadata: Optional[SensorMetadataSchema] = None


class HierarchyNodeResponse(HierarchyNodeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    plant_metadata: Optional[PlantMetadataSchema] = None
    asset_metadata: Optional[AssetMetadataSchema] = None
    sensor_metadata: Optional[SensorMetadataSchema] = None

    class Config:
        from_attributes = True


# Recursive tree representation
class HierarchyNodeTreeResponse(BaseModel):
    id: int
    parent_id: Optional[int] = None
    node_type: str
    name: str
    display_name: str
    description: Optional[str] = None
    sort_order: int
    plant_metadata: Optional[PlantMetadataSchema] = None
    asset_metadata: Optional[AssetMetadataSchema] = None
    sensor_metadata: Optional[SensorMetadataSchema] = None
    children: List["HierarchyNodeTreeResponse"] = []

    class Config:
        from_attributes = True
