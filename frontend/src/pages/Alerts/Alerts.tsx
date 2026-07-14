import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
} from '@mui/material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { getSeverityColor, getSeverityBgColor, getSeverityLevel } from '../../constants/severity';
import { api } from '../../api/client';
import type { HierarchyNode } from '../../types/hierarchy';

const demoAlerts = [
  {
    id: 101,
    name: 'Spindle Overheating',
    description: 'Bearing temperature exceeded normal operating limit of 80°C.',
    asset_name: 'CNC Milling Center A',
    sensor_name: 'Spindle Temperature Sensor',
    condition: 'bearing_temperature > 80',
    threshold: 80,
    severity: 'critical',
    status: 'active',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    node_id: 3,
  },
  {
    id: 102,
    name: 'High Axis Vibration',
    description: 'Vibration levels on the Y-Axis exceeded warning threshold of 2.5 mm/s².',
    asset_name: 'CNC Milling Center A',
    sensor_name: 'Spindle Vibration Y-Axis',
    condition: 'spindle_vibration > 2.5',
    threshold: 2.5,
    severity: 'warning',
    status: 'active',
    timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    node_id: 3,
  },
  {
    id: 103,
    name: 'Voltage Sag Detected',
    description: 'Arc voltage dropped below 18V during active weld.',
    asset_name: 'Robotic Welder Cell 7',
    sensor_name: 'Welding Power Arc Voltage',
    condition: 'arc_voltage < 18',
    threshold: 18,
    severity: 'info',
    status: 'acknowledged',
    timestamp: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    node_id: 6,
  },
];

const SEVERITY_DISPLAY_MAP: Record<string, string> = {
  S1: 'S1 - Critical',
  S2: 'S2 - High',
  S3: 'S3 - Warning',
  S4: 'S4 - Low',
  S5: 'S5 - Informational',
};

const getStatusFromSeverity = (severity: string): string => {
  const level = getSeverityLevel(severity);
  if (level === 'S1' || level === 'S2') return 'Act Now';
  if (level === 'S3' || level === 'S4') return 'Monitor';
  return 'Watch';
};

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'Act Now':
      return { color: '#B91C1C', bgColor: 'rgba(185, 28, 28, 0.12)' };
    case 'Monitor':
      return { color: '#D97706', bgColor: 'rgba(217, 119, 6, 0.12)' };
    case 'Watch':
    default:
      return { color: '#2563EB', bgColor: 'rgba(37, 99, 235, 0.12)' };
  }
};

