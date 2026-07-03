from typing import List, Any, Union
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.modules.hierarchy.schemas import (
    HierarchyNodeCreate,
    HierarchyNodeUpdate,
    HierarchyNodeResponse,
    HierarchyNodeTreeResponse
)
from backend.app.modules.hierarchy import service

router = APIRouter(prefix="/hierarchy", tags=["Hierarchy"])

@router.get("", response_model=List[Union[HierarchyNodeTreeResponse, HierarchyNodeResponse]])
def read_hierarchy(flat: bool = False, db: Session = Depends(get_db)):
    """
    Get the complete ISA-95 node hierarchy structured as a nested tree, or a flat list.
    """
    if flat:
        nodes = service.get_flat_nodes(db)
        return [HierarchyNodeResponse.model_validate(n) for n in nodes]
    nodes = service.get_hierarchy_tree(db)
    return [HierarchyNodeTreeResponse.model_validate(n) for n in nodes]

@router.get("/{node_id}", response_model=HierarchyNodeResponse)
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

@router.post("", response_model=HierarchyNodeResponse, status_code=status.HTTP_201_CREATED)
def create_node(node_in: HierarchyNodeCreate, db: Session = Depends(get_db)):
    """
    Create a hierarchy node and its matching type-specific metadata.
    """
    return service.create_node(db, node_in)

@router.patch("/{node_id}", response_model=HierarchyNodeResponse)
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

@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
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
