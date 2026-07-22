import React, { useEffect, useState } from 'react';
import {
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  Box,
  Typography,
  Tooltip,
  // useTheme,
  ListItemIcon
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';
import type { HierarchyNode, NodeType } from '../../types/hierarchy';
import './TreeView.scss';

import BusinessIcon from '@mui/icons-material/Business';
import FactoryIcon from '@mui/icons-material/Factory';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RouteIcon from '@mui/icons-material/Route';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import SensorsIcon from '@mui/icons-material/Sensors';

interface TreeViewProps {
  nodes: HierarchyNode[];
  onSelectNode?: (node: HierarchyNode) => void;
  selectedNodeId?: number | null;
}

const MachineIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.3.07-.62.07-.92s-.03-.62-.07-.92l1.94-1.55c.18-.14.23-.41.12-.61l-1.84-3.18c-.11-.21-.34-.27-.55-.21l-2.28.93c-.48-.36-1-.67-1.58-.9l-.34-2.43C14.87 2.18 14.63 2 14.36 2h-3.72c-.27 0-.51.18-.55.43l-.34 2.43c-.58.23-1.1.54-1.58.9L5.89 4.83c-.21-.07-.44 0-.55.21L3.5 8.22c-.11.2-.06.47.12.61l1.94 1.55c-.04.3-.07.62-.07.92s.03.62.07.92L3.62 13.77c-.18.14-.23.41-.12.61l1.84 3.18c.11.21.34.27.55.21l2.28-.93c.48.36 1 .67 1.58.9l.34 2.43c.04.25.28.43.55.43h3.72c.27 0 .51-.18.55-.43l.34-2.43c.58-.23 1.1-.54 1.58-.9l2.28.93c.21.07.44 0 .55-.21l1.84-3.18c.11-.2.06-.47-.12-.61l-1.94-1.55z" />
  </svg>
);

const iconMap: Record<NodeType, React.ReactNode> = {
  enterprise: <BusinessIcon fontSize="inherit" />,
  site: <FactoryIcon fontSize="inherit" />,
  area: <DashboardIcon fontSize="inherit" />,
  block: <DashboardIcon fontSize="inherit" />,
  line: <RouteIcon fontSize="inherit" />,
  station: <PrecisionManufacturingIcon fontSize="inherit" />,
  system: <PrecisionManufacturingIcon fontSize="inherit" />,
  asset: <MachineIcon />,
  equipment: <MachineIcon />,
  component: <SettingsInputComponentIcon fontSize="inherit" />,
  sensor: <SensorsIcon fontSize="inherit" />,
  parameter: <SensorsIcon fontSize="inherit" />,
};

const TreeNode: React.FC<{
  node: HierarchyNode;
  depth: number;
  onSelect: (node: HierarchyNode) => void;
  selectedNodeId?: number | null;
}> = ({ node, depth, onSelect, selectedNodeId }) => {
  // const theme = useTheme();
  const [open, setOpen] = useState(depth === 0); // Open root by default
  const nonSensorChildren = (node.children || []).filter(c => c.node_type !== 'sensor' && c.node_type !== 'component');
  const hasChildren = nonSensorChildren.length > 0;
  const isSelected = selectedNodeId === node.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };


  const iconEl = iconMap[node.node_type as NodeType] ?? <MachineIcon />;
  const iconClass = `tree-icon tree-icon--${node.node_type}`;

  return (
    <Box>
      <Tooltip title={node.display_name} placement="right" arrow>
        <ListItemButton
          onClick={handleClick}
          selected={isSelected}
          className={`tree-row${isSelected ? ' tree-row--selected' : ''}`}
          sx={{ pl: 1.5 + depth * 1.5, py: 0.4, borderRadius: '6px', mb: 0.2 }}
        >
          {hasChildren ? (
            <Box onClick={handleToggle} sx={{ display: 'flex', alignItems: 'center', mr: 0.25, p: 0 }}>
              {open ? <ExpandLess sx={{ color: '#595d5e !important', fontSize: '1rem' }} />
                : <ExpandMore sx={{ color: '#595d5e !important', fontSize: '1rem' }} />}
            </Box>
          ) : (
            <Box sx={{ width: 20 }} />
          )}
          <ListItemIcon sx={{ minWidth: 28 }}>
            <Box className={iconClass}>{iconEl}</Box>
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography
                variant="body2"
                noWrap
                sx={{
                  color: '#000 !important',
                  fontSize: depth === 0 ? '0.95rem' : '0.825rem',
                  fontWeight: depth === 0 ? 600 : (isSelected ? 600 : 400),
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
            {nonSensorChildren.map((child) => (
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

  const rootNodes = nodes.filter(n => n.node_type !== 'sensor' && n.node_type !== 'component');

  useEffect(() => {
    if (!nodes?.length || !onSelectNode) return;

    const rootNodes = nodes.filter(
      n => n.node_type !== 'sensor' && n.node_type !== 'component'
    );

    const firstRoot = rootNodes[0];

    if (firstRoot?.children?.length) {
      const firstChild = firstRoot.children.find(
        c => c.node_type !== 'sensor' && c.node_type !== 'component'
      );

      if (firstChild) {
        onSelectNode(firstChild);
      }
    }
  }, [nodes]);

  if (!rootNodes || rootNodes.length === 0) {
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
      {rootNodes.map((node) => (
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
