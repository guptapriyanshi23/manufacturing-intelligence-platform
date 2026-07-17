import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
} from '@mui/material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { getSeverityLevel, severityClassMap, getSeverityLevelFull } from '../../constants/severity';
import { api } from '../../api/client';
import type { HierarchyNode } from '../../types/hierarchy';
import { AlertStatus } from '../../types/enums';
import BreadCrumsBar from '../../components/BreadCrumsBar/BreadCrumsBar';
import { fmtDate, fmtTime } from '../../constants/datetimefmt';

const InboxIcon = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-3h3.56c.69 1.19 1.97 2 3.45 2s2.75-.81 3.45-2H19v3zm0-5h-4.99c0 1.1-.9 1.99-2 1.99S10 15.1 10 14H5V5h14v9z" /></svg>
);

const getStatusFromSeverity = (severity: string): string => {
  const level = getSeverityLevel(severity);
  if (level === 'S1' || level === 'S2') return 'Act Now';
  if (level === 'S3' || level === 'S4') return 'Monitor';
  return 'Watch';
};
const tableStatusClass = (status: string): string => {
  if (status === 'Act now') return 'alerts-table__status alerts-table__status--act';
  if (status === 'Monitor') return 'alerts-table__status alerts-table__status--monitor';
  return 'alerts-table__status alerts-table__status--watch';
};

const getBreadcrumbsPath = (nodeId: number, flatNodes: HierarchyNode[]): string[] => {
  const path: string[] = [];
  let current = flatNodes.find(n => n.id === nodeId);
  while (current) {
    path.unshift(current.display_name);
    const pid = current.parent_id;
    current = pid ? flatNodes.find(n => n.id === pid) : undefined;
  }
  return path;
};

