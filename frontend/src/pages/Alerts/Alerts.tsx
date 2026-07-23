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
  Card,
  TablePagination,
} from '@mui/material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { getSeverityLevel, severityClassMap, getSeverityLevelFull } from '../../constants/severity';
import { api } from '../../api/client';
import type { HierarchyNode } from '../../types/hierarchy';
import { AlertStatus, NodeType } from '../../types/enums';
import BreadCrumsBar from '../../components/BreadCrumsBar/BreadCrumsBar';
import { fmtDate, fmtTime } from '../../constants/datetimefmt';
import './Alerts.scss';

const InboxIcon = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-3h3.56c.69 1.19 1.97 2 3.45 2s2.75-.81 3.45-2H19v3zm0-5h-4.99c0 1.1-.9 1.99-2 1.99S10 15.1 10 14H5V5h14v9z" /></svg>
);
const getStatusTextFromStatus = (status: any): string => {
  if (status === AlertStatus.ACTIVE) return 'Act now';
  if (status === AlertStatus.CLOSED) return 'Watch';
  return 'Monitor';
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
  const [selectedSiteId, setSelectedSiteId] = useState<number | ''>('');

  useEffect(() => {
    if (flatNodes.length > 0 && !selectedSiteId) {
      const sitesList = flatNodes.filter(n => n.node_type === NodeType.SITE);
      setSelectedSiteId(sitesList[0]?.id || '');
    }
  }, [flatNodes, selectedSiteId]);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Filter states
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('');
  const [selectedSensorId, setSelectedSensorId] = useState<number | ''>('');

  // Applied filter states
  const [appliedAssetId, setAppliedAssetId] = useState<number | ''>('');
  const [appliedSensorId, setAppliedSensorId] = useState<number | ''>('');

  useEffect(() => {
    setLoading(true)
    api.hierarchy.list(true)
      .then(setFlatNodes)
      .catch(() => setFlatNodes([]))
      .finally(() => setLoading(false));
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
    setSelectedIds([])
    const node = flatNodes.find(n => n.id === selectedNodeId);
    if (!node || node.node_type === NodeType.SITE) {
      setAlerts([]);
      return;
    }

    setLoading(true);
    api.alerts.list({ node_id: selectedNodeId })
      .then((res) => {
        setAlerts(res || []);
        // Reset applied filters to matching tree state on sidebar selection change
        setSelectedSeverity('All');
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

  const selectedNode = useMemo(
    () => flatNodes.find(n => n.id === selectedNodeId),
    [selectedNodeId, flatNodes]
  );

  const isAssetSelected = selectedNode?.node_type === NodeType.ASSET;

  useEffect(() => {
    setSelectedAssetId('');
    setSelectedSensorId('');
  }, [selectedNodeId]);

  // Sensor/Tag dropdown options
  const availableAssets = useMemo(() => {
    if (isAssetSelected) {
      return [selectedNode];
    }

    return descendantsOfSidePanel.filter(
      n => n.node_type === NodeType.ASSET
    );
  }, [descendantsOfSidePanel, isAssetSelected, selectedNode]);

  // Sensor/Tag dropdown options
  const availableSensors = useMemo(() => {
  // Asset selected in sidebar
  if (isAssetSelected) {
    return getDescendantNodes(Number(selectedNodeId))
      .filter(n => n.node_type === NodeType.SENSOR);
  }

  // Specific Asset selected in dropdown
  if (Number(selectedAssetId)) {
    return getDescendantNodes(Number(selectedAssetId))
      .filter(n => n.node_type === NodeType.SENSOR);
  }

  // All sensors under current hierarchy
  return descendantsOfSidePanel.filter(
    n => n.node_type === NodeType.SENSOR
  );
}, [
  isAssetSelected,
  selectedAssetId,
  selectedNodeId,
  descendantsOfSidePanel,
  getDescendantNodes,
]);

  // Autopopulate and sync dropdown selections based on the side panel hierarchy node selection
  useEffect(() => {
    if (flatNodes.length === 0) return;

    if (!selectedNodeId) {
      setSelectedSensorId('');
      setSelectedAssetId('');
      setAppliedSensorId('');
      setAppliedAssetId('');
      return;
    }

    const node = flatNodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    if (node.node_type === NodeType.ASSET) {
      setSelectedAssetId(node.id);
      setAppliedAssetId(node.id);
    }
    else if (node.node_type === NodeType.SENSOR) {
      setSelectedSensorId(node.id);
      setAppliedSensorId(node.id);
    }
    else {
      if (selectedSensorId && !availableSensors.some(s => s.id === selectedSensorId)) {
        setSelectedSensorId('');
        setAppliedSensorId('');
      }
    }
  }, [selectedNodeId, flatNodes, availableSensors]);


  const handleViewClick = () => {
    let activeNodeId = selectedNodeId;

    if (Number(selectedAssetId)) {
      activeNodeId = Number(selectedAssetId);
    }
    if (Number(selectedSensorId)) {
      activeNodeId = Number(selectedSensorId);
    }

    if (!activeNodeId) {
      setAlerts([]);
      setAppliedAssetId(selectedAssetId);
      setAppliedSensorId(selectedSensorId);
      return;
    }

    const node = flatNodes.find(n => n.id === activeNodeId);
    if (!node || node.node_type === NodeType.SITE) {
      setAlerts([]);
      setAppliedAssetId(selectedAssetId);
      setAppliedSensorId(selectedSensorId);
      return;
    }

    setLoading(true);
    api.alerts.list({ node_id: activeNodeId })
      .then((res) => {
        setAlerts(res || []);
        setAppliedAssetId(selectedAssetId);
        setAppliedSensorId(selectedSensorId);
      })
      .catch(() => {
        setAlerts([]);
        setAppliedAssetId(selectedAssetId);
        setAppliedSensorId(selectedSensorId);
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
  }, [alerts, selectedNodeId, appliedSensorId, flatNodes]);

  const filteredRows = filteredAlerts?.filter((adv) => {
    const severityMatch =
      selectedSeverity === 'All' ||
      `S${adv.severity}` === selectedSeverity;

    return severityMatch;
  });

  const paginatedRows = filteredRows?.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_: any, newPage: number) => {
    setPage(newPage);
    setSelectedIds([]);
  };

  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    setSelectedIds([]);
  };

  const selectableAlerts = paginatedRows?.filter(alert => alert.status === 1);

  const allSelected =
    selectableAlerts?.length > 0 &&
    selectableAlerts?.every(alert => selectedIds.includes(alert.id));

  const someSelected =
    selectableAlerts?.some(alert => selectedIds.includes(alert.id)) &&
    !allSelected;

  const handleSelectAll = () => setSelectedIds(allSelected ? [] : selectableAlerts?.map(a => a.id));

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
      if (node?.node_type === NodeType.ASSET) return node.display_name;
      currentId = node?.parent_id;
    }
    return 'N/A';
  };

  const getComponentName = (row: any) => {
    let currentId: number | undefined = row.node_id;
    while (currentId) {
      const node = flatNodes.find(n => n.id === currentId);
      if (node?.node_type === NodeType.COMPONENT) return node.display_name;
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
            const isSelected = selectedSeverity === sev;

            const handleSeverityClick = () => {
              setSelectedSeverity(sev);
              setPage(0);
            };

            const alertCount =
              sev === 'All'
                ? alerts?.length
                : alerts?.filter(
                  alert => `S${alert.severity}` === sev
                ).length;
            const clsName = `deviation-chip deviation-chip--${severityClassMap[sev]}${isSelected ? ' deviation-chip--active' : ''}`;

            return (
              <button key={sev}
                className={clsName}
                onClick={handleSeverityClick}
              >
                <span className="deviation-chip__label">{sev}</span>
                <span className="deviation-chip__count">{alertCount}</span>
              </button>
            );
          })}
        </div>

        <div className="alerts-table-filters">
          <FormControl size="small" className="alerts-table-filters__field" 
            disabled={(availableAssets?.length === 0) || isAssetSelected}>
            <InputLabel id="alerts-asset-filter-label">Asset</InputLabel>
            <Select
              labelId="alerts-asset-filter-label"
              label="Asset"
              value={selectedAssetId == '' ? 'all': selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value as number | '')}
            >
              <MenuItem value="all">{availableAssets?.length ? 'All': 'No Assets'}</MenuItem>
              {availableAssets.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.display_name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" className="alerts-table-filters__field"
            disabled={availableSensors?.length === 0}
          >
            <InputLabel id="alerts-tag-filter-label">Sensor/Tag</InputLabel>
            <Select
              labelId="alerts-tag-filter-label"
              label="Sensor/Tag"
              value={selectedSensorId == ''? 'all' : selectedSensorId}
              onChange={(e) => setSelectedSensorId(e.target.value as number | '')}
            >
              <MenuItem value="all">{availableSensors?.length ? 'All': 'No Sensors/Tags'}</MenuItem>
              {availableSensors.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.display_name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            onClick={handleViewClick}
            sx={{ minWidth: 90, fontWeight: 600, backgroundColor: '#1a1a1a' }}
          >
            View
          </Button>
        </div>

      </div>

      <Card className="advisory-summary__grid-card">
        <Box sx={{
          mb: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Typography sx={{ fontSize: '0.9rem' }}>
            Total Selected : {selectedIds?.length}
          </Typography>

          {(selectableAlerts?.length !== 0) &&
            <Button
              variant="outlined"
              size="small"
              disabled={selectedIds.length === 0}
              onClick={handleAcknowledge}
              sx={{
                my: 0.5,
                borderColor: '#93c5fd',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                '&:disabled': {
                  backgroundColor: '#ffff',
                },
                '&:hover': {
                  backgroundColor: '#bfdbfe',
                  borderColor: '#60a5fa',
                },
              }}
            >
              Acknowledge
            </Button>
          }
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8, minHeight: '55vh' }}>
            <CircularProgress color="secondary" />
          </Box>
        ) : (<>
          <Box className="advisory-summary__grid-wrap">
            {paginatedRows?.length === 0 ? (
              <div className="empty-state">
                <InboxIcon />
                <p>No alert found for the selected item.</p>
              </div>
            ) : (
              <Table size="small" className="alerts-table">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" >
                      {(selectableAlerts?.length !== 0) &&
                        <Checkbox indeterminate={someSelected} checked={allSelected} onChange={handleSelectAll}
                          sx={{
                            '&.Mui-checked': {
                              color: '#60a5fa',
                            },
                            '&.MuiCheckbox-indeterminate': {
                              color: '#60a5fa',
                            },
                            '& .MuiSvgIcon-root': {
                              fontSize: 18,
                            },
                          }}
                        />
                      }
                    </TableCell>
                    {['Severity', 'Asset', 'Tag', 'Status', 'Advisory message', 'Timestamp'].map(col => (
                      <TableCell key={col}>{col}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedRows?.map((row) => {
                    const statusText = getStatusTextFromStatus(row?.status);
                    const badgeClsName = `severity-badge severity-s${row?.severity}`;
                    const statusClsName = tableStatusClass(statusText);
                    return (
                      <TableRow
                        key={row.id}
                        onClick={() => {
                          navigate('/dashboard', { state: { selectedNodeId: row.node_id, alertId: row.id, detected_at: row.timestamp } });
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: '#f8fafc',
                          },
                        }}
                      >
                        <TableCell padding="checkbox" >
                            <Checkbox disabled={row?.status !== 1} checked={selectedIds.includes(row.id)} 
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => handleSelectRow(row.id)}
                              sx={{
                                '&.Mui-checked': {
                                  color: '#60a5fa',
                                },
                                '& .MuiSvgIcon-root': {
                                  fontSize: 18,
                                },
                              }} />
                        </TableCell>
                        <TableCell>
                          <span className={badgeClsName}>{getSeverityLevelFull(row.severity)}</span>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{getAssetName(row)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{getComponentName(row)}</TableCell>
                        <TableCell>
                          <span className={statusClsName}>{statusText}</span>
                        </TableCell>
                        <TableCell>{row?.description ? row?.description : '-'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {`${fmtDate(new Date(row?.timestamp))} ${fmtTime(new Date(row?.timestamp))}`}
                        </TableCell>
                      </TableRow>
                    )
                  })}

                </TableBody>
              </Table>
            )}
          </Box>

          {paginatedRows && paginatedRows?.length > 0 && <TablePagination
            component="div"
            count={filteredRows?.length || 0}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
          />}

        </>)}
      </Card>

    </PageContainer>
  );
};

export default Alerts;
