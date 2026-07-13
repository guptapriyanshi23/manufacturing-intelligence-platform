import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
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
  Switch,
  FormControlLabel,
} from '@mui/material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { StatusChip } from '../../components/Forms/StatusChip';
import { getSeverityColor, getSeverityBgColor } from '../../constants/severity';
import { api } from '../../api/client';
import type { HierarchyNode } from '../../types/hierarchy';
import { HierarchySelector } from '../../components/Filters/HierarchySelector';

const TIME_RANGE_OPTIONS = [
  { value: 'last_1h',  label: 'Last 1 Hour' },
  { value: 'last_8h',  label: 'Last 8 Hours' },
  { value: 'last_24h', label: 'Last 24 Hours' },
  { value: 'last_7d',  label: 'Last Week' },
  { value: 'last_30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
];

const getDateRange = (rangeValue: string) => {
  const now = new Date();
  const map: Record<string, number> = {
    last_1h: 1, last_8h: 8, last_24h: 24, last_7d: 168, last_30d: 720,
  };
  const hours = map[rangeValue] ?? 24;
  const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 16), to: now.toISOString().slice(0, 16) };
};

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

export const Alerts: React.FC = () => {
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

  const [alerts, setAlerts] = useState<any[]>(demoAlerts);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('last_24h');
  const initial = getDateRange('last_24h');
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Active filter state selection
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);

  // Applied filter states
  const [appliedNode, setAppliedNode] = useState<HierarchyNode | null>(null);
  const [appliedFromDate, setAppliedFromDate] = useState(initial.from);
  const [appliedToDate, setAppliedToDate] = useState(initial.to);
  const [appliedTimeRange, setAppliedTimeRange] = useState('last_24h');

  useEffect(() => {
    api.hierarchy.list(true)
      .then(setFlatNodes)
      .catch(() => setFlatNodes([]))
      .finally(() => setHierarchyLoading(false));

    setLoading(true);
    api.alerts.list()
      .then((res) => { if (res?.length) setAlerts(res); })
      .catch(() => setAlerts(demoAlerts))
      .finally(() => setLoading(false));
  }, []);

  const handleTimeRangeChange = (val: string) => {
    setTimeRange(val);

    // Don't auto-update dates for custom range
    if (val !== 'custom') {
      const { from, to } = getDateRange(val);
      setFromDate(from);
      setToDate(to);
    }
  };

  const handleHierarchyChange = (node: HierarchyNode | null) => {
    setSelectedNode(node);
  };

  const handleViewClick = () => {
    setAppliedNode(selectedNode);
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    setAppliedTimeRange(timeRange);
  };

  const filteredAlerts = useMemo(() => {
    let result = [...alerts];

    // Helper to get descendant node IDs and sensor IDs
    const getDescendants = (nodeId: number) => {
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

    // 1. Filter by Active status
    if (showActiveOnly) {
      result = result.filter(a => a.status === 'active' || a.status === 'open');
    }

    // 2. Filter by Site
    if (selectedSiteId) {
      const { nodeIds, sensorIds } = getDescendants(Number(selectedSiteId));
      result = result.filter(a => 
        nodeIds.has(a.node_id) || 
        (a.sensor_id && sensorIds.has(a.sensor_id))
      );
    }

    // 3. Filter by Selected Hierarchy Node
    if (appliedNode) {
      const { nodeIds, sensorIds } = getDescendants(appliedNode.id);
      result = result.filter(a => 
        nodeIds.has(a.node_id) || 
        (a.sensor_id && sensorIds.has(a.sensor_id))
      );
    }

    // 4. Filter by Time Range / Dates
    const start = new Date(appliedFromDate).getTime();
    const end = new Date(appliedToDate).getTime();
    result = result.filter(a => {
      const t = new Date(a.timestamp).getTime();
      return t >= start && t <= end;
    });

    return result;
  }, [alerts, showActiveOnly, selectedSiteId, appliedNode, appliedFromDate, appliedToDate, flatNodes]);

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

      {/* Filters */}
      <Paper sx={{ px: 2, py: 2.5, mb: 3, border: '1px solid #ccc' }}>
        <Box sx={{ mb: 3 }}>
            <HierarchySelector
              flatNodes={flatNodes}
              onSelectionChange={handleHierarchyChange}
              loading={hierarchyLoading}
              selectedSiteId={selectedSiteId}
            />
          </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="time-range-label" shrink>Time Range</InputLabel>
            <Select
              labelId="time-range-label"
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
            disabled={timeRange !== 'custom'}
            onChange={(e) => setFromDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 200 }}
          />
          <TextField
            label="To"
            type="datetime-local"
            size="small"
            value={toDate}
            disabled={timeRange !== 'custom'}
            onChange={(e) => setToDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 200 }}
          />
          <Box sx={{ flex: 1 }} />
          <FormControlLabel
            control={
              <Switch
                checked={showActiveOnly}
                onChange={(e) => { setShowActiveOnly(e.target.checked); setSelectedIds([]); }}
                size="small"
                color="secondary"
              />
            }
            label={<Typography variant="body2">Show Active Alerts</Typography>}
          />
          <Button variant="contained" color="secondary" onClick={handleViewClick} sx={{ minWidth: 90, fontWeight: 600, flexShrink: 0 }}>
            View
          </Button>
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
                {['Alert Name', 'Alert Description', 'Asset Name', 'Sensor Name', 'Condition', 'Threshold', 'Severity', 'Status', 'Detected At'].map(col => (
                  <TableCell key={col} sx={{ fontWeight: 700, borderBottom: '1px solid #ccc' }}>{col}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAlerts.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  selected={selectedIds.includes(row.id)}
                  sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                  onClick={() => handleSelectRow(row.id)}
                >
                  <TableCell padding="checkbox" sx={{ borderBottom: '1px solid #ccc' }}>
                    <Checkbox checked={selectedIds.includes(row.id)} color="primary" onClick={(e) => e.stopPropagation()} onChange={() => handleSelectRow(row.id)} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, borderBottom: '1px solid #ccc' }}>{row.name}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ccc' }}>{row.description}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ccc' }}>{row.asset_name}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ccc' }}>{row.sensor_name}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ccc' }}>{row.condition}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ccc' }}>{row.threshold}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ccc' }}>
                    <Chip label={row.severity.toUpperCase()} size="small" sx={{ backgroundColor: getSeverityBgColor(row.severity), color: getSeverityColor(row.severity), fontWeight: 700, borderRadius: '4px' }} />
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ccc' }}>
                    <StatusChip label={row.status.toUpperCase()} status={row.status} />
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ccc' }}>
                    {new Date(row.timestamp).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {filteredAlerts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    No alerts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </PageContainer>
  );
};

export default Alerts;
