import React, { useMemo, useState } from 'react';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import OrgTreePanel, { type OrgTreeNode } from '../org-tree/OrgTreePanel';
import './Admin.scss';

type AdminTab = 'assetHierarchy' | 'severityThresholds';
type IsaLevel = 'Enterprise' | 'Site' | 'Plant' | 'Asset' | 'Sensor';

interface HierarchyNode {
  id: string;
  level: IsaLevel;
  name: string;
  parentId: string | null;
  description: string;
}

interface SeverityThreshold {
  severity: number;
  label: string;
  minDeviation: number;
  maxDeviation: number | null;
}

const ISA_LEVELS: IsaLevel[] = ['Enterprise', 'Site', 'Plant', 'Asset', 'Sensor'];

const SEVERITY_THRESHOLDS: SeverityThreshold[] = [
  { severity: 1, label: 'Critical', minDeviation: 60, maxDeviation: null },
  { severity: 2, label: 'High', minDeviation: 35, maxDeviation: 60 },
  { severity: 3, label: 'Medium', minDeviation: 20, maxDeviation: 35 },
  { severity: 4, label: 'Low', minDeviation: 10, maxDeviation: 20 },
  { severity: 5, label: 'Informational', minDeviation: 3, maxDeviation: 10 },
];

const MOCK_HIERARCHY: HierarchyNode[] = [
  { id: 'ent-1', level: 'Enterprise', name: 'DCW Limited', parentId: null, description: 'Top-level enterprise organization.' },
  { id: 'site-1', level: 'Site', name: 'Dhrangadhra, Gujarat', parentId: 'ent-1', description: 'Primary operating site in Gujarat.' },
  { id: 'plant-1', level: 'Plant', name: 'Soda Ash', parentId: 'site-1', description: 'Use Case: Asset Twin – Anomaly Detection' },
  { id: 'asset-1', level: 'Asset', name: 'ID Fan #2 (Calciner Draft)', parentId: 'plant-1', description: 'Asset ID: DHR-IDF-02' },
  { id: 'sensor-1', level: 'Sensor', name: 'Bearing Temperature', parentId: 'asset-1', description: 'Sensor ID: BT-014' },
];