export const Alerts: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selectedNodeId = location.state?.selectedNodeId ? Number(location.state.selectedNodeId) : (searchParams.get('selectedNodeId') ? Number(searchParams.get('selectedNodeId')) : null);

  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState<number | ''>('');

  const sites = useMemo(() => {
    return flatNodes.filter(n => n.node_type === 'site');
  }, [flatNodes]);

  useEffect(() => {
    if (flatNodes.length > 0 && !selectedSiteId) {
      const sitesList = flatNodes.filter(n => n.node_type === 'site');
      setSelectedSiteId(sitesList[0]?.id || '');
    }
  }, [flatNodes, selectedSiteId]);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Filter states
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>(['All']);
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('');
  const [selectedComponentId, setSelectedComponentId] = useState<number | ''>('');

  // Applied filter states
  const [appliedAssetId, setAppliedAssetId] = useState<number | ''>('');
  const [appliedComponentId, setAppliedComponentId] = useState<number | ''>('');
  const [appliedSeverities, setAppliedSeverities] = useState<string[]>(['All']);

  useEffect(() => {
    api.hierarchy.list(true)
      .then(setFlatNodes)
      .catch(() => setFlatNodes([]))
      .finally(() => setHierarchyLoading(false));
  }, []);

  // Fetch alerts from API when selected tree node changes (and is not null/site)
  useEffect(() => {
    if (flatNodes.length === 0) return;
    if (!selectedNodeId) {
      setAlerts([]);
      return;
    }
    const node = flatNodes.find(n => n.id === selectedNodeId);
    if (!node || node.node_type === 'site') {
      setAlerts([]);
      return;
    }

    setLoading(true);
    api.alerts.list({ node_id: selectedNodeId })
      .then((res) => {
        setAlerts(res || []);
        // Reset applied filters to matching tree state on sidebar selection change
        setAppliedSeverities(['All']);
        setSelectedSeverities(['All']);
      })
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, [selectedNodeId, flatNodes]);

  // Helper to get descendant nodes of a given node ID
  const getDescendantNodes = useMemo(() => {
    return (nodeId: number): HierarchyNode[] => {
      const result: HierarchyNode[] = [];
      const queue = [nodeId];
      const visited = new Set<number>();

      while (queue.length > 0) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);

        const node = flatNodes.find(n => n.id === id);
        if (node) {
          result.push(node);
        }

        flatNodes
          .filter(n => n.parent_id === id)
          .forEach(n => queue.push(n.id));
      }
      return result;
    };
  }, [flatNodes]);

  // Nodes corresponding to the hierarchy selected in the side panel
  const descendantsOfSidePanel = useMemo(() => {
    if (!selectedNodeId) return flatNodes;
    return getDescendantNodes(selectedNodeId);
  }, [selectedNodeId, flatNodes, getDescendantNodes]);

  // Asset dropdown options
  const availableAssets = useMemo(() => {
    return descendantsOfSidePanel.filter(n => n.node_type === 'asset');
  }, [descendantsOfSidePanel]);

  // Component dropdown options
  const availableComponents = useMemo(() => {
    if (selectedAssetId) {
      return getDescendantNodes(Number(selectedAssetId)).filter(n => n.node_type === 'component');
    }
    return descendantsOfSidePanel.filter(n => n.node_type === 'component');
  }, [selectedAssetId, descendantsOfSidePanel, getDescendantNodes]);

  // Autopopulate and sync dropdown selections based on the side panel hierarchy node selection
  useEffect(() => {
    if (flatNodes.length === 0) return;

    if (!selectedNodeId) {
      setSelectedAssetId('');
      setAppliedAssetId('');
      setSelectedComponentId('');
      setAppliedComponentId('');
      return;
    }

    const node = flatNodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    if (node.node_type === 'asset') {
      setSelectedAssetId(node.id);
      setAppliedAssetId(node.id);
      setSelectedComponentId('');
      setAppliedComponentId('');
    } else if (node.node_type === 'component') {
      setSelectedComponentId(node.id);
      setAppliedComponentId(node.id);
      
      // Walk up to find parent asset
      let parent: HierarchyNode | undefined = node.parent_id ? flatNodes.find(n => n.id === node.parent_id) : undefined;
      while (parent && parent.node_type !== 'asset') {
        parent = parent.parent_id ? flatNodes.find(n => n.id === parent.parent_id) : undefined;
      }
      if (parent) {
        setSelectedAssetId(parent.id);
        setAppliedAssetId(parent.id);
      } else {
        setSelectedAssetId('');
        setAppliedAssetId('');
      }
    } else {
      // If it's site, area, line, etc., clear selected values if they are no longer within the new scope
      if (selectedAssetId && !availableAssets.some(a => a.id === selectedAssetId)) {
        setSelectedAssetId('');
        setAppliedAssetId('');
      }
      if (selectedComponentId && !availableComponents.some(c => c.id === selectedComponentId)) {
        setSelectedComponentId('');
        setAppliedComponentId('');
      }
    }
  }, [selectedNodeId, flatNodes, availableAssets, availableComponents]);


  const handleViewClick = () => {
    let activeNodeId = selectedNodeId;
    if (selectedComponentId) {
      activeNodeId = Number(selectedComponentId);
    } else if (selectedAssetId) {
      activeNodeId = Number(selectedAssetId);
    }

    if (!activeNodeId) {
      setAlerts([]);
      setAppliedAssetId(selectedAssetId);
      setAppliedComponentId(selectedComponentId);
      setAppliedSeverities(selectedSeverities);
      return;
    }

    const node = flatNodes.find(n => n.id === activeNodeId);
    if (!node || node.node_type === 'site') {
      setAlerts([]);
      setAppliedAssetId(selectedAssetId);
      setAppliedComponentId(selectedComponentId);
      setAppliedSeverities(selectedSeverities);
      return;
    }

    setLoading(true);
    api.alerts.list({ node_id: activeNodeId })
      .then((res) => {
        setAlerts(res || []);
        setAppliedAssetId(selectedAssetId);
        setAppliedComponentId(selectedComponentId);
        setAppliedSeverities(selectedSeverities);
      })
      .catch(() => {
        setAlerts([]);
        setAppliedAssetId(selectedAssetId);
        setAppliedComponentId(selectedComponentId);
        setAppliedSeverities(selectedSeverities);
      })
      .finally(() => setLoading(false));
  };

  const filteredAlerts = useMemo(() => {
    let result = [...alerts];

    // Helper to get descendant node IDs and sensor IDs
    const getDescendantSet = (nodeId: number) => {
      const nodeIds = new Set<number>();
      const sensorIds = new Set<string>();
      const queue = [nodeId];

      while (queue.length > 0) {
        const id = queue.shift()!;
        nodeIds.add(id);

        const node = flatNodes.find(n => n.id === id);
        if (node?.sensor_metadata?.sensor_id) {
          sensorIds.add(node.sensor_metadata.sensor_id);
        }

        flatNodes
          .filter(n => n.parent_id === id)
          .forEach(n => queue.push(n.id));
      }

      return { nodeIds, sensorIds };
    };

    const matchesNode = (alert: any, targetNodeId: number) => {
      const { nodeIds, sensorIds } = getDescendantSet(targetNodeId);
      return (
        nodeIds.has(alert.node_id) ||
        (alert.sensor_id && sensorIds.has(alert.sensor_id))
      );
    };

    // 1. Filter by Side Panel hierarchy node
    if (selectedNodeId) {
      result = result.filter(a => matchesNode(a, selectedNodeId));
    }

    // 2. Filter by Asset dropdown
    if (appliedAssetId) {
      result = result.filter(a => matchesNode(a, Number(appliedAssetId)));
    }

    // 3. Filter by Component dropdown
    if (appliedComponentId) {
      result = result.filter(a => matchesNode(a, Number(appliedComponentId)));
    }

    // 4. Filter by Severity Chip (multiselect)
    if (!appliedSeverities.includes('All')) {
      result = result.filter(a => appliedSeverities.includes(getSeverityLevel(a.severity)));
    }

    // Sort by severity first (S1 to S5), then by timestamp descending
    result.sort((a, b) => {
      const levelA = getSeverityLevel(a.severity);
      const levelB = getSeverityLevel(b.severity);
      if (levelA !== levelB) {
        return levelA.localeCompare(levelB);
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return result;
  }, [alerts, selectedNodeId, appliedAssetId, appliedComponentId, selectedSeverities, flatNodes]);

  const allSelected = filteredAlerts.length > 0 && selectedIds.length === filteredAlerts.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleSelectAll = () => setSelectedIds(allSelected ? [] : filteredAlerts.map(a => a.id));

  const handleSelectRow = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleAcknowledge = async () => {
    try {
      await Promise.all(
        selectedIds.map(id => api.alerts.update(id, { status: 'acknowledged' }))
      );
      setAlerts(prev => prev.map(a => selectedIds.includes(a.id) ? { ...a, status: 'acknowledged' } : a));
      setSelectedIds([]);
    } catch (err) {
      console.error("Failed to acknowledge alerts:", err);
    }
  };

  const getAssetName = (row: any) => {
    if (row.asset_name) return row.asset_name;
    let currentId: number | undefined = row.node_id;
    while (currentId) {
      const node = flatNodes.find(n => n.id === currentId);
      if (node?.node_type === 'asset') return node.display_name;
      currentId = node?.parent_id;
    }
    return 'N/A';
  };

  const getComponentName = (row: any) => {
    let currentId: number | undefined = row.node_id;
    while (currentId) {
      const node = flatNodes.find(n => n.id === currentId);
      if (node?.node_type === 'component') return node.display_name;
      currentId = node?.parent_id;
    }
    return row.sensor_name || 'N/A';
  };

  return (
    <PageContainer>
      <PageHeader
        title="Alerts"
        subtitle="Critical warnings, system diagnostics, and failure states needing immediate attention."
        actions={
          <FormControl size="small" sx={{ minWidth: 350, bgcolor: 'white', }}>
            <InputLabel id="site-select-label" shrink>Site</InputLabel>
            <Select
              labelId="site-select-label"
              value={selectedSiteId}
              label="Site"
              onChange={(e) => setSelectedSiteId(e.target.value as number)}
              disabled={hierarchyLoading}
              displayEmpty
              renderValue={selectedSiteId === '' ? () => <span style={{ color: '#9e9e9e' }}>Select</span> : undefined}
            >
              <MenuItem value="" style={{ color: '#9e9e9e' }}>Select</MenuItem>
              {sites.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.display_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        }
      />

      {/* Filters Section */}
      <Paper sx={{ px: 3, py: 2.5, mb: 3, border: '1px solid #ccc' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          {/* Left Side: Severity Chips */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {['All', 'S1', 'S2', 'S3', 'S4', 'S5'].map((sev) => {
              const isSelected = selectedSeverities.includes(sev);
              const handleSeverityClick = () => {
                if (sev === 'All') {
                  setSelectedSeverities(['All']);
                } else {
                  setSelectedSeverities((prev) => {
                    const next = prev.filter(s => s !== 'All');
                    if (next.includes(sev)) {
                      const filtered = next.filter(s => s !== sev);
                      return filtered.length === 0 ? ['All'] : filtered;
                    } else {
                      return [...next, sev];
                    }
                  });
                }
              };

              return (
                <Chip
                  key={sev}
                  label={sev}
                  clickable
                  onClick={handleSeverityClick}
                  color={isSelected ? 'secondary' : 'default'}
                  variant={isSelected ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 600,
                    borderRadius: '16px',
                    ...(isSelected ? {} : {
                      borderColor: '#ccc',
                      color: 'text.primary',
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      }
                    })
                  }}
                />
              );
            })}
          </Box>

          {/* Right Side: Asset, Component Dropdowns and View Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="asset-select-label">Asset</InputLabel>
              <Select
                labelId="asset-select-label"
                value={selectedAssetId}
                label="Asset"
                onChange={(e) => {
                  setSelectedAssetId(e.target.value as number | '');
                  setSelectedComponentId('');
                }}
              >
                <MenuItem value="">All Assets</MenuItem>
                {availableAssets.map(asset => (
                  <MenuItem key={asset.id} value={asset.id}>{asset.display_name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="component-select-label">Component</InputLabel>
              <Select
                labelId="component-select-label"
                value={selectedComponentId}
                label="Component"
                onChange={(e) => setSelectedComponentId(e.target.value as number | '')}
              >
                <MenuItem value="">All Components</MenuItem>
                {availableComponents.map(comp => (
                  <MenuItem key={comp.id} value={comp.id}>{comp.display_name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              color="secondary"
              onClick={handleViewClick}
              sx={{ minWidth: 90, fontWeight: 600, height: 40 }}
            >
              View
            </Button>
          </Box>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress color="secondary" />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ border: '1px solid #ccc', boxShadow: 'none' }}>
          <Box sx={{ px: 2, py: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ccc' }}>
            <Typography variant="body1" sx={{ fontWeight: 400 }}>
              Total Alerts :&nbsp;
              <Typography component="span" variant="subtitle1" color="text.secondary" sx={{ fontWeight: 400 }}>
                {filteredAlerts.length}
              </Typography>
            </Typography>
            <Button
              variant="outlined"
              size="small"
              disabled={selectedIds.length === 0}
              onClick={handleAcknowledge}
              sx={{ fontWeight: 600, textTransform: 'none' }}
            >
              Acknowledge
            </Button>
          </Box>

          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ borderBottom: '1px solid #ccc' }}>
                  <Checkbox indeterminate={someSelected} checked={allSelected} onChange={handleSelectAll} color="primary" />
                </TableCell>
                {['Severity', 'Asset', 'Tag', 'Status', 'Advisory message', 'Detected At'].map(col => (
                  <TableCell key={col} sx={{ fontWeight: 700, borderBottom: '1px solid #ccc' }}>{col}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!selectedNodeId || flatNodes.find(n => n.id === selectedNodeId)?.node_type === 'site' ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    Please select an Area or deeper node from the Plant Hierarchy sidebar to load alerts.
                  </TableCell>
                </TableRow>
              ) : filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    No alerts found for this selection. Click the <strong>View</strong> button to search other filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((row) => {
                  const sevLevel = getSeverityLevel(row.severity);
                  const sevText = SEVERITY_DISPLAY_MAP[sevLevel] || sevLevel;
                  const statusText = getStatusFromSeverity(row.severity);
                  const statusStyles = getStatusStyles(statusText);

                  return (
                    <TableRow
                      key={row.id}
                      hover
                      selected={selectedIds.includes(row.id)}
                      sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                      onClick={() => {
                        navigate('/dashboard', { state: { selectedNodeId: row.node_id, alertId: row.id } });
                      }}
                    >
                      <TableCell padding="checkbox" sx={{ borderBottom: '1px solid #ccc' }}>
                        <Checkbox checked={selectedIds.includes(row.id)} color="primary" onClick={(e) => e.stopPropagation()} onChange={() => handleSelectRow(row.id)} />
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #ccc' }}>
                        <Chip
                          label={sevText}
                          size="small"
                          sx={{
                            backgroundColor: getSeverityBgColor(row.severity),
                            color: getSeverityColor(row.severity),
                            fontWeight: 700,
                            borderRadius: '4px',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #ccc', fontWeight: 600 }}>{getAssetName(row)}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #ccc' }}>{getComponentName(row)}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #ccc' }}>
                        <Chip
                          label={statusText.toUpperCase()}
                          size="small"
                          sx={{
                            backgroundColor: statusStyles.bgColor,
                            color: statusStyles.color,
                            border: `1px solid ${statusStyles.color}33`,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #ccc' }}>{row.description}</TableCell>
                      <TableCell sx={{ borderBottom: '1px solid #ccc' }}>
                        {new Date(row.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </PageContainer>
  );
};

export default Alerts;
