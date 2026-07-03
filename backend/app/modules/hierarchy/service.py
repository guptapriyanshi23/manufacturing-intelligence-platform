from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from backend.app.models.hierarchy import HierarchyNode, PlantMetadata, AssetMetadata, SensorMetadata
from backend.app.modules.hierarchy.schemas import HierarchyNodeCreate, HierarchyNodeUpdate

def get_node_by_id(db: Session, node_id: int) -> Optional[HierarchyNode]:
    return db.query(HierarchyNode).options(
        joinedload(HierarchyNode.plant_metadata),
        joinedload(HierarchyNode.asset_metadata),
        joinedload(HierarchyNode.sensor_metadata)
    ).filter(HierarchyNode.id == node_id).first()

def get_flat_nodes(db: Session) -> List[HierarchyNode]:
    return db.query(HierarchyNode).options(
        joinedload(HierarchyNode.plant_metadata),
        joinedload(HierarchyNode.asset_metadata),
        joinedload(HierarchyNode.sensor_metadata)
    ).order_by(HierarchyNode.sort_order, HierarchyNode.id).all()

def get_hierarchy_tree(db: Session) -> List[HierarchyNode]:
    # Fetch all nodes from database with metadata preloaded to solve N+1 queries
    nodes = db.query(HierarchyNode).options(
        joinedload(HierarchyNode.plant_metadata),
        joinedload(HierarchyNode.asset_metadata),
        joinedload(HierarchyNode.sensor_metadata)
    ).order_by(HierarchyNode.sort_order, HierarchyNode.id).all()
    
    # Map nodes by their ID for easy tree construction
    nodes_map: Dict[int, HierarchyNode] = {}
    roots: List[HierarchyNode] = []
    
    for node in nodes:
        # Create a copy or bind children to empty list for clean tree construction
        node.children = []
        nodes_map[node.id] = node
        
    for node in nodes:
        if node.parent_id is None:
            roots.append(node)
        else:
            parent = nodes_map.get(node.parent_id)
            if parent:
                parent.children.append(node)
            else:
                # If parent not found (e.g., deleted or orphaned), treat as root
                roots.append(node)
                
    return roots

def create_node(db: Session, node_in: HierarchyNodeCreate) -> HierarchyNode:
    # 1. Create the base node
    db_node = HierarchyNode(
        parent_id=node_in.parent_id,
        node_type=node_in.node_type,
        name=node_in.name,
        display_name=node_in.display_name,
        description=node_in.description,
        sort_order=node_in.sort_order
    )
    db.add(db_node)
    db.flush()  # Generate db_node.id
    
    # 2. Add metadata based on node_type
    if node_in.node_type == "plant" and node_in.plant_metadata:
        db_meta = PlantMetadata(
            node_id=db_node.id,
            use_case=node_in.plant_metadata.use_case,
            location=node_in.plant_metadata.location,
            description=node_in.plant_metadata.description
        )
        db.add(db_meta)
    elif node_in.node_type == "asset" and node_in.asset_metadata:
        db_meta = AssetMetadata(
            node_id=db_node.id,
            asset_id=node_in.asset_metadata.asset_id,
            manufacturer=node_in.asset_metadata.manufacturer,
            model=node_in.asset_metadata.model
        )
        db.add(db_meta)
    elif node_in.node_type == "sensor" and node_in.sensor_metadata:
        db_meta = SensorMetadata(
            node_id=db_node.id,
            sensor_id=node_in.sensor_metadata.sensor_id,
            unit=node_in.sensor_metadata.unit,
            sampling_rate=node_in.sensor_metadata.sampling_rate
        )
        db.add(db_meta)
        
    db.commit()
    db.refresh(db_node)
    return db_node

def update_node(db: Session, node_id: int, node_in: HierarchyNodeUpdate) -> Optional[HierarchyNode]:
    db_node = get_node_by_id(db, node_id)
    if not db_node:
        return None
        
    # Update base fields if provided
    update_data = node_in.model_dump(exclude_unset=True)
    
    for key in ["parent_id", "node_type", "name", "display_name", "description", "sort_order"]:
        if key in update_data:
            setattr(db_node, key, update_data[key])
            
    # Update or create metadata based on the node_type
    current_type = db_node.node_type
    
    # Handle Plant Metadata
    if current_type == "plant":
        if node_in.plant_metadata:
            meta = db_node.plant_metadata
            if not meta:
                meta = PlantMetadata(node_id=db_node.id)
                db.add(meta)
            for k, v in node_in.plant_metadata.model_dump(exclude_unset=True).items():
                setattr(meta, k, v)
    
    # Handle Asset Metadata
    elif current_type == "asset":
        if node_in.asset_metadata:
            meta = db_node.asset_metadata
            if not meta:
                meta = AssetMetadata(node_id=db_node.id)
                db.add(meta)
            for k, v in node_in.asset_metadata.model_dump(exclude_unset=True).items():
                setattr(meta, k, v)
                
    # Handle Sensor Metadata
    elif current_type == "sensor":
        if node_in.sensor_metadata:
            meta = db_node.sensor_metadata
            if not meta:
                meta = SensorMetadata(node_id=db_node.id)
                db.add(meta)
            for k, v in node_in.sensor_metadata.model_dump(exclude_unset=True).items():
                setattr(meta, k, v)
                
    db.commit()
    db.refresh(db_node)
    return db_node

def delete_node(db: Session, node_id: int) -> bool:
    db_node = get_node_by_id(db, node_id)
    if not db_node:
        return False
    db.delete(db_node)
    db.commit()
    return True
