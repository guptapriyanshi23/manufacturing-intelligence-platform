import React, { useState } from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Typography
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Business as EnterpriseIcon,
  Factory as PlantIcon,
  PrecisionManufacturing as AssetIcon,
  Sensors as SensorIcon
} from '@mui/icons-material';
import type { HierarchyNode, NodeType } from '../../types/hierarchy';

interface TreeViewProps {
  nodes: HierarchyNode[];
  onSelectNode?: (node: HierarchyNode) => void;
  selectedNodeId?: number | null;
}

const getNodeIcon = (type: NodeType) => {
  switch (type) {
    case 'enterprise':
      return <EnterpriseIcon sx={{ color: '#fbbf24' }} />; // Gold
    case 'plant':
      return <PlantIcon sx={{ color: '#06b6d4' }} />;      // Cyan
    case 'asset':
      return <AssetIcon sx={{ color: '#818cf8' }} />;      // Indigo
    case 'sensor':
      return <SensorIcon sx={{ color: '#f59e0b' }} />;     // Amber
    default:
      return <SensorIcon />;
  }
};

const TreeNode: React.FC<{
  node: HierarchyNode;
  depth: number;
  onSelect: (node: HierarchyNode) => void;
  selectedNodeId?: number | null;
}> = ({ node, depth, onSelect, selectedNodeId }) => {
  const [open, setOpen] = useState(depth === 0); // Open root by default
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };

  return (
    <Box>
      <ListItemButton
        onClick={handleClick}
        selected={isSelected}
        sx={{
          pl: depth * 2 + 1,
          py: 0.5,
          borderRadius: 1,
          mb: 0.25,
          '&.Mui-selected': {
            backgroundColor: 'rgba(6, 182, 212, 0.12)',
            borderLeft: '3px solid #06b6d4',
            '&:hover': {
              backgroundColor: 'rgba(6, 182, 212, 0.2)',
            },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          {getNodeIcon(node.node_type)}
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography
              variant="body2"
              noWrap
              sx={{
                fontSize: '0.875rem',
                fontWeight: isSelected ? 600 : 400,
              }}
            >
              {node.display_name}
            </Typography>
          }
        />
        {hasChildren && (
          <Box onClick={handleToggle} sx={{ display: 'flex', alignItems: 'center', p: 0.5 }}>
            {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </Box>
        )}
      </ListItemButton>

      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {node.children!.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                onSelect={onSelect}
                selectedNodeId={selectedNodeId}
              />
            ))}
          </List>
        </Collapse>
      )}
    </Box>
  );
};

export const TreeView: React.FC<TreeViewProps> = ({ nodes, onSelectNode, selectedNodeId }) => {
  const handleSelect = (node: HierarchyNode) => {
    if (onSelectNode) {
      onSelectNode(node);
    }
  };

  if (!nodes || nodes.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No hierarchy elements loaded.
        </Typography>
      </Box>
    );
  }

  return (
    <List disablePadding>
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          onSelect={handleSelect}
          selectedNodeId={selectedNodeId}
        />
      ))}
    </List>
  );
};
