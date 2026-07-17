import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { StatusChip } from '../../components/Forms/StatusChip';
import { api } from '../../api/client';
import { getSeverityColor, getSeverityBgColor, severityOptions, getSeverityLevelFull } from '../../constants/severity';
import { statusOptions } from '../../constants/status';
import type { HierarchyNode } from '../../types/hierarchy';
import { AdvisoryStatus, NodeType, TimeRange, TIME_RANGE_OPTIONS } from '../../types/enums';
import BreadCrumsBar from '../../components/BreadCrumsBar/BreadCrumsBar';

const getDateRange = (rangeValue: string) => {
  const now = new Date();
  const map: Record<string, number> = {
    [TimeRange.LAST_1H]: 1,
    [TimeRange.LAST_8H]: 8,
    [TimeRange.LAST_24H]: 24,
    [TimeRange.LAST_7D]: 168,
    [TimeRange.LAST_30D]: 720,
  };
  const hours = map[rangeValue] ?? 24;
  const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 16), to: now.toISOString().slice(0, 16) };
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

const mapToSeverityOption = (sev: string | number): string => {
  const s = typeof sev === 'string' ? sev.toLowerCase() : sev;
  if (s === 1 || s === 'critical') return 'critical';
  if (s === 2 || s === 'high') return 'high';
  if (s === 3 || s === 'warning' || s === 'medium') return 'warning';
  if (s === 4 || s === 'low') return 'low';
  if (s === 5 || s === 'info' || s === 'informational') return 'info';
  return 'info';
};

