from typing import List, Any, Union
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, check_permissions
from backend.app.modules.hierarchy.schemas import (
    HierarchyNodeCreate,
    HierarchyNodeUpdate,
    HierarchyNodeResponse,
    HierarchyNodeTreeResponse
)
from backend.app.modules.hierarchy import service

router = APIRouter(prefix="/hierarchy", tags=["Hierarchy"])

@router.get("", response_model=List[Union[HierarchyNodeTreeResponse, HierarchyNodeResponse]])
def read_hierarchy(
    flat: bool = False,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the complete ISA-95 node hierarchy structured as a nested tree, or a flat list.
    """
    from backend.app.core.security import get_allowed_node_ids
    allowed_ids = get_allowed_node_ids(current_user, db)
    
    if flat:
        nodes = service.get_flat_nodes(db)
        if allowed_ids is not None:
            nodes = [n for n in nodes if n.id in allowed_ids]
        return [HierarchyNodeResponse.model_validate(n) for n in nodes]
        
    # Tree mode:
    nodes = service.get_flat_nodes(db)
    if allowed_ids is not None:
        nodes = [n for n in nodes if n.id in allowed_ids]
        
    # Build tree from allowed nodes subset
    roots = []
    node_map = {}
    for n in nodes:
        plant_m = None
        if n.plant_metadata:
            plant_m = {"use_case": n.plant_metadata.use_case, "location": n.plant_metadata.location, "description": n.plant_metadata.description}
        asset_m = None
        if n.asset_metadata:
            asset_m = {"asset_id": n.asset_metadata.asset_id, "manufacturer": n.asset_metadata.manufacturer, "model": n.asset_metadata.model}
        sensor_m = None
        if n.sensor_metadata:
            sensor_m = {"sensor_id": n.sensor_metadata.sensor_id, "unit": n.sensor_metadata.unit, "sampling_rate": n.sensor_metadata.sampling_rate}
            
        node_map[n.id] = {
            "id": n.id,
            "parent_id": n.parent_id,
            "node_type": n.node_type,
            "name": n.name,
            "display_name": n.display_name,
            "description": n.description,
            "sort_order": n.sort_order,
            "plant_metadata": plant_m,
            "asset_metadata": asset_m,
            "sensor_metadata": sensor_m,
            "children": []
        }
    
    for n in nodes:
        node_dict = node_map[n.id]
        if n.parent_id is None or n.parent_id not in node_map:
            roots.append(node_dict)
        else:
            parent_dict = node_map[n.parent_id]
            parent_dict["children"].append(node_dict)
            
    for nd in node_map.values():
        nd["children"].sort(key=lambda x: x["sort_order"])
    roots.sort(key=lambda x: x["sort_order"])
    return roots

@router.get("/{node_id}", response_model=HierarchyNodeResponse, dependencies=[Depends(get_current_user)])
def read_node(node_id: int, db: Session = Depends(get_db)):
    """
    Get a single hierarchy node with its type-specific metadata.
    """
    db_node = service.get_node_by_id(db, node_id)
    if not db_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hierarchy node with ID {node_id} not found"
        )
    return db_node

@router.post("", response_model=HierarchyNodeResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(check_permissions(["admin:view"]))])
def create_node(node_in: HierarchyNodeCreate, db: Session = Depends(get_db)):
    """
    Create a hierarchy node and its matching type-specific metadata.
    """
    return service.create_node(db, node_in)

@router.patch("/{node_id}", response_model=HierarchyNodeResponse, dependencies=[Depends(check_permissions(["admin:view"]))])
def update_node(node_id: int, node_in: HierarchyNodeUpdate, db: Session = Depends(get_db)):
    """
    Update a node's attributes and/or metadata.
    """
    db_node = service.update_node(db, node_id, node_in)
    if not db_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hierarchy node with ID {node_id} not found"
        )
    return db_node

@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(check_permissions(["admin:view"]))])
def delete_node(node_id: int, db: Session = Depends(get_db)):
    """
    Delete a hierarchy node. This cascade-deletes sub-nodes and associated metadata.
    """
    success = service.delete_node(db, node_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hierarchy node with ID {node_id} not found"
        )
    return