export const Alerts: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const context = useOutletContext<{ selectedNodeId?: number | null }>();
  const selectedNodeId = context?.selectedNodeId ?? (location.state?.selectedNodeId ? Number(location.state.selectedNodeId) : (searchParams.get('selectedNodeId') ? Number(searchParams.get('selectedNodeId')) : null));

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
  const [selectedSensorId, setSelectedSensorId] = useState<number | ''>('');

  // Applied filter states
  const [appliedSensorId, setAppliedSensorId] = useState<number | ''>('');
  const [appliedSeverities, setAppliedSeverities] = useState<string[]>(['All']);

  useEffect(() => {
    api.hierarchy.list(true)
      .then(setFlatNodes)
      .catch(() => setFlatNodes([]))
      .finally(() => setHierarchyLoading(false));
  }, []);

  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  useEffect(() => {
    if (selectedNodeId && flatNodes.length > 0) {
      setBreadcrumbs(getBreadcrumbsPath(selectedNodeId, flatNodes));
    } else {
      setBreadcrumbs([]);
    }
  }, [selectedNodeId, flatNodes]);

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

  // Sensor/Tag dropdown options
  const availableSensors = useMemo(() => {
    return descendantsOfSidePanel.filter(n => n.node_type === 'sensor');
  }, [descendantsOfSidePanel]);

  const isAssetSelected = useMemo(() => {
    return flatNodes.find(n => n.id === selectedNodeId)?.node_type === 'asset';
  }, [selectedNodeId, flatNodes]);

  // Autopopulate and sync dropdown selections based on the side panel hierarchy node selection
  useEffect(() => {
    if (flatNodes.length === 0) return;

    if (!selectedNodeId) {
      setSelectedSensorId('');
      setAppliedSensorId('');
      return;
    }

    const node = flatNodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    if (node.node_type === 'sensor') {
      setSelectedSensorId(node.id);
      setAppliedSensorId(node.id);
    } else {
      if (selectedSensorId && !availableSensors.some(s => s.id === selectedSensorId)) {
        setSelectedSensorId('');
        setAppliedSensorId('');
      }
    }
  }, [selectedNodeId, flatNodes, availableSensors]);


  const handleViewClick = () => {
    let activeNodeId = selectedNodeId;
    if (selectedSensorId) {
      activeNodeId = Number(selectedSensorId);
    }

    if (!activeNodeId) {
      setAlerts([]);
      setAppliedSensorId(selectedSensorId);
      setAppliedSeverities(selectedSeverities);
      return;
    }

    const node = flatNodes.find(n => n.id === activeNodeId);
    if (!node || node.node_type === 'site') {
      setAlerts([]);
      setAppliedSensorId(selectedSensorId);
      setAppliedSeverities(selectedSeverities);
      return;
    }

    setLoading(true);
    api.alerts.list({ node_id: activeNodeId })
      .then((res) => {
        setAlerts(res || []);
        setAppliedSensorId(selectedSensorId);
        setAppliedSeverities(selectedSeverities);
      })
      .catch(() => {
        setAlerts([]);
        setAppliedSensorId(selectedSensorId);
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

    // 2. Filter by Sensor/Tag dropdown
    if (appliedSensorId) {
      result = result.filter(a => matchesNode(a, Number(appliedSensorId)));
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
  }, [alerts, selectedNodeId, appliedSensorId, selectedSeverities, flatNodes]);

  const allSelected = filteredAlerts.length > 0 && selectedIds.length === filteredAlerts.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleSelectAll = () => setSelectedIds(allSelected ? [] : filteredAlerts.map(a => a.id));

  const handleSelectRow = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleAcknowledge = async () => {
    try {
      await Promise.all(
        selectedIds.map(id => api.alerts.update(id, { status: AlertStatus.ACKNOWLEDGED }))
      );
      setAlerts(prev => prev.map(a => selectedIds.includes(a.id) ? { ...a, status: AlertStatus.ACKNOWLEDGED } : a));
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
        title="Alerts Dashboard"
        url="/"
      />

      <BreadCrumsBar breadcrumbsData={breadcrumbs} />

      {/* Stats Row */}
      <div className="stats-row alerts-severity-filters-row">
        <div className="deviation-filters alerts-severity-filters">
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
            const clsName = `deviation-chip deviation-chip--${severityClassMap[sev]}${isSelected ? ' deviation-chip--active' : ''}`;

            return (
              <button key={sev}
                className={clsName}
                onClick={handleSeverityClick}
              >
                <span className="deviation-chip__label">{sev}</span>
                <span className="deviation-chip__count">25</span>
              </button>
            );
          })}
        </div>

        <div className="alerts-table-filters">
          <FormControl size="small" className="alerts-table-filters__field" disabled={true}>
            <InputLabel id="alerts-asset-filter-label">Asset</InputLabel>
            <Select
              labelId="alerts-asset-filter-label"
              label="Asset"
              value={selectedSensorId}
              onChange={(e) => setSelectedSensorId(e.target.value as number | '')}
            >
              <MenuItem value="all">All</MenuItem>
              {availableSensors.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.display_name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" className="alerts-table-filters__field" disabled={!isAssetSelected}>
            <InputLabel id="alerts-tag-filter-label">Tag</InputLabel>
            <Select
              labelId="alerts-tag-filter-label"
              label="Tag"
              value={selectedSensorId}
              onChange={(e) => setSelectedSensorId(e.target.value as number | '')}
            >
              <MenuItem value="all">All</MenuItem>
              {availableSensors.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.display_name}</MenuItem>
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
        </div>

      </div>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress color="secondary" />
        </Box>
      ) : (<>
        {/* Alert List */}
        <div className="alert-list" style={{ paddingTop: '1rem' }}>

          {filteredAlerts?.length === 0 ? (
            <div className="empty-state">
              <InboxIcon />
              <p>No alerts found for the selected item.</p>
            </div>
          ) : (
            <div className="alerts-table-wrap">
              <Table size="small" className="alerts-table">
                <TableHead>
                  {/* Total + Acknowledge button */}
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography>
                          Total Alerts : {filteredAlerts.length}
                        </Typography>

                        <Button
                          variant="outlined"
                          size="small"
                          disabled={selectedIds.length === 0}
                          onClick={handleAcknowledge}
                          sx={{
                            my: 0.5,
                            borderColor: '#00A3E0',
                            color: '#00A3E0',
                            fontWeight: 500,
                            '&:hover': {
                              backgroundColor: '#00a4e056',
                              fontWeight: 600,
                            },
                          }}
                        >
                          Acknowledge
                        </Button>
                      </Box>
                    </TableCell>

                  </TableRow>
                  <TableRow>
                    <TableCell padding="checkbox" >
                      <Checkbox indeterminate={someSelected} checked={allSelected} onChange={handleSelectAll}
                        sx={{
                          '&.Mui-checked': {
                            color: '#00A3E0',
                          },
                          '&.MuiCheckbox-indeterminate': {
                            color: '#00A3E0',
                          },
                          '& .MuiSvgIcon-root': {
                            fontSize: 18,
                          },
                        }}
                      />
                    </TableCell>
                    {['Severity', 'Asset', 'Tag', 'Status', 'Advisory message', 'Timestamp'].map(col => (
                      <TableCell key={col}>{col}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredAlerts?.map((row) => {
                    const statusText = getStatusFromSeverity(row?.severity);
                    const badgeClsName = `severity-badge severity-s${row?.severity}`;
                    const statusClsName = tableStatusClass(statusText);
                    return (
                      <TableRow
                        key={row.id}
                        onClick={() => {
                          navigate('/dashboard', { state: { selectedNodeId: row.node_id, alertId: row.id } });
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: '#f8fafc',
                          },
                        }}
                      >
                        <TableCell padding="checkbox" >
                          <Checkbox checked={selectedIds.includes(row.id)} onClick={(e) => e.stopPropagation()}
                            onChange={() => handleSelectRow(row.id)}
                            sx={{
                              '&.Mui-checked': {
                                color: '#00A3E0',
                              },
                              '& .MuiSvgIcon-root': {
                                fontSize: 18,
                              },
                            }} />
                        </TableCell>
                        <TableCell>
                          <span className={badgeClsName}>{getSeverityLevelFull(row.severity)}</span>
                        </TableCell>
                        <TableCell>{getAssetName(row)}</TableCell>
                        <TableCell>{getComponentName(row)}</TableCell>
                        <TableCell>
                          <span className={statusClsName}>{statusText}</span>
                        </TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell>
                          {`${fmtDate(new Date(row?.timestamp))} ${fmtTime(new Date(row?.timestamp))}`}
                        </TableCell>
                      </TableRow>
                    )
                  })}

                </TableBody>
              </Table>
            </div>
          )}
        </div>

      </>
      )}
    </PageContainer>
  );
};

export default Alerts;
