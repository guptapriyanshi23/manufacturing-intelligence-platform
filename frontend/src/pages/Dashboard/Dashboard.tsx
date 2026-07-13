import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Grid, Typography, Paper, Box, useTheme, Chip, Checkbox, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, ListItemText, Button, Stack,
  IconButton, Dialog, DialogContent, TextField,
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { OpenInFull as ExpandIcon, Close as CloseIcon } from '@mui/icons-material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { api } from '../../api/client';
import type { HierarchyNode } from '../../types/hierarchy';
import { getSeverityBgColor, getSeverityColor, getSeverityLevelFull } from '../../constants/severity';
import { PageHeader } from '../../components/Cards/PageHeader';
import { HierarchySelector } from '../../components/Filters/HierarchySelector';

const TIME_RANGE_OPTIONS = [
  { value: 'last_1h', label: 'Last 1 Hour' },
  { value: 'last_8h', label: 'Last 8 Hours' },
  { value: 'last_24h', label: 'Last 24 Hours' },
  { value: 'last_7d', label: 'Last Week' },
  { value: 'last_30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
];

const getDateRange = (rangeValue: string) => {
  const now = new Date();
  const map: Record<string, number> = { last_1h: 1, last_8h: 8, last_24h: 24, last_7d: 168, last_30d: 720 };
  const hours = map[rangeValue] ?? 24;
  const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 16), to: now.toISOString().slice(0, 16) };
};

interface TelemetryPoint {
  timestamp: string;
  sensor_id: string;
  sensor_name: string;
  value: number;
}

