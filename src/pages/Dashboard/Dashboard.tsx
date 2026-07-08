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
  { value: 'last_1h', label: 'Last Hour' },
  { value: 'last_8h', label: 'Last 8 Hours' },
  { value: 'last_24h', label: 'Last 24 Hours' },
  { value: 'last_7d', label: 'Last Week' },
  { value: 'last_30d', label: 'Last 30 Days' },
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

  const handleTimeRangeChange = (val: string) => {
    setTimeRange(val);
    const { from, to } = getDateRange(val);
    setFromDate(from);
    setToDate(to);
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

  const handleSensorExpTimeRangeChange = (val: string) => {
    setSensorExpTimeRange(val);
    const { from, to } = getDateRange(val);
    setSensorExpFrom(from); setSensorExpTo(to);
  };
  const openSensorExpanded = (sensor: HierarchyNode) => {
    setExpandedSensor(sensor);
    const { from, to } = getDateRange('last_24h');
    setSensorExpTimeRange('last_24h'); setSensorExpFrom(from); setSensorExpTo(to);
  };

  const [profile, setProfile] = useState<{ email: string; permissions: string[] } | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('user_profile');
    if (cached) {
      try {
        setProfile(JSON.parse(cached));
      } catch (e) {}
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
    if (!node || !isComplete) {
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
    setSelectedSensorIds(sensors.map(s => s.sensor_metadata?.sensor_id).filter(Boolean) as string[]);
  };

  useEffect(() => {
    if (selectedSensorIds.length === 0) { setTelemetryPoints([]); return; }
    setTelemetryLoading(true);
    api.dashboard.getTelemetry(selectedSensorIds, getHoursFromRange())
      .then(setTelemetryPoints)
      .catch(() => setTelemetryPoints([]))
      .finally(() => setTelemetryLoading(false));
  }, [selectedSensorIds, timeRange]);

  const getSensorDataPoints = (sensorId: string) =>
    telemetryPoints
      .filter(p => p.sensor_id === sensorId)
      .map(p => ({
        timestamp: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: p.value,
        name: p.sensor_name,
        alarmLimit: (p as any).alarm_limit,
        tripLimit: (p as any).trip_limit,
      }));

  const handleDropdownSelectChange = (event: any) => {
    const value = event.target.value;
    setSelectedSensorIds(typeof value === 'string' ? value.split(',') : value);
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
          <Line name={`${sensor.display_name} (${unit})`} type="monotone" dataKey="value" stroke="#92d400" strokeWidth={2} dot={false} />
          <Line name="Alarm Limit" type="monotone" dataKey="alarmLimit" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          <Line name="Trip Limit" type="monotone" dataKey="tripLimit" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const severityPriority: Record<string, number> = { critical: 1, warning: 2, info: 3 };
  const openAdvisories = advisories
    .filter(a => a.status === 'open')
    .sort((a, b) => (severityPriority[a.severity] || 99) - (severityPriority[b.severity] || 99));

  const handleAcknowledge = async (advisoryId: number) => {
    try { await api.advisories.update(advisoryId, { status: 'acknowledged' }); navigate('/advisories'); }
    catch (error) { console.error('Failed to acknowledge advisory:', error); }
  };

  const handleInitiateRca = (advisory: any) =>
    navigate(`/root-cause?advisoryId=${advisory.id}&selectedNodeName=${encodeURIComponent(advisory.asset)}`);

  // Expand dialog filter bar helper
  const renderExpandFilters = (
    tr: string, onTrChange: (v: string) => void,
    from: string, onFromChange: (v: string) => void,
    to: string, onToChange: (v: string) => void,
    onClose: () => void,
    extraRight?: React.ReactNode,
  ) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Time Range</InputLabel>
          <Select value={tr} label="Time Range" onChange={(e) => onTrChange(e.target.value)}>
            {TIME_RANGE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>

        <TextField label="From" type="datetime-local" size="small" value={from} onChange={(e) => onFromChange(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 200 }} />
        <TextField label="To" type="datetime-local" size="small" value={to} onChange={(e) => onToChange(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 200 }} />

        <Button variant="contained" color="secondary" sx={{ fontWeight: 600, flexShrink: 0 }}>Apply</Button>
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
          <FormControl size="small" sx={{ minWidth: 160 }}>
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
                  <InputLabel>Time Range</InputLabel>
                  <Select value={timeRange} label="Time Range" onChange={(e) => handleTimeRangeChange(e.target.value)}>
                    {TIME_RANGE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField
                  label="From" type="datetime-local" size="small" value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  label="To" type="datetime-local" size="small" value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 200 }}
                />
                <Box sx={{ flex: 1 }} />
                <FormControl size="small" sx={{ minWidth: 220 }} disabled={descendantSensors.length === 0}>
                  <InputLabel id="sensor-filter-dropdown-label">Filter Active Graphs</InputLabel>
                  <Select
                    labelId="sensor-filter-dropdown-label"
                    multiple value={selectedSensorIds}
                    onChange={handleDropdownSelectChange}
                    label="Filter Active Graphs"
                    renderValue={(selected) => `Active Graphs: ${(selected as string[]).length}`}
                  >
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
        <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
          {/* Left: Telemetry Charts */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Grid container spacing={3}>
              {descendantSensors.length === 0 ? (
                <Grid size={12}>
                  <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid #ccc' }}>
                    <Typography color="text.secondary">
                      No sensors defined under the selected hierarchy level. Select a level with configured sensor metadata.
                    </Typography>
                  </Paper>
                </Grid>
              ) : telemetryLoading ? (
                <Grid size={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                    <CircularProgress size={40} color="secondary" />
                  </Box>
                </Grid>
              ) : (
                descendantSensors
                  .filter(sensor => selectedSensorIds.includes(sensor.sensor_metadata?.sensor_id || ''))
                  .map(sensor => {
                    const sid = sensor.sensor_metadata?.sensor_id || '';
                    const data = getSensorDataPoints(sid);
                    const unit = sensor.sensor_metadata?.unit || '';
                    return (
                      <Grid size={12} key={sensor.id}>
                        <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid #ccc' }}>
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
                            <Box sx={{ height: 270, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #000000', borderRadius: 1 }}>
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
                    );
                  })
              )}
            </Grid>
          </Grid>

          {/* Right: Advisories */}
          <Grid size={{ xs: 12, lg: 4 }}>
            {openAdvisories.length > 0 ? (
              <Stack spacing={3}>
                {openAdvisories.map((advisory) => (
                  <Paper key={advisory.id} sx={{ p: 0, borderRadius: 2, border: '1px solid #ccc', overflow: 'hidden' }}>
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="h6" sx={{ color: 'secondary.main', fontWeight: 700, textTransform: 'uppercase' }}>
                        ADVISORY
                      </Typography>
                      <Chip
                        label={getSeverityLevelFull(advisory.severity)}
                        size="small"
                        sx={{ backgroundColor: getSeverityBgColor(advisory.severity), color: getSeverityColor(advisory.severity), fontWeight: 500, fontSize: '0.8rem', py: 2, px: 1 }}
                      />
                    </Box>
                    <Box sx={{ pb: 2, px: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{advisory.asset}</Typography>
                      <Typography variant="body2" sx={{ mb: 3, opacity: 0.95, fontWeight: 500 }}>
                        {advisory.tag} - first detected{' '}
                        {new Date(advisory.first_detected).toLocaleDateString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6, flex: 1 }}>{advisory.description}</Typography>
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        disabled={!canAcknowledge}
                        onClick={() => handleAcknowledge(advisory.id)}
                        sx={{
                          fontWeight: 600,
                          textTransform: 'none',
                          py: 1.5,
                          mb: 2,
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
                        disabled={!canRca}
                        sx={{
                          backgroundColor: '#000000',
                          color: 'white',
                          fontWeight: 600,
                          textTransform: 'none',
                          py: 1.5,
                          '&:hover': {
                            backgroundColor: '#1e293b',
                          },
                          '&.Mui-disabled': {
                            backgroundColor: '#e2e8f0',
                            color: '#94a3b8',
                          }
                        }}
                        onClick={() => handleInitiateRca(advisory)}
                      >
                        Initiate RCA →
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center', border: '1px solid #ccc' }}>
                <Typography color="text.secondary">No active optimization or maintenance advisories.</Typography>
              </Paper>
            )}
          </Grid>


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
            const data = getSensorDataPoints(sid);
            const unit = expandedSensor.sensor_metadata?.unit || '';
            return (
              <>
                {renderExpandFilters(
                  sensorExpTimeRange, handleSensorExpTimeRangeChange,
                  sensorExpFrom, setSensorExpFrom,
                  sensorExpTo, setSensorExpTo,
                  () => setExpandedSensor(null),
                  data.length > 0 ? <Chip label={`Current: ${data[data.length - 1].value} ${unit}`} color="secondary" size="small" sx={{ fontWeight: 600 }} /> : undefined,
                )}
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{expandedSensor.display_name}</Typography>
                <Box sx={{ width: '100%', height: 500 }}>
                  {renderLineChart(data, expandedSensor, 500)}
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
