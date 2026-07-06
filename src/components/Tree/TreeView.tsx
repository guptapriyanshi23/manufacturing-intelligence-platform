import React, { useState } from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Typography,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Business as EnterpriseIcon,
  Factory as PlantIcon,
  Sensors as SensorIcon,
  Domain as AreaIcon,
  LinearScale as LineIcon,
  DeveloperBoard as StationIcon,
  PrecisionManufacturing as AssetIcon,
  SettingsInputComponent as ComponentIcon
} from '@mui/icons-material';
import type { HierarchyNode, NodeType } from '../../types/hierarchy';

interface TreeViewProps {
  nodes: HierarchyNode[];
  onSelectNode?: (node: HierarchyNode) => void;
  selectedNodeId?: number | null;
}

const getNodeIcon = (type: NodeType, theme: ReturnType<typeof useTheme>) => {
  switch (type) {
    case 'enterprise':
      return <EnterpriseIcon sx={{ color: 'inherit' }} />;
    case 'site':
      return <PlantIcon sx={{ color: 'inherit' }} />;
    case 'area':
      return <AreaIcon sx={{ color: 'inherit' }} />;
    case 'line':
      return <LineIcon sx={{ color: 'inherit' }} />;
    case 'station':
      return <StationIcon sx={{ color: 'inherit' }} />;
    case 'asset':
      return <AssetIcon sx={{ color: 'inherit'   }} />;
    case 'component':
      return <ComponentIcon sx={{ color: 'inherit' }} />;
    case 'sensor':
      return <SensorIcon sx={{ color: 'inherit' }} />;
    default:
      return <SensorIcon sx={{ color: 'inherit' }} />;
  }
};

const TreeNode: React.FC<{
  node: HierarchyNode;
  depth: number;
  onSelect: (node: HierarchyNode) => void;
  selectedNodeId?: number | null;
}> = ({ node, depth, onSelect, selectedNodeId }) => {
  const theme = useTheme();
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
      <Tooltip title={node.display_name} placement="right" arrow>
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
              borderLeft: `3px solid ${theme.palette.primary.main}`,
              '&:hover': {
                backgroundColor: 'rgba(6, 182, 212, 0.2)',
              },
            },
          }}
        >
          {hasChildren ? (
            <Box onClick={handleToggle} sx={{ display: 'flex', alignItems: 'center', mr: 1, p: 0.5 }}>
              {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </Box>
          ) : (
            <Box sx={{ width: 28 }} />
          )}
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
        </ListItemButton>
      </Tooltip>

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