const toTreeType = (level: IsaLevel): OrgTreeNode['type'] => {
  if (level === 'Enterprise') return 'enterprise';
  if (level === 'Site') return 'site';
  if (level === 'Plant') return 'plant';
  if (level === 'Asset') return 'asset';
  return 'sensor';
};

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('assetHierarchy');
  const [hierarchyNodes, setHierarchyNodes] = useState<HierarchyNode[]>(MOCK_HIERARCHY);
  const [selectedLevel, setSelectedLevel] = useState<IsaLevel | null>(null);
  const [selectedParent, setSelectedParent] = useState<HierarchyNode | null>(null);
  const [hierarchyName, setHierarchyName] = useState('');
  const [hierarchyDescription, setHierarchyDescription] = useState('');
  const [hierarchyError, setHierarchyError] = useState('');

  const hierarchyTree = useMemo<OrgTreeNode[]>(() => {
    const byParent = new Map<string | null, HierarchyNode[]>();
    hierarchyNodes.forEach((node) => {
      const existing = byParent.get(node.parentId) ?? [];
      existing.push(node);
      byParent.set(node.parentId, existing);
    });

    const buildChildren = (parentId: string | null): OrgTreeNode[] => {
      const children = byParent.get(parentId) ?? [];
      return children
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((node) => ({
          key: node.id,
          label: node.name,
          type: toTreeType(node.level),
          data: { type: toTreeType(node.level), level: node.level, fullName: node.name },
          defaultExpanded: true,
          children: buildChildren(node.id),
        }));
    };

    return buildChildren(null);
  }, [hierarchyNodes]);



  const handleHierarchySubmit = () => {
    if (!selectedLevel || !hierarchyName.trim()) {
      setHierarchyError('Level and Name are required.');
      return;
    }

    const selectedIndex = ISA_LEVELS.indexOf(selectedLevel);

    const nextNode: HierarchyNode = {
      id: `node-${Date.now()}`,
      level: selectedLevel,
      name: hierarchyName.trim(),
      parentId: selectedIndex === 0 ? null : selectedParent?.id ?? null,
      description: hierarchyDescription.trim(),
    };

    setHierarchyNodes((prev) => [...prev, nextNode]);
    setHierarchyError('');
    setHierarchyName('');
    setHierarchyDescription('');
    setSelectedParent(null);
  };



  const handleDeleteHierarchyNode = (node: OrgTreeNode) => {
    const idToDelete = node.key;
    const idsToDelete = new Set<string>([idToDelete]);

    let hasPending = true;
    while (hasPending) {
      hasPending = false;
      hierarchyNodes.forEach((item) => {
        if (item.parentId && idsToDelete.has(item.parentId) && !idsToDelete.has(item.id)) {
          idsToDelete.add(item.id);
          hasPending = true;
        }
      });
    }

    setHierarchyNodes((prev) => prev.filter((item) => !idsToDelete.has(item.id)));
    setSelectedParent((prev) => (prev && idsToDelete.has(prev.id) ? null : prev));
  };

  return (
      <Box sx={{ p: '1rem' }}>
      <div className="page-title">
        <AdminPanelSettingsIcon sx={{ color: '#0076A8', fontSize: 22 }} />
        <div>
        <h1>Asset Hierarchy & Severity Thresholds</h1>
        <div className="chart-subtitle">Defines the hierarchy and severity thresholds every operator screen relies on</div>
      </div>
      </div>

        <Tabs
          value={activeTab}
          onChange={(_, value: AdminTab) => setActiveTab(value)}
          className="admin-page__tabs"
        >
          <Tab label="Asset Hierarchy" value="assetHierarchy" />
          <Tab label="Severity Thresholds" value="severityThresholds" />
        </Tabs>
   

      {activeTab === 'assetHierarchy' && (
        <Box className="admin-page__asset-layout">
          <Card className="admin-card admin-card--form">
            <Typography className="admin-card__title">Add to Hierarchy</Typography>
 <div className="chart-subtitle">Onboard new equipment into the ISA-95 structure</div>
            <Box className="admin-form__grid">
              <Autocomplete
                options={ISA_LEVELS}
                value={selectedLevel}
                onChange={(_, value) => {
                  setSelectedLevel(value);
                  setSelectedParent(null);
                }}
                renderInput={(params) => <TextField {...params} label="Level" size="small" required />}
              />

              <TextField
                label="Name"
                size="small"
                value={hierarchyName}
                onChange={(event) => setHierarchyName(event.target.value)}
                required
              />

              {/* <Autocomplete
                options={parentOptions}
                value={selectedParent}
                getOptionLabel={(option) => `${option.level} - ${option.name}`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, value) => setSelectedParent(value)}
                disabled={!selectedLevel || ISA_LEVELS.indexOf(selectedLevel) === 0}
                renderInput={(params) => <TextField {...params} label="Parent Node" size="small" />}
              /> */}

              <TextField
                label="Description"
                multiline
                minRows={4}
                value={hierarchyDescription}
                onChange={(event) => setHierarchyDescription(event.target.value)}
              />

              {hierarchyError && <Typography className="admin-form__error">{hierarchyError}</Typography>}

              <Button variant="contained" onClick={handleHierarchySubmit} className="admin-form__submit">Add</Button>
            </Box>
          </Card>

          <Card className="admin-card admin-card--tree">
            <Typography className="admin-card__title">Define Hierarchy </Typography>
         <div className="chart-subtitle" >Mirrors ISA-95 levels : Enterprise, Site, Plant, Asset, Sensor</div>
              <OrgTreePanel
                title=""
                nodes={hierarchyTree}
                onNodeSelected={() => undefined}
                canDeleteNode={(node) => node.key.startsWith('node-')}
                onDeleteNode={handleDeleteHierarchyNode}
              />

              <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#f1f5f9', borderLeft: '3px solid #0076A8' }}>
                <Typography sx={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                  <strong>Note:</strong> Each level carries its own metadata — Plant adds Usecase, Asset adds AssetID, Sensor adds SensorID. This same tree drives the hierarchy pane shown on every operator screen.
                </Typography>
              </Box>
            
          </Card>
        </Box>
      )}

      {activeTab === 'severityThresholds' && (
        <Card className="admin-card admin-card--table">
 <div className="chart-subtitle">Severity one is the highest priority, 5 is the lowest - defined on deviation between twin (reference) and actual value.</div>
          <Box className="admin-table-wrap">
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: '1rem', fontWeight: 600, padding: '16px' }}>Severity</TableCell>
                  <TableCell sx={{ fontSize: '1rem', fontWeight: 600, padding: '16px' }}>Label</TableCell>
                  <TableCell sx={{ fontSize: '1rem', fontWeight: 600, padding: '16px' }}>Min Deviation %</TableCell>
                  <TableCell sx={{ fontSize: '1rem', fontWeight: 600, padding: '16px' }}>Max Deviation %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {SEVERITY_THRESHOLDS.map((row) => (
                  <TableRow key={row.severity}>
                    <TableCell sx={{ padding: '16px' }}>
                      <span className={`severity-badge severity-s${row.severity}`} style={{ fontSize: '0.95rem', padding: '6px 14px' }}>S{row.severity}</span>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem', padding: '16px' }}>
                      <span className={`severity-s${row.severity}`}>{row.label}</span>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.95rem', padding: '16px' }}>{row.minDeviation}</TableCell>
                    <TableCell sx={{ fontSize: '0.95rem', padding: '16px' }}>{row.maxDeviation !== null ? `${row.maxDeviation}` : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}
    </Box>
  );
};

export default Admin;