export const Advisories: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);


  const context = useOutletContext<{ selectedNodeId?: number | null }>();
  const treeNodeId = context?.selectedNodeId ?? (location.state?.selectedNodeId ? Number(location.state.selectedNodeId) : null);
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dropdown states (selection state, not applied immediately)
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [selectedSensorId, setSelectedSensorId] = useState<number | ''>('');
  const [timeRange, setTimeRange] = useState<string>(TimeRange.LAST_24H);
  const initial = getDateRange(TimeRange.LAST_24H);
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);

  // Applied states (updates only when 'View' button is clicked)
  const [appliedStatus, setAppliedStatus] = useState<string>('');
  const [appliedSeverity, setAppliedSeverity] = useState<string>('');
  const [appliedSensorId, setAppliedSensorId] = useState<number | ''>('');
  const [appliedTimeRange, setAppliedTimeRange] = useState<string>(TimeRange.LAST_24H);
  const [appliedFromDate, setAppliedFromDate] = useState(initial.from);
  const [appliedToDate, setAppliedToDate] = useState(initial.to);
  const [appliedNode, setAppliedNode] = useState<HierarchyNode | null>(null);

  const descendantsOfSidePanel = useMemo(() => {
    if (!treeNodeId) return flatNodes;
    const getDescendants = (nodeId: number) => {
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
          flatNodes.filter(n => n.parent_id === id).forEach(n => queue.push(n.id));
        }
      }
      return result;
    };
    return getDescendants(treeNodeId);
  }, [treeNodeId, flatNodes]);

  const availableSensors = useMemo(() => {
    return descendantsOfSidePanel.filter(n => n.node_type === NodeType.SENSOR);
  }, [descendantsOfSidePanel]);

  const isAssetSelected = useMemo(() => {
    return flatNodes.find(n => n.id === treeNodeId)?.node_type === NodeType.ASSET;
  }, [treeNodeId, flatNodes]);

  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  useEffect(() => {
    if (treeNodeId && flatNodes.length > 0) {
      setBreadcrumbs(getBreadcrumbsPath(treeNodeId, flatNodes));
    } else {
      setBreadcrumbs([]);
    }
  }, [treeNodeId, flatNodes]);

  useEffect(() => {
    if (location.state?.prefilledStatus || location.state?.prefilledSeverity) {
      if (location.state.prefilledStatus) {
        setStatusFilter(location.state.prefilledStatus);
        setAppliedStatus(location.state.prefilledStatus);
      }
      if (location.state.prefilledSeverity) {
        const mappedSev = mapToSeverityOption(location.state.prefilledSeverity);
        setSeverityFilter(mappedSev);
        setAppliedSeverity(mappedSev);
      }
      // Clean up prefilled context from history state so subsequent actions act normally
      window.history.replaceState({ ...location.state, prefilledStatus: undefined, prefilledSeverity: undefined }, '');
      return;
    }

    const saved = localStorage.getItem('advisories_applied_filters');
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        if (filters.status) {
          setStatusFilter(filters.status);
          setAppliedStatus(filters.status);
        }
        if (filters.severity) {
          setSeverityFilter(filters.severity);
          setAppliedSeverity(filters.severity);
        }
        if (filters.timeRange) {
          setTimeRange(filters.timeRange);
          setAppliedTimeRange(filters.timeRange);
        }
        if (filters.fromDate) {
          setFromDate(filters.fromDate);
          setAppliedFromDate(filters.fromDate);
        }
        if (filters.toDate) {
          setToDate(filters.toDate);
          setAppliedToDate(filters.toDate);
        }
      } catch (e) { }
    }
  }, [location.state]);

  useEffect(() => {
    if (flatNodes.length === 0) return;
    const matchingNode = treeNodeId ? flatNodes.find(n => n.id === treeNodeId) : null;
    setAppliedNode(matchingNode || null);

    if (treeNodeId) {
      setSelectedSensorId('');
      setAppliedSensorId('');
    }
  }, [treeNodeId, flatNodes]);

  const [selectedAdvisory, setSelectedAdvisory] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [profile, setProfile] = useState<{ email: string; permissions: string[] } | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('user_profile');
    if (cached) {
      try {
        setProfile(JSON.parse(cached));
      } catch (e) { }
    }
  }, []);

  const canAcknowledge = profile?.permissions.includes('advisories:acknowledge') ?? false;
  const canRca = profile?.permissions.includes('advisories:rca') ?? false;

  useEffect(() => {
    api.hierarchy.list(true)
      .then(setFlatNodes)
      .catch(() => setFlatNodes([]));
  }, []);

  // Reactive effect to fetch advisories from server whenever applied filters change
  useEffect(() => {
    if (appliedNode === null) {
      setAdvisories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const targetNodeId = appliedSensorId ? Number(appliedSensorId) : appliedNode.id;

    let startIso: string | undefined = undefined;
    let endIso: string | undefined = undefined;

    if (appliedTimeRange === TimeRange.CUSTOM) {
      if (appliedFromDate) startIso = new Date(appliedFromDate).toISOString();
      if (appliedToDate) endIso = new Date(appliedToDate).toISOString();
    } else {
      const range = getDateRange(appliedTimeRange);
      startIso = new Date(range.from).toISOString();
      endIso = new Date(range.to).toISOString();
    }

    api.advisories.list({
      node_id: targetNodeId,
      status: appliedStatus,
      severity: appliedSeverity,
      start_time: startIso,
      end_time: endIso,
    })
      .then((res) => { setAdvisories(res); setLoading(false); })
      .catch((err) => { console.error('Failed to fetch advisories:', err); setLoading(false); });
  }, [appliedNode, appliedStatus, appliedSeverity, appliedSensorId, appliedTimeRange, appliedFromDate, appliedToDate]);

  const filteredRows = advisories;

  const handleTimeRangeChange = (val: string) => {
    setTimeRange(val);
    if (val !== TimeRange.CUSTOM) {
      const { from, to } = getDateRange(val);
      setFromDate(from);
      setToDate(to);
    }
  };

  const handleApplyFilters = () => {
    setAppliedStatus(statusFilter);
    setAppliedSeverity(severityFilter);
    setAppliedSensorId(selectedSensorId);
    setAppliedTimeRange(timeRange);
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);

    localStorage.setItem('advisories_applied_filters', JSON.stringify({
      status: statusFilter,
      severity: severityFilter,
      timeRange: timeRange,
      fromDate: fromDate,
      toDate: toDate,
    }));
  };



  const handleRowClick = (advisory: any) => { setSelectedAdvisory(advisory); setDetailsOpen(true); };
  const handleCloseDetails = () => { setDetailsOpen(false); setSelectedAdvisory(null); };

  const handleAcknowledgeFromDetails = async (advisoryId: number) => {
    try {
      await api.advisories.update(advisoryId, { status: AdvisoryStatus.ACKNOWLEDGED });
      if (appliedNode) {
        api.advisories.list({
          node_id: appliedNode.id,
          status: appliedStatus,
          severity: appliedSeverity
        })
          .then(setAdvisories)
          .catch((err) => console.error('Failed to refresh advisories:', err));
      }
      handleCloseDetails();
    } catch (error) {
      console.error('Failed to acknowledge advisory:', error);
    }
  };

  const handleInitiateRcaFromDetails = (advisory: any) => {
    handleCloseDetails();
    navigate('/root-cause', { state: { advisoryId: advisory.id, selectedNodeName: advisory.asset } });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Advisory Summary"
        url="/advisories"
      />

      <BreadCrumsBar breadcrumbsData={breadcrumbs}/>

      <Paper sx={{ px: 2, py: 2.5, mb: 3, border: '1px solid #ccc' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>

          <FormControl sx={{ flex: 1, minWidth: 0 }} size="small">
            <InputLabel id="status-filter-label" shrink>Status</InputLabel>
            <Select
              labelId="status-filter-label"
              value={statusFilter}
              label="Status"
              onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
              displayEmpty
              renderValue={(selected) =>
                selected ? (String(selected) === AdvisoryStatus.IN_PROGRESS ? 'In Progress' : String(selected).charAt(0).toUpperCase() + String(selected).slice(1)) : <span style={{ color: '#9e9e9e' }}>Select</span>
              }
            >
              <MenuItem value="" style={{ color: '#9e9e9e' }}>Select</MenuItem>
              {statusOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option === AdvisoryStatus.IN_PROGRESS ? 'In Progress' : option.charAt(0).toUpperCase() + option.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ flex: 1, minWidth: 0 }} size="small">
            <InputLabel id="severity-filter-label" shrink>Severity</InputLabel>
            <Select
              labelId="severity-filter-label"
              value={severityFilter}
              label="Severity"
              onChange={(e: SelectChangeEvent) => setSeverityFilter(e.target.value)}
              displayEmpty
              renderValue={(selected) =>
                selected ? String(selected).charAt(0).toUpperCase() + String(selected).slice(1) : <span style={{ color: '#9e9e9e' }}>Select</span>
              }
            >
              <MenuItem value="" style={{ color: '#9e9e9e' }}>Select</MenuItem>
              {severityOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ flex: 1, minWidth: 0 }} size="small" disabled={!isAssetSelected}>
            <InputLabel id="sensor-filter-label" shrink>Sensor/Tag</InputLabel>
            <Select
              labelId="sensor-filter-label"
              value={selectedSensorId}
              label="Sensor/Tag"
              onChange={(e) => setSelectedSensorId(e.target.value as number | '')}
              displayEmpty
            >
              <MenuItem value="">All Sensors/Tags</MenuItem>
              {availableSensors.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.display_name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flex: 1.2, minWidth: 160 }}>
            <InputLabel shrink>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              displayEmpty
              renderValue={timeRange === '' ? () => <span style={{ color: '#9e9e9e' }}>Select</span> : undefined}
            >
              <MenuItem value="" style={{ color: '#9e9e9e' }}>Select</MenuItem>
              {TIME_RANGE_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="From"
            type="datetime-local"
            size="small"
            value={fromDate}
            disabled={timeRange !== TimeRange.CUSTOM}
            onChange={(e) => setFromDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: 1.5, minWidth: 180 }}
          />

          <TextField
            label="To"
            type="datetime-local"
            size="small"
            value={toDate}
            disabled={timeRange !== TimeRange.CUSTOM}
            onChange={(e) => setToDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: 1.5, minWidth: 180 }}
          />

          <Button
            variant="contained"
            color="secondary"
            onClick={handleApplyFilters}
            sx={{ minWidth: 100, fontWeight: 700, ml: 1 }}
          >
            View
          </Button>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress color="secondary" />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{ backgroundColor: '#ffffff', boxShadow: 'none', border: '1px solid #ccc' }}
        >
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                {['Sensor Name', 'Asset', 'Severity', 'Status', 'Action taken', 'Detected At'].map(col => (
                  <TableCell key={col} sx={{ color: 'text.secondary', fontWeight: 700, borderBottom: '1px solid #ccc' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {appliedNode === null ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    Please select a hierarchy node from the left tree panel to display advisories.
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    No advisories match the current filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => handleRowClick(row)}
                    sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                  >
                    <TableCell sx={{ color: 'text.primary', fontWeight: 600, borderBottom: '1px solid #ccc' }}>
                      {row.sensor_name || '—'}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid #ccc' }}>
                      {row.asset}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #ccc' }}>
                      <Chip
                        label={getSeverityLevelFull(row.severity).toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: getSeverityBgColor(row.severity),
                          color: getSeverityColor(row.severity),
                          fontWeight: 700,
                          minWidth: 32,
                          justifyContent: 'center',
                          borderRadius: '4px',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #ccc' }}>
                      <StatusChip label={row.status.toUpperCase()} status={row.status} />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid #ccc' }}>
                      {row.action_taken || '—'}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid #ccc' }}>
                      {row.detected_at
                        ? new Date(row.detected_at).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Advisory Details Modal */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { border: '1px solid #ccc', borderRadius: 2 } } }}
      >
        {selectedAdvisory && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', pb: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{selectedAdvisory.asset}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={getSeverityLevelFull(selectedAdvisory.severity).toUpperCase()}
                  size="small"
                  sx={{
                    backgroundColor: getSeverityBgColor(selectedAdvisory.severity),
                    color: getSeverityColor(selectedAdvisory.severity),
                    fontWeight: 700,
                    borderRadius: '4px',
                  }}
                />
                <StatusChip label={selectedAdvisory.status.toUpperCase()} status={selectedAdvisory.status} />
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3, mt: 2 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Sensor Name</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedAdvisory.sensor_name || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Anomaly Description</Typography>
                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>{selectedAdvisory.description}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>First Detected</Typography>
                  <Typography variant="body1">
                    {selectedAdvisory.detected_at && !isNaN(new Date(selectedAdvisory.detected_at).getTime())
                      ? new Date(selectedAdvisory.detected_at).toLocaleString()
                      : '—'}
                  </Typography>
                </Box>
                {selectedAdvisory.root_cause_description && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Root Cause Description</Typography>
                    <Typography variant="body1" sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1 }}>
                      {selectedAdvisory.root_cause_description}
                    </Typography>
                  </Box>
                )}
                {selectedAdvisory.action_taken && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Action Taken</Typography>
                    <Typography variant="body1" sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1 }}>
                      {selectedAdvisory.action_taken}
                    </Typography>
                  </Box>
                )}
                {selectedAdvisory.image_path && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>RCA Evidence / Image</Typography>
                    <Box
                      component="img"
                      src={
                        selectedAdvisory.image_path.startsWith('http')
                          ? selectedAdvisory.image_path
                          : `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}${selectedAdvisory.image_path}`
                      }
                      alt="RCA Evidence"
                      sx={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 1, border: '1px solid #e2e8f0', mt: 1 }}
                    />
                  </Box>
                )}
              </Stack>
            </DialogContent>

            <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2 }}>
              {selectedAdvisory.status === AdvisoryStatus.OPEN && (
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!canAcknowledge}
                  onClick={() => handleAcknowledgeFromDetails(selectedAdvisory.id)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    '&.Mui-disabled': {
                      backgroundColor: '#e2e8f0',
                      color: '#94a3b8',
                    }
                  }}
                >
                  Acknowledge
                </Button>
              )}
              {selectedAdvisory.status !== AdvisoryStatus.RESOLVED && (
                <Button
                  variant="contained"
                  color="secondary"
                  disabled={!canRca}
                  sx={{
                    fontWeight: 600,
                    textTransform: 'none',
                    '&.Mui-disabled': {
                      backgroundColor: '#e2e8f0',
                      color: '#94a3b8',
                    }
                  }}
                  onClick={() => handleInitiateRcaFromDetails(selectedAdvisory)}
                >
                  Initiate RCA
                </Button>
              )}
              <Button variant="outlined" color='secondary' sx={{ textTransform: 'none', fontWeight: 600 }} onClick={handleCloseDetails} >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </PageContainer>
  );
};

export default Advisories;
