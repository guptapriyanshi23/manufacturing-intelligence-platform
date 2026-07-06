import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Grid,
  Typography,
  Paper,
  Box,
  useTheme,
  Chip,
  Checkbox,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemText,
  Button,
  Stack
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { PageContainer } from '../../components/Cards/PageContainer';
import { api } from '../../api/client';
import type { HierarchyNode } from '../../types/hierarchy';

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
  const selectedNodeId = searchParams.get('selectedNodeId');

  const [loading, setLoading] = useState(true);
  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);
  const [descendantSensors, setDescendantSensors] = useState<HierarchyNode[]>([]);
  const [selectedSensorIds, setSelectedSensorIds] = useState<string[]>([]);
  const [telemetryPoints, setTelemetryPoints] = useState<TelemetryPoint[]>([]);
  const [advisories, setAdvisories] = useState<any[]>([]);

  const fetchAdvisories = () => {
    api.advisories.list()
      .then((res) => setAdvisories(res))
      .catch((err) => console.error("Failed to load advisories:", err));
  };

  useEffect(() => {
    fetchAdvisories();
  }, []);

  // 1. Fetch flat hierarchy nodes
  useEffect(() => {
    setLoading(true);
    api.hierarchy.list(true)
      .then((res) => {
        setFlatNodes(res);
        setLoading(false);
      })
      .catch(() => {
        setFlatNodes([]);
        setLoading(false);
      });
  }, []);

  // 2. Identify selected node and collect child sensors recursively
  useEffect(() => {
    if (flatNodes.length === 0) return;

    let targetNodeId = selectedNodeId ? Number(selectedNodeId) : null;
    
    // If no node selected, default to the first enterprise or root node to show all sensors
    if (!targetNodeId) {
      const rootNode = flatNodes.find(n => !n.parent_id);
      if (rootNode) targetNodeId = rootNode.id;
    }

    if (targetNodeId) {
      const sensors: HierarchyNode[] = [];
      const queue = [targetNodeId];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = flatNodes.filter(n => n.parent_id === currentId);
        children.forEach(child => {
          if (child.node_type === 'sensor') {
            sensors.push(child);
          } else {
            queue.push(child.id);
          }
        });
      }

      // Check if target node itself is a sensor
      const selfNode = flatNodes.find(n => n.id === targetNodeId);
      if (selfNode && selfNode.node_type === 'sensor') {
        sensors.push(selfNode);
      }

      setDescendantSensors(sensors);
      // Auto-select all discovered child sensors to show them by default
      const sensorDbIds = sensors.map(s => s.sensor_metadata?.sensor_id).filter(Boolean) as string[];
      setSelectedSensorIds(sensorDbIds);
    }
  }, [selectedNodeId, flatNodes]);

  // 3. Query telemetry points for selected sensors
  useEffect(() => {
    if (selectedSensorIds.length === 0) {
      setTelemetryPoints([]);
      return;
    }

    setLoading(true);
    api.dashboard.getTelemetry(selectedSensorIds, 24)
      .then((points) => {
        setTelemetryPoints(points);
        setLoading(false);
      })
      .catch(() => {
        setTelemetryPoints([]);
        setLoading(false);
      });
  }, [selectedSensorIds]);

  // Group telemetry points by sensor_id for rendering charts
  const getSensorDataPoints = (sensorId: string) => {
    return telemetryPoints
      .filter(p => p.sensor_id === sensorId)
      .map(p => ({
        timestamp: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: p.value,
        name: p.sensor_name,
        alarmLimit: (p as any).alarm_limit,
        tripLimit: (p as any).trip_limit
      }));
  };

  const handleDropdownSelectChange = (event: any) => {
    const value = event.target.value;
    setSelectedSensorIds(typeof value === 'string' ? value.split(',') : value);
  };

  // Find label of currently selected root node
  const activeNode = flatNodes.find(n => n.id === Number(selectedNodeId)) || flatNodes[0];

  const severityPriority: Record<string, number> = {
    critical: 1,
    warning: 2,
    info: 3,
  };

  const openAdvisories = advisories
    .filter((a) => a.status === 'open')
    .sort((a, b) => {
      const pA = severityPriority[a.severity] || 99;
      const pB = severityPriority[b.severity] || 99;
      return pA - pB;
    });

  const handleAcknowledge = async (advisoryId: number) => {
    try {
      await api.advisories.update(advisoryId, { status: 'acknowledged' });
      navigate('/advisories');
    } catch (error) {
      console.error('Failed to acknowledge advisory:', error);
    }
  };

  const handleInitiateRca = (advisory: any) => {
    navigate(
      `/root-cause?advisoryId=${advisory.id}&selectedNodeName=${encodeURIComponent(
        advisory.asset
      )}`
    );
  };

  return (
    <PageContainer>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid #000000' }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {activeNode ? activeNode.display_name : 'Global Operations'} Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
                Anomalous tags are shown by default, stacked one below the other. Use the dropdown to browse any other parameter on this asset — anomaly or not.
              </Typography>
            </Grid>
            
            {/* Filter Dropdown in Top-Right */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              {descendantSensors.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 260 }}>
                  <InputLabel id="sensor-filter-dropdown-label">Filter Active Graphs</InputLabel>
                  <Select
                    labelId="sensor-filter-dropdown-label"
                    multiple
                    value={selectedSensorIds}
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
              )}
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {loading && telemetryPoints.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress size={40} color="secondary" />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Left Column: Telemetry Charts */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Grid container spacing={3}>
              {descendantSensors.length === 0 ? (
                <Grid size={12}>
                  <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid #000000' }}>
                    <Typography color="text.secondary">
                      No sensors defined under the selected hierarchy level. Select a level with configured sensor metadata.
                    </Typography>
                  </Paper>
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
                        <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid #000000' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {sensor.display_name}
                            </Typography>
                            {data.length > 0 && (
                              <Chip
                                label={`Current: ${data[data.length - 1].value} ${unit}`}
                                color="secondary"
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                          </Box>
                          
                          {data.length === 0 ? (
                            <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #000000', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                No telemetry data received for this sensor in the last 24 hours.
                              </Typography>
                            </Box>
                          ) : (
                            <Box sx={{ width: '100%', height: 280 }}>
                              <ResponsiveContainer>
                                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                                  <XAxis dataKey="timestamp" stroke={theme.palette.text.secondary} style={{ fontSize: 10 }} />
                                  <YAxis stroke={theme.palette.text.secondary} style={{ fontSize: 10 }} />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: '#ffffff',
                                      border: '1px solid #000000',
                                      borderRadius: 6,
                                      fontSize: 12
                                    }}
                                  />
                                  <Legend verticalAlign="top" height={36} />
                                  <Line
                                    name={`${sensor.display_name} (${unit})`}
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#92d400"
                                    strokeWidth={2}
                                    dot={false}
                                  />
                                  <Line
                                    name="Alarm Limit"
                                    type="monotone"
                                    dataKey="alarmLimit"
                                    stroke="#F59E0B"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                  />
                                  <Line
                                    name="Trip Limit"
                                    type="monotone"
                                    dataKey="tripLimit"
                                    stroke="#EF4444"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </Box>
                          )}
                        </Paper>
                      </Grid>
                    );
                  })
              )}
            </Grid>
          </Grid>

          {/* Right Column: Dynamic Advisories */}
          <Grid size={{ xs: 12, lg: 4 }}>
            {openAdvisories.length > 0 ? (
              <Stack spacing={3}>
                {openAdvisories.map((advisory) => (
                  <Paper key={advisory.id} sx={{ p: 0, borderRadius: 2, border: '1px solid #000000', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        backgroundColor:
                          advisory.severity === 'critical'
                            ? '#B91C1C'
                            : advisory.severity === 'warning'
                            ? '#D97706'
                            : '#2563EB',
                        p: 2,
                      }}
                    >
                      <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, textTransform: 'uppercase' }}>
                        ADVISORY - {advisory.severity}
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                        {advisory.asset}
                      </Typography>

                      <Typography variant="body2" sx={{ mb: 3, opacity: 0.95, fontWeight: 500 }}>
                        {advisory.tag} - first detected{' '}
                        {new Date(advisory.first_detected).toLocaleDateString([], {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>

                      <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.6 }}>
                        {advisory.description}
                      </Typography>

                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        onClick={() => handleAcknowledge(advisory.id)}
                        sx={{
                          fontWeight: 600,
                          textTransform: 'none',
                          py: 1.5,
                          mb: 2,
                        }}
                      >
                        Acknowledge
                      </Button>

                      <Button
                        fullWidth
                        variant="contained"
                        sx={{
                          backgroundColor: '#000000',
                          color: 'white',
                          fontWeight: 600,
                          textTransform: 'none',
                          py: 1.5,
                          '&:hover': {
                            backgroundColor: '#1e293b',
                          },
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
              <Paper sx={{ p: 3, textAlign: 'center', border: '1px solid #000000' }}>
                <Typography color="text.secondary">No active optimization or maintenance advisories.</Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}
    </PageContainer>
  );
};

export default Dashboard;
