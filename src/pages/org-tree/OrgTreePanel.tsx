import React, { useState } from 'react';
import { Box, Collapse, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import './OrgTreePanel.scss';

/* ── Types ── */
export type OrgTreeNodeType = 'org' | 'plant' | 'machine' | 'alert' | 'enterprise' | 'site' | 'asset' | 'sensor';

export interface OrgNodeData {
  type: OrgTreeNodeType;
  plantId?: string;
  machineId?: string;
  alertId?: string;
  level?: string;
  fullName?: string;
}

export interface OrgTreeNode {
  key: string;
  label: string;
  type: OrgTreeNodeType;
  data: OrgNodeData;
  defaultExpanded?: boolean;
  children?: OrgTreeNode[];
}

interface OrgTreeAlert {
  id: string;
  assetTag: string;
  severity: string;
  plantId: string;
  machineId: string;
}

interface OrgTreePanelProps {
  onNodeSelected: (node: OrgTreeNode) => void;
  alerts?: OrgTreeAlert[];
  nodes?: OrgTreeNode[];
  title?: string;
  onDeleteNode?: (node: OrgTreeNode) => void;
  canDeleteNode?: (node: OrgTreeNode) => boolean;
  onAlertClick?: (machineId: string) => void;
}

/* ── Tree Data ── */
const BASE_TREE_NODES: OrgTreeNode[] = [
  {
    key: 'org', label: 'Organization', type: 'org',
    data: { type: 'org' }, defaultExpanded: true,
    children: [
      {
        key: 'plant-1', label: 'Plant Machining', type: 'plant',
        data: { type: 'plant', plantId: 'plant-1' }, defaultExpanded: true,
        children: [
          { key: 'p1-m1', label: 'CNC-04', type: 'machine', data: { type: 'machine', plantId: 'plant-1', machineId: 'p1-m1' } },
          { key: 'p1-m2', label: 'CNC-07', type: 'machine', data: { type: 'machine', plantId: 'plant-1', machineId: 'p1-m2' } },
        //   { key: 'p1-m3', label: 'Process Unit 3', type: 'machine', data: { type: 'machine', plantId: 'plant-1', machineId: 'p1-m3' } },
        ],
      },
      {
        key: 'plant-2', label: 'Plant Uitilities', type: 'plant',
        data: { type: 'plant', plantId: 'plant-2' }, defaultExpanded: true,
        children: [
          {
            key: 'p2-m1', label: 'ID Fan #1', type: 'machine', data: { type: 'machine', plantId: 'plant-2', machineId: 'p2-m1' },
            children: [
              { key: 'p2-m1-alert-1', label: 'Bearing Vibration', type: 'alert', data: { type: 'alert', plantId: 'plant-2', machineId: 'p2-m1', alertId: 'fan1-alert-1' } },
            ],
          },
          {
            key: 'p2-m2', label: 'ID Fan #2', type: 'machine', data: { type: 'machine', plantId: 'plant-2', machineId: 'p2-m2' },
            children: [
              { key: 'p2-m2-alert-1', label: 'Bearing Vibration', type: 'alert', data: { type: 'alert', plantId: 'plant-2', machineId: 'p2-m2', alertId: 'fan2-alert-1' } },
              { key: 'p2-m2-alert-2', label: 'Bearing Temperature', type: 'alert', data: { type: 'alert', plantId: 'plant-2', machineId: 'p2-m2', alertId: 'fan2-alert-2' } },
              { key: 'p2-m2-alert-3', label: 'Motor Current', type: 'alert', data: { type: 'alert', plantId: 'plant-2', machineId: 'p2-m2', alertId: 'fan2-alert-3' } },
            ],
          },
          { key: 'p2-m3', label: 'Boiler Feed Pump', type: 'machine', data: { type: 'machine', plantId: 'plant-2', machineId: 'p2-m3' } },
          { key: 'p2-m4', label: 'PA Fan', type: 'machine', data: { type: 'machine', plantId: 'plant-2', machineId: 'p2-m4' } },
        ],
      },
    ],
  },
];

const buildTreeNodes = (_alerts: OrgTreeAlert[] = []): OrgTreeNode[] => {
  const cloneNode = (node: OrgTreeNode): OrgTreeNode => {
    return {
      ...node,
      children: node.children?.map(cloneNode) ?? [],
      defaultExpanded: node.defaultExpanded,
    };
  };

  return BASE_TREE_NODES.map(cloneNode);
};

/* ── Icons ── */
const OrgIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
  </svg>
);
const PlantIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.06 15.94 0 13.36 0c-1.46 0-2.75.7-3.58 1.78C8.95.7 7.66 0 6.18 0 3.6 0 1.5 2.06 1.5 4.64c0 .48.1.92.18 1.36H0v2h1l1 12h20l1-12h1V6zM13.36 2c1.29 0 2.34 1.05 2.34 2.34 0 1.29-1.05 2.34-2.34 2.34H12V5h-2v1.68H8.64C7.35 6.68 6.3 5.63 6.3 4.34 6.3 3.05 7.35 2 8.64 2c.95 0 1.77.55 2.18 1.35L11.5 4.5l.68-1.15C12.59 2.55 13.41 2 13.36 2z" />
  </svg>
);
const MachineIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.3.07-.62.07-.92s-.03-.62-.07-.92l1.94-1.55c.18-.14.23-.41.12-.61l-1.84-3.18c-.11-.21-.34-.27-.55-.21l-2.28.93c-.48-.36-1-.67-1.58-.9l-.34-2.43C14.87 2.18 14.63 2 14.36 2h-3.72c-.27 0-.51.18-.55.43l-.34 2.43c-.58.23-1.1.54-1.58.9L5.89 4.83c-.21-.07-.44 0-.55.21L3.5 8.22c-.11.2-.06.47.12.61l1.94 1.55c-.04.3-.07.62-.07.92s.03.62.07.92L3.62 13.77c-.18.14-.23.41-.12.61l1.84 3.18c.11.21.34.27.55.21l2.28-.93c.48.36 1 .67 1.58.9l.34 2.43c.04.25.28.43.55.43h3.72c.27 0 .51-.18.55-.43l.34-2.43c.58-.23 1.1-.54 1.58-.9l2.28.93c.21.07.44 0 .55-.21l1.84-3.18c.11-.2.06-.47-.12-.61l-1.94-1.55z" />
  </svg>
);
const AlertIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
    <path d="M12 2L1 21h22L12 2zm0 4.2l7.2 13.8H4.8L12 6.2zm-1 3.3v5h2v-5h-2zm0 7v2h2v-2h-2z" />
  </svg>
);
const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
    <path d="M7 10l5 5 5-5z" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
    <path d="M10 17l5-5-5-5v10z" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
    <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z" />
  </svg>
);