export const Dashboard: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const initialNodeId = searchParams.get('selectedNodeId') ? Number(searchParams.get('selectedNodeId')) : null;

  const [hierarchyLoading, setHierarchyLoading] = useState(true);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);
  const [descendantSensors, setDescendantSensors] = useState<HierarchyNode[]>([]);
  const [selectedSensorIds, setSelectedSensorIds] = useState<string[]>([]);
  const [telemetryPoints, setTelemetryPoints] = useState<TelemetryPoint[]>([]);
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [appliedSensors, setAppliedSensors] = useState<HierarchyNode[]>([]);
  const [appliedSensorIds, setAppliedSensorIds] = useState<string[]>([]);

  const [selectedSiteId, setSelectedSiteId] = useState<number | ''>('');

  const sites = React.useMemo(() => {
    return flatNodes.filter(n => n.node_type === 'site');
  }, [flatNodes]);

  React.useEffect(() => {
    if (flatNodes.length > 0) {
      const sitesList = flatNodes.filter(n => n.node_type === 'site');
      if (initialNodeId) {
        let current: HierarchyNode | undefined = flatNodes.find(n => n.id === initialNodeId);
        let siteId: number | '' = '';
        while (current) {
          if (current.node_type === 'site') {
            siteId = current.id;
            break;
          }
          const pId = current.parent_id;
          current = pId ? flatNodes.find(n => n.id === pId) : undefined;
        }
        setSelectedSiteId(siteId || sitesList[0]?.id || '');
      } else {
        if (!selectedSiteId) {
          setSelectedSiteId(sitesList[0]?.id || '');
        }
      }
    }
  }, [flatNodes, initialNodeId]);

  const initRange = getDateRange('last_24h');
  const [timeRange, setTimeRange] = useState('last_24h');
  const [fromDate, setFromDate] = useState(initRange.from);
  const [toDate, setToDate] = useState(initRange.to);
  const [appliedTimeRange, setAppliedTimeRange] = useState('last_24h');
  const [appliedFromDate, setAppliedFromDate] = useState(initRange.from);
  const [appliedToDate, setAppliedToDate] = useState(initRange.to);

  const handleTimeRangeChange = (val: string) => {
    setTimeRange(val);

    // Don't auto-update dates for custom range
    if (val !== 'custom') {
      const { from, to } = getDateRange(val);
      setFromDate(from);
      setToDate(to);
    }
  };

  const getHoursFromRange = () => {
    const map: Record<string, number> = { last_1h: 1, last_8h: 8, last_24h: 24, last_7d: 168, last_30d: 720 };
    return map[timeRange] ?? 24;
  };

  // Telemetry line chart expand state
  const [expandedSensor, setExpandedSensor] = useState<HierarchyNode | null>(null);
  const sensorExpInit = getDateRange('last_24h');
  const [sensorExpTimeRange, setSensorExpTimeRange] = useState('last_24h');
  const [sensorExpFrom, setSensorExpFrom] = useState(sensorExpInit.from);
  const [sensorExpTo, setSensorExpTo] = useState(sensorExpInit.to);
  const [expandedTelemetry, setExpandedTelemetry] = useState<TelemetryPoint[]>([]);
  const [expandedTelemetryLoading, setExpandedTelemetryLoading] = useState(false);
  const [expandedGranularity, setExpandedGranularity] = useState<string>('auto');

  const handleSensorExpTimeRangeChange = (val: string) => {
    setSensorExpTimeRange(val);
    const { from, to } = getDateRange(val);
    setSensorExpFrom(from); setSensorExpTo(to);
  };

  const openSensorExpanded = (sensor: HierarchyNode) => {
    setExpandedSensor(sensor);
    const { from, to } = getDateRange(timeRange);
    setSensorExpTimeRange(timeRange); setSensorExpFrom(from); setSensorExpTo(to);
    setExpandedGranularity('auto');
  };

  useEffect(() => {
    if (!expandedSensor) {
      setExpandedTelemetry([]);
      return;
    }
    const sid = expandedSensor.sensor_metadata?.sensor_id;
    if (!sid) return;

    setExpandedTelemetryLoading(true);
    const getExpHours = () => {
      const map: Record<string, number> = { last_1h: 1, last_8h: 8, last_24h: 24, last_7d: 168, last_30d: 720 };
      return map[sensorExpTimeRange] ?? 24;
    };

    const customStart = sensorExpTimeRange === 'custom' ? new Date(sensorExpFrom).toISOString() : undefined;
    const customEnd = sensorExpTimeRange === 'custom' ? new Date(sensorExpTo).toISOString() : undefined;

    api.dashboard.getTelemetry(
      [sid],
      getExpHours(),
      expandedGranularity === 'auto' ? undefined : expandedGranularity,
      customStart,
      customEnd
    )
      .then(setExpandedTelemetry)
      .catch(() => setExpandedTelemetry([]))
      .finally(() => setExpandedTelemetryLoading(false));
  }, [expandedSensor, sensorExpTimeRange, expandedGranularity, sensorExpFrom, sensorExpTo]);

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

  const fetchAdvisories = () => {
    api.advisories.list()
      .then((res) => setAdvisories(res))
      .catch((err) => console.error('Failed to load advisories:', err));
  };

  useEffect(() => { fetchAdvisories(); }, []);

  useEffect(() => {
    api.hierarchy.list(true)
      .then((res) => setFlatNodes(res))
      .catch(() => setFlatNodes([]))
      .finally(() => setHierarchyLoading(false));
  }, []);

  const handleHierarchyChange = (node: HierarchyNode | null, isComplete: boolean) => {
    setSelectedNode(node);
    if (!node) {
      setDescendantSensors([]);
      setSelectedSensorIds([]);
      return;
    }
    const sensors: HierarchyNode[] = [];
    const queue = [node.id];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      flatNodes.filter(n => n.parent_id === currentId).forEach(child => {
        if (child.node_type === 'sensor') sensors.push(child);
        else queue.push(child.id);
      });
    }
    if (node.node_type === 'sensor') sensors.push(node);
    setDescendantSensors(sensors);
    
    // Automatically select all active graphs if selected till component,
    // otherwise (asset or above) leave deselected by default.
    if (node.node_type === 'component') {
      setSelectedSensorIds(sensors.map(s => s.sensor_metadata?.sensor_id).filter(Boolean) as string[]);
    } else {
      setSelectedSensorIds([]);
    }
  };

  const handleViewClick = () => {
    if (selectedSensorIds.length === 0) {
      setTelemetryPoints([]);
      setAppliedSensors([]);
      setAppliedSensorIds([]);
      return;
    }
    setTelemetryLoading(true);
    const customStart = timeRange === 'custom' ? new Date(fromDate).toISOString() : undefined;
    const customEnd = timeRange === 'custom' ? new Date(toDate).toISOString() : undefined;
    api.dashboard.getTelemetry(selectedSensorIds, getHoursFromRange(), undefined, customStart, customEnd)
      .then((res) => {
        setTelemetryPoints(res);
        setAppliedSensors(descendantSensors);
        setAppliedSensorIds(selectedSensorIds);
        setAppliedTimeRange(timeRange);
        setAppliedFromDate(fromDate);
        setAppliedToDate(toDate);
      })
      .catch(() => {
        setTelemetryPoints([]);
        setAppliedSensors([]);
        setAppliedSensorIds([]);
      })
      .finally(() => setTelemetryLoading(false));
  };

  const getBucketedDataPoints = (
    points: TelemetryPoint[],
    sensorId: string,
    start: Date,
    end: Date,
    granularityStr?: string
  ) => {
    const sensorPoints = points.filter(p => p.sensor_id === sensorId);
    if (sensorPoints.length === 0) return [];

    let intervalMs = 10 * 60 * 1000; // default 10m
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (granularityStr && granularityStr !== 'auto') {
      const secondsMap: Record<string, number> = {
        '1m': 60,
        '5m': 300,
        '10m': 600,
        '1h': 3600,
        '6h': 21600,
        '1d': 86400,
      };
      if (secondsMap[granularityStr]) {
        intervalMs = secondsMap[granularityStr] * 1000;
      } else if (granularityStr === 'raw') {
        intervalMs = 60 * 1000; // raw approx 1m
      }
    } else {
      if (hours <= 2) {
        intervalMs = 60 * 1000; // 1m
      } else if (hours <= 24) {
        intervalMs = 10 * 60 * 1000; // 10m
      } else if (hours <= 168) {
        intervalMs = 60 * 60 * 1000; // 1h
      } else {
        intervalMs = 6 * 60 * 60 * 1000; // 6h
      }
    }

    const timePointsMap = new Map<number, any>();
    sensorPoints.forEach(p => {
      const pTime = new Date(p.timestamp).getTime();
      const bucketTime = Math.floor(pTime / intervalMs) * intervalMs;
      timePointsMap.set(bucketTime, p);
    });

    const bucketedPoints: any[] = [];
    const startBucket = Math.floor(start.getTime() / intervalMs) * intervalMs;
    const endBucket = Math.floor(end.getTime() / intervalMs) * intervalMs;

    for (let t = startBucket; t <= endBucket; t += intervalMs) {
      const existing = timePointsMap.get(t);
      const tDate = new Date(t);
      const timestampStr = tDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

      if (existing) {
        bucketedPoints.push({
          timestamp: timestampStr,
          value: existing.value,
          name: existing.sensor_name,
          alarmLimit: (existing as any).alarm_limit,
          tripLimit: (existing as any).trip_limit,
        });
      } else {
        bucketedPoints.push({
          timestamp: timestampStr,
          value: 0,
          name: sensorPoints[0].sensor_name,
          alarmLimit: (sensorPoints[0] as any).alarm_limit,
          tripLimit: (sensorPoints[0] as any).trip_limit,
        });
      }
    }

    return bucketedPoints;
  };

  const getSensorDataPoints = (sensorId: string) => {
    const now = new Date();
    const getAppliedHoursFromRange = () => {
      const map: Record<string, number> = { last_1h: 1, last_8h: 8, last_24h: 24, last_7d: 168, last_30d: 720 };
      return map[appliedTimeRange] ?? 24;
    };
    let start = new Date(now.getTime() - getAppliedHoursFromRange() * 60 * 60 * 1000);
    let end = now;
    if (appliedTimeRange === 'custom') {
      start = new Date(appliedFromDate);
      end = new Date(appliedToDate);
    }
    return getBucketedDataPoints(telemetryPoints, sensorId, start, end);
  };

  const handleDropdownSelectChange = (event: any) => {
    const value = event.target.value;
    const arrayValue = typeof value === 'string' ? value.split(',') : value;
    if (arrayValue.includes('__clear_all__')) {
      setSelectedSensorIds([]);
    } else {
      setSelectedSensorIds(arrayValue);
    }
  };

  const renderLineChart = (data: any[], sensor: HierarchyNode, height: number) => {
    const unit = sensor.sensor_metadata?.unit || '';
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
          <XAxis dataKey="timestamp" stroke={theme.palette.text.secondary} style={{ fontSize: 10 }} />
          <YAxis stroke={theme.palette.text.secondary} style={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #ccc', borderRadius: 6, fontSize: 12 }} />
          <Legend verticalAlign="top" height={36} />
          <Line name={`${sensor.display_name} (${unit})`} type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} dot={false} />
          <Line name="Safe Limit" type="monotone" dataKey="alarmLimit" stroke="#16A34A" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          <Line name="Threshold" type="monotone" dataKey="tripLimit" stroke="#DC2626" strokeWidth={2} strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const severityPriority: Record<string, number> = { critical: 1, warning: 2, info: 3 };
  const openAdvisories = advisories
    .filter(a => a.status === 'open')
    .sort((a, b) => (severityPriority[a.severity] || 99) - (severityPriority[b.severity] || 99));

  const handleAcknowledge = async (advisoryId: number) => {
    try {
      await api.advisories.update(advisoryId, { status: 'acknowledged' });
      const nodeParam = selectedNode ? `&nodeId=${selectedNode.id}` : '';
      navigate(`/advisories?siteId=${selectedSiteId}${nodeParam}`);
    }
    catch (error) { console.error('Failed to acknowledge advisory:', error); }
  };

  const handleInitiateRca = (advisory: any) =>
    navigate(`/root-cause?advisoryId=${advisory.id}&selectedNodeName=${encodeURIComponent(advisory.asset)}`);

  // Expand dialog filter bar helper
  const renderExpandFilters = (
    tr: string, onTrChange: (v: string) => void,
    from: string, onFromChange: (v: string) => void,
    to: string, onToChange: (v: string) => void,
    granularity: string, onGranularityChange: (v: string) => void,
    onClose: () => void,
    extraRight?: React.ReactNode,
  ) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel shrink>Time Range</InputLabel>
          <Select
            value={tr}
            label="Time Range"
            onChange={(e) => onTrChange(e.target.value)}
            displayEmpty
            renderValue={tr === '' ? () => <span style={{ color: '#9e9e9e' }}>Select</span> : undefined}
          >
            <MenuItem value="" style={{ color: '#9e9e9e' }}>Select</MenuItem>
            {TIME_RANGE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel shrink>Granularity</InputLabel>
          <Select
            value={granularity}
            label="Granularity"
            onChange={(e) => onGranularityChange(e.target.value)}
            displayEmpty
            renderValue={granularity === '' ? () => <span style={{ color: '#9e9e9e' }}>Select</span> : undefined}
          >
            <MenuItem value="" style={{ color: '#9e9e9e' }}>Select</MenuItem>
            <MenuItem value="auto">Auto</MenuItem>
            <MenuItem value="raw">Raw Data</MenuItem>
            <MenuItem value="1m">1 Minute</MenuItem>
            <MenuItem value="5m">5 Minutes</MenuItem>
            <MenuItem value="10m">10 Minutes</MenuItem>
            <MenuItem value="1h">1 Hour</MenuItem>
            <MenuItem value="6h">6 Hours</MenuItem>
            <MenuItem value="1d">1 Day</MenuItem>
          </Select>
        </FormControl>

        <TextField label="From" type="datetime-local" size="small" value={from} 
          onChange={(e) => onFromChange(e.target.value)} disabled={sensorExpTimeRange !== 'custom'}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 200 }} />
        <TextField label="To" type="datetime-local" size="small" value={to} 
          onChange={(e) => onToChange(e.target.value)} disabled={sensorExpTimeRange !== 'custom'}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 200 }} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {extraRight}
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Box>
    </Box>
  );

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Dashboard"
        subtitle="Anomalous tags are shown by default, stacked one below the other. Use the dropdown to browse any other parameter on this asset — anomaly or not."
        actions={
          <FormControl size="small" sx={{ minWidth: 350, bgcolor: 'white', }}>
            <InputLabel id="site-select-label" shrink>Site</InputLabel>
            <Select
              labelId="site-select-label"
              value={selectedSiteId}
              label="Site"
              onChange={(e) => setSelectedSiteId(e.target.value as number | '')}
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
      <Box sx={{ mb: 4 }}>
        <Paper sx={{ px: 2, py: 2.5, borderRadius: 2, border: '1px solid #ccc' }}>
          <Grid container spacing={3} sx={{ alignItems: 'center' }}>
            <Grid size={12}>
              <HierarchySelector
                flatNodes={flatNodes}
                onSelectionChange={handleHierarchyChange}
                initialNodeId={initialNodeId}
                loading={hierarchyLoading}
                selectedSiteId={selectedSiteId}
              />
            </Grid>
            <Grid size={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel shrink>Time Range</InputLabel>
                  <Select
                    value={timeRange}
                    label="Time Range"
                    onChange={(e) => handleTimeRangeChange(e.target.value)}
                    displayEmpty
                    renderValue={timeRange === '' ? () => <span style={{ color: '#9e9e9e' }}>Select</span> : undefined}
                  >
                    <MenuItem value="" style={{ color: '#9e9e9e' }}>Select</MenuItem>
                    {TIME_RANGE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField
                  label="From" type="datetime-local" size="small" value={fromDate}
                  disabled={timeRange !== 'custom'}
                  onChange={(e) => setFromDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  label="To" type="datetime-local" size="small" value={toDate}
                  disabled={timeRange !== 'custom'}
                  onChange={(e) => setToDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 200 }}
                />
                <Box sx={{ flex: 1 }} />
                <FormControl size="small" sx={{ minWidth: 220 }} disabled={descendantSensors.length === 0}>
                  <InputLabel id="sensor-filter-dropdown-label" shrink>Filter Active Graphs</InputLabel>
                  <Select
                    labelId="sensor-filter-dropdown-label"
                    multiple value={selectedSensorIds}
                    onChange={handleDropdownSelectChange}
                    label="Filter Active Graphs"
                    displayEmpty
                    renderValue={(selected) => {
                      const arr = selected as string[];
                      return arr.length === 0 ? <span style={{ color: '#9e9e9e' }}>Select</span> : `Active Graphs: ${arr.length}`;
                    }}
                  >
                    <MenuItem value="__clear_all__">
                      <ListItemText primary="Clear All" sx={{ color: 'text.secondary', fontStyle: 'italic' }} />
                    </MenuItem>
                    {descendantSensors.map((sensor) => {
                      const sid = sensor.sensor_metadata?.sensor_id || '';
                      if (!sid) return null;
                      return (
                        <MenuItem key={sensor.id} value={sid}>
                          <Checkbox checked={selectedSensorIds.includes(sid)} color="secondary" />
                          <ListItemText primary={`${sensor.display_name} (${sid})`} />
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleViewClick}
                  disabled={selectedSensorIds.length === 0}
                  sx={{ fontWeight: 700, px: 3, py: 1, ml: 1 }}
                >
                  View
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {hierarchyLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress size={40} color="secondary" />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {appliedSensors.length === 0 && telemetryPoints.length === 0 && !telemetryLoading ? (
            <Grid size={12}>
              <Paper sx={{ p: 6, textAlign: 'center', border: '1px solid #ccc', borderRadius: 2 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                  No Telemetry Data Loaded
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Please customize your hierarchy level, time range, or active graphs and click the <strong>View</strong> button to load charts.
                </Typography>
              </Paper>
            </Grid>
          ) : telemetryLoading ? (
            <Grid size={12}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <CircularProgress size={40} color="secondary" />
              </Box>
            </Grid>
          ) : appliedSensors.length === 0 ? (
            <Grid size={12}>
              <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid #ccc' }}>
                <Typography color="text.secondary">
                  No sensors defined under the selected hierarchy level. Select a level with configured sensor metadata.
                </Typography>
              </Paper>
            </Grid>
          ) : (
            appliedSensors
              .filter(sensor => appliedSensorIds.includes(sensor.sensor_metadata?.sensor_id || ''))
              .sort((a, b) => {
                const aSid = a.sensor_metadata?.sensor_id || '';
                const bSid = b.sensor_metadata?.sensor_id || '';
                const aAdvisory = openAdvisories.find(adv => adv.sensor_id === aSid);
                const bAdvisory = openAdvisories.find(adv => adv.sensor_id === bSid);
                
                const aPriority = aAdvisory ? (severityPriority[aAdvisory.severity] || 99) : 99;
                const bPriority = bAdvisory ? (severityPriority[bAdvisory.severity] || 99) : 99;
                
                return aPriority - bPriority;
              })
              .map(sensor => {
                const sid = sensor.sensor_metadata?.sensor_id || '';
                const data = getSensorDataPoints(sid);
                const unit = sensor.sensor_metadata?.unit || '';
                const matchingAdvisory = openAdvisories.find(a => a.sensor_id === sid);

                return (
                  <Grid size={12} key={sensor.id}>
                    <Grid container spacing={3} alignItems="stretch">
                      {/* Chart Area */}
                      <Grid size={{ xs: 12, lg: 8 }}>
                        <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid #ccc', height: '100%', display: 'flex', flexDirection: 'column' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>{sensor.display_name}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {data.length > 0 && (
                                <Chip label={`Current: ${data[data.length - 1].value} ${unit}`} color="secondary" size="small" sx={{ fontWeight: 600 }} />
                              )}
                              <IconButton size="small" onClick={() => openSensorExpanded(sensor)} title="Expand">
                                <ExpandIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                          {data.length === 0 ? (
                            <Box sx={{ flex: 1, minHeight: 270, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #000000', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                No telemetry data received for this sensor in the last 24 hours.
                              </Typography>
                            </Box>
                          ) : (
                            <Box sx={{ width: '100%', height: 270 }}>
                              {renderLineChart(data, sensor, 270)}
                            </Box>
                          )}
                        </Paper>
                      </Grid>

                      {/* Matching Advisory Column */}
                      {matchingAdvisory ? (
                        <Grid size={{ xs: 12, lg: 4 }}>
                          <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid #ccc', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Typography variant="subtitle2" sx={{ color: 'secondary.main', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                                  ADVISORY
                                </Typography>
                                <Chip
                                  label={getSeverityLevelFull(matchingAdvisory.severity)}
                                  size="small"
                                  sx={{ backgroundColor: getSeverityBgColor(matchingAdvisory.severity), color: getSeverityColor(matchingAdvisory.severity), fontWeight: 600, fontSize: '0.75rem', height: 24, px: 0.5, borderRadius: '4px' }}
                                />
                              </Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, lineHeight: 1.2 }}>{matchingAdvisory.asset}</Typography>
                              <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: 'text.secondary', fontWeight: 500 }}>
                                First detected: {new Date(matchingAdvisory.first_detected).toLocaleDateString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  lineHeight: 1.5,
                                  color: 'text.primary',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 5,
                                  WebkitBoxOrient: 'vertical'
                                }}
                              >
                                {matchingAdvisory.description}
                              </Typography>
                            </Box>
                            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                              <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                size="small"
                                disabled={!canAcknowledge}
                                onClick={() => handleAcknowledge(matchingAdvisory.id)}
                                sx={{
                                  fontWeight: 600,
                                  textTransform: 'none',
                                  fontSize: '0.8rem',
                                  py: 1,
                                  '&.Mui-disabled': {
                                    backgroundColor: '#e2e8f0',
                                    color: '#94a3b8',
                                  }
                                }}
                              >
                                Acknowledge
                              </Button>
                              <Button
                                fullWidth
                                variant="contained"
                                size="small"
                                disabled={!canRca}
                                sx={{
                                  backgroundColor: '#000000',
                                  color: 'white',
                                  fontWeight: 600,
                                  textTransform: 'none',
                                  fontSize: '0.8rem',
                                  py: 1,
                                  '&:hover': {
                                    backgroundColor: '#1e293b',
                                  },
                                  '&.Mui-disabled': {
                                    backgroundColor: '#e2e8f0',
                                    color: '#94a3b8',
                                  }
                                }}
                                onClick={() => handleInitiateRca(matchingAdvisory)}
                              >
                                RCA →
                              </Button>
                            </Box>
                          </Paper>
                        </Grid>
                      ) : (
                        <Grid size={{ xs: 12, lg: 4 }}>
                          <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid #ccc', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#f8fafc', borderStyle: 'dashed' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                              No Advisory
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                              This sensor is operating within safe parameters. No active advisories.
                            </Typography>
                          </Paper>
                        </Grid>
                      )}
                    </Grid>
                  </Grid>
                );
              })
          )}
        </Grid>
      )}

      {/* Expanded telemetry line chart dialog */}
      <Dialog
        open={!!expandedSensor}
        onClose={() => setExpandedSensor(null)}
        maxWidth={false}
        fullWidth
        slotProps={{ paper: { sx: { width: '95vw', maxWidth: '95vw', m: 2, border: '1px solid #000000', borderRadius: 2 } } }}
      >
        <DialogContent sx={{ p: 3 }}>
          {expandedSensor && (() => {
            const sid = expandedSensor.sensor_metadata?.sensor_id || '';
            const getExpStartEnd = () => {
              const now = new Date();
              const map: Record<string, number> = { last_1h: 1, last_8h: 8, last_24h: 24, last_7d: 168, last_30d: 720 };
              const hours = map[sensorExpTimeRange] ?? 24;
              let sTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
              let eTime = now;
              if (sensorExpTimeRange === 'custom') {
                sTime = new Date(sensorExpFrom);
                eTime = new Date(sensorExpTo);
              }
              return { start: sTime, end: eTime };
            };
            const { start, end } = getExpStartEnd();
            const data = getBucketedDataPoints(expandedTelemetry, sid, start, end, expandedGranularity);
            const unit = expandedSensor.sensor_metadata?.unit || '';
            return (
              <>
                {renderExpandFilters(
                  sensorExpTimeRange, handleSensorExpTimeRangeChange,
                  sensorExpFrom, setSensorExpFrom,
                  sensorExpTo, setSensorExpTo,
                  expandedGranularity, setExpandedGranularity,
                  () => setExpandedSensor(null),
                  data.length > 0 ? <Chip label={`Current: ${data[data.length - 1].value} ${unit}`} color="secondary" size="small" sx={{ fontWeight: 600 }} /> : undefined,
                )}
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{expandedSensor.display_name}</Typography>
                <Box sx={{ width: '100%', height: 500, position: 'relative' }}>
                  {expandedTelemetryLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress size={40} color="secondary" />
                    </Box>
                  ) : data.length === 0 ? (
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        No telemetry data found for the selected time range and granularity.
                      </Typography>
                    </Box>
                  ) : (
                    renderLineChart(data, expandedSensor, 500)
                  )}
                </Box>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>


    </PageContainer>
  );
};

export default Dashboard;
