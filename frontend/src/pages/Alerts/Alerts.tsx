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
  { value: 'last_1h',  label: 'Last Hour' },
  { value: 'last_8h',  label: 'Last 8 Hours' },
  { value: 'last_24h', label: 'Last 24 Hours' },
  { value: 'last_7d',  label: 'Last Week' },
  { value: 'last_30d', label: 'Last 30 Days' },
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
    alertName: 'Compressor 1 Temp Alert',
    asset: 'Compressor 1',
    sensor: 'Temperature',
    condition: 'Greater than',
    threshold: '85',
    severity: 'critical',
    status: 'open',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 102,
    alertName: 'Pump 5 Pressure Spike',
    asset: 'Pump 5',
    sensor: 'Pressure',
    condition: 'Greater than or equal',
    threshold: '120',
    severity: 'warning',
    status: 'open',
    timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: 103,
    alertName: 'Assembly Line Vibration',
    asset: 'Assembly Line',
    sensor: 'Vibration',
    condition: 'Less than',
    threshold: '8',
    severity: 'info',
    status: 'acknowledged',
    timestamp: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
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
    const { from, to } = getDateRange(val);
    setFromDate(from);
    setToDate(to);
  };

  const filteredAlerts = showActiveOnly ? alerts.filter(a => a.status === 'open' || a.status === 'active') : alerts;
  const allSelected = filteredAlerts.length > 0 && selectedIds.length === filteredAlerts.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleSelectAll = () => setSelectedIds(allSelected ? [] : filteredAlerts.map(a => a.id));

  const handleSelectRow = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleAcknowledge = () => {
    setAlerts(prev => prev.map(a => selectedIds.includes(a.id) ? { ...a, status: 'acknowledged' } : a));
    setSelectedIds([]);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Alerts"
        subtitle="Critical warnings, system diagnostics, and failure states needing immediate attention."
        actions={
          <FormControl size="small" sx={{ minWidth: 350, bgcolor: 'white', }}>
            <InputLabel id="site-select-label">Site</InputLabel>
            <Select
              labelId="site-select-label"
              value={selectedSiteId}
              label="Site"
              onChange={(e) => setSelectedSiteId(e.target.value as number)}
              disabled={hierarchyLoading}
            >
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
              onSelectionChange={() => {}}
              loading={hierarchyLoading}
              selectedSiteId={selectedSiteId}
            />
          </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="time-range-label">Time Range</InputLabel>
            <Select
              labelId="time-range-label"
              value={timeRange}
              label="Time Range"
              onChange={(e) => handleTimeRangeChange(e.target.value)}
            >
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
            onChange={(e) => setFromDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 200 }}
          />
          <TextField
            label="To"
            type="datetime-local"
            size="small"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 200 }}
          />
          <Button variant="contained" color="secondary" sx={{ minWidth: 90, fontWeight: 600, flexShrink: 0 }}>
            View
          </Button>
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
                {['Alert Name', 'Asset', 'Sensor', 'Condition', 'Threshold', 'Severity', 'Status', 'Detected At'].map(col => (
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
                  <TableCell sx={{ fontWeight: 600, borderBottom: '1px solid #ccc' }}>{row.alertName}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ccc' }}>{row.asset}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ccc' }}>{row.sensor}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ccc' }}>{row.condition}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ccc' }}>{row.threshold}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ccc' }}>
                    <Chip label={row.severity.toUpperCase()} size="small" sx={{ backgroundColor: getSeverityBgColor(row.severity), color: getSeverityColor(row.severity), fontWeight: 700 }} />
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
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
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