/* ── TreeRow ── */
interface TreeRowProps {
  node: OrgTreeNode;
  depth: number;
  selectedKey: string | null;
  onSelect: (node: OrgTreeNode) => void;
  onDeleteNode?: (node: OrgTreeNode) => void;
  canDeleteNode?: (node: OrgTreeNode) => boolean;
  onAlertClick?: (machineId: string) => void;
}

const TreeRow: React.FC<TreeRowProps> = ({ node, depth, selectedKey, onSelect, onDeleteNode, canDeleteNode, onAlertClick }) => {
  const [expanded, setExpanded] = useState(node.defaultExpanded ?? false);
  const hasChildren = !!node.children?.length;
  const isSelected = selectedKey === node.key;

  const handleClick = () => {
    onSelect(node);
    if (node.type === 'alert' && node.data.machineId && onAlertClick) {
      onAlertClick(node.data.machineId);
    }
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteNode?.(node);
  };

  const iconEl =
    node.type === 'org' || node.type === 'enterprise'
      ? <OrgIcon />
      : node.type === 'plant' || node.type === 'site'
        ? <PlantIcon />
        : node.type === 'alert'
          ? <AlertIcon />
          : <MachineIcon />;
  const iconClass = `tree-icon tree-icon--${node.type}`;

  return (
    <>
      <ListItemButton
        className={`tree-row${isSelected ? ' tree-row--selected' : ''}`}
        onClick={handleClick}
        sx={{ pl: 1.5 + depth * 1.5, py: 0.4, borderRadius: '6px', mb: 0.2 }}
      >
        {hasChildren && (
          <Box className="tree-chevron" onClick={handleChevronClick}>
            {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </Box>
        )}
        {!hasChildren && <Box sx={{ width: 16, flexShrink: 0 }} />}

        <ListItemIcon sx={{ minWidth: 28 }}>
          <Box className={iconClass}>{iconEl}</Box>
        </ListItemIcon>

        <ListItemText
          primary={
            node.data.level && node.data.fullName ? (
              <span>
                <strong>{node.data.level}:</strong> <span style={{ fontWeight: 300 }}>{node.data.fullName}</span>
              </span>
            ) : (
              node.label
            )
          }
          slotProps={{
            primary: {
              className: `tree-label tree-label--${node.type}${isSelected ? ' tree-label--selected' : ''}`,
            },
          }}
        />

        {canDeleteNode?.(node) && (
          <Box className="tree-row__action" onClick={handleDeleteClick} role="button" aria-label={`Delete ${node.label}`}>
            <CloseIcon />
          </Box>
        )}
      </ListItemButton>

      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <List disablePadding>
            {node.children!.map((child) => (
              <TreeRow
                key={child.key}
                node={child}
                depth={depth + 1}
                selectedKey={selectedKey}
                onSelect={onSelect}
                onDeleteNode={onDeleteNode}
                canDeleteNode={canDeleteNode}
                onAlertClick={onAlertClick}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

/* ── OrgTreePanel ── */
const OrgTreePanel: React.FC<OrgTreePanelProps> = ({ onNodeSelected, alerts = [], nodes, title = 'Organization', onDeleteNode, canDeleteNode, onAlertClick }) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const treeNodes = React.useMemo(() => nodes ?? buildTreeNodes(alerts), [alerts, nodes]);

  const handleSelect = (node: OrgTreeNode) => {
    setSelectedKey(node.key);
    onNodeSelected(node);
  };

  return (
    <Box className="tree-panel">
      {title && <Typography className="tree-panel__title">{title}</Typography>}
      <List disablePadding>
        {treeNodes.map((node) => (
          <TreeRow
            key={node.key}
            node={node}
            depth={0}
            selectedKey={selectedKey}
            onSelect={handleSelect}
            onDeleteNode={onDeleteNode}
            canDeleteNode={canDeleteNode}
            onAlertClick={onAlertClick}
          />
        ))}
      </List>
    </Box>
  );
};

export default OrgTreePanel;
