import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Button,
  Drawer,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { DataTable } from '../../components/Tables/DataTable';
import { StatusChip } from '../../components/Forms/StatusChip';
import { api } from '../../api/client';

const assetOptions = [
  { value: 'compressor-1', label: 'Compressor 1' },
  { value: 'pump-5', label: 'Pump 5' },
  { value: 'assembly-line', label: 'Assembly Line' },
];

const sensorOptions = [
  { value: 'temperature', label: 'Temperature' },
  { value: 'pressure', label: 'Pressure' },
  { value: 'vibration', label: 'Vibration' },
];

const conditionOptions = [
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lte', label: 'Less than or equal' },
];

const severityOptions = [
  { value: 'critical', label: 'Critical' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'warning', label: 'Warning' },
];

const demoAlerts = [
  {
    id: 101,
    alertName: 'Compressor 1 Temp Alert',
    asset: 'Compressor 1',
    sensor: 'Temperature',
    condition: 'Greater than',
    threshold: '85',
    severity: 'critical',
    status: 'active',
    message: 'Temperature exceeded safety threshold on Compressor 1',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 102,
    alertName: 'Pump 5 Pressure Spike',
    asset: 'Pump 5',
    sensor: 'Pressure',
    condition: 'Greater than or equal',
    threshold: '120',
    severity: 'major',
    status: 'active',
    message: 'Pressure reached critical level on Pump 5',
    timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: 103,
    alertName: 'Assembly Line Vibration',
    asset: 'Assembly Line',
    sensor: 'Vibration',
    condition: 'Less than',
    threshold: '8',
    severity: 'warning',
    status: 'acknowledged',
    message: 'Vibration readings falling outside normal band',
    timestamp: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
  },
];

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>(demoAlerts);
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('compressor-1');
  const [selectedSensor, setSelectedSensor] = useState('temperature');
  const [condition, setCondition] = useState('gt');
  const [threshold, setThreshold] = useState('75');
  const [severity, setSeverity] = useState('critical');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    api.alerts.list()
      .then((res) => {
        if (res && res.length > 0) {
          setAlerts(res);
        }
      })
      .catch((err) => {
        setError('Using sample alerts; live alert feed unavailable.');
      });
  }, []);

  const columns = [
    { id: 'id', label: 'Alert ID' },
    { id: 'alertName', label: 'Alert Name' },
    { id: 'asset', label: 'Asset' },
    { id: 'sensor', label: 'Sensor' },
    { id: 'condition', label: 'Condition' },
    { id: 'threshold', label: 'Threshold' },
    {
      id: 'severity',
      label: 'Severity',
      render: (row: any) => (
        <StatusChip label={row.severity.toUpperCase()} status={row.severity} />
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row: any) => (
        <StatusChip label={row.status.toUpperCase()} status={row.status} />
      ),
    },
    {
      id: 'timestamp',
      label: 'Detected At',
      render: (row: any) => new Date(row.timestamp).toLocaleString(),
    },
  ];

  const handleOpenConfig = () => setConfigOpen(true);
  const handleCloseConfig = () => setConfigOpen(false);

  const handleAddAlertRule = () => {
    const nextId = alerts.length > 0 ? Math.max(...alerts.map((alert) => alert.id)) + 1 : 1;
    const statusText = isActive ? 'active' : 'inactive';
    const newAlert = {
      id: nextId,
      alertName: ruleName || `${assetOptions.find((a) => a.value === selectedAsset)?.label} ${sensorOptions.find((s) => s.value === selectedSensor)?.label} Alert`,
      asset: assetOptions.find((a) => a.value === selectedAsset)?.label || selectedAsset,
      sensor: sensorOptions.find((s) => s.value === selectedSensor)?.label || selectedSensor,
      condition: conditionOptions.find((c) => c.value === condition)?.label || condition,
      threshold,
      severity,
      status: statusText,
      message: `${selectedSensor.charAt(0).toUpperCase() + selectedSensor.slice(1)} ${condition === 'gt' ? 'above' : condition === 'lt' ? 'below' : condition === 'gte' ? 'at or above' : 'at or below'} ${threshold} on ${assetOptions.find((a) => a.value === selectedAsset)?.label}`,
      timestamp: new Date().toISOString(),
    };

    setAlerts((prev) => [newAlert, ...prev]);
    setRuleName('');
    setSelectedAsset('compressor-1');
    setSelectedSensor('temperature');
    setCondition('gt');
    setThreshold('75');
    setSeverity('critical');
    setIsActive(true);
    setConfigOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Active Alerts"
        subtitle="Critical warnings, system diagnostics, and failure states needing immediate attention."
        actions={
          <Button variant="contained" color="primary" onClick={handleOpenConfig}>
            Add Alert
          </Button>
        }
      />

      <Paper sx={{ background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(10px)', overflow: 'hidden' }}>
        <Box sx={{ width: '100%', p: 2 }}>
          {/* {error && (
            <Box sx={{ mb: 2, p: 2, borderRadius: 2, backgroundColor: 'rgba(220, 38, 38, 0.08)' }}>
              <Typography color="error">{error}</Typography>
            </Box>
          )} */}
          <DataTable title="System Alerts Log" columns={columns} data={alerts} />
        </Box>
      </Paper>

      <Drawer
        anchor="right"
        open={configOpen}
        onClose={handleCloseConfig}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 3 }}
      >
        <Box sx={{ width: { xs: 320, sm: 380 }, p: 3, height: '100%', backgroundColor: 'background.paper' }}>
          <Typography variant="h5" sx={{ mb: 1 }}>
            Alert Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure a rule for asset/sensor monitoring and threshold conditions.
          </Typography>

          <Stack spacing={3}>
            <TextField
              label="Rule Name"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel id="asset-label">Asset</InputLabel>
              <Select
                labelId="asset-label"
                value={selectedAsset}
                label="Asset"
                onChange={(event) => setSelectedAsset(event.target.value)}
              >
                {assetOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="sensor-label">Sensor</InputLabel>
              <Select
                labelId="sensor-label"
                value={selectedSensor}
                label="Sensor"
                onChange={(event) => setSelectedSensor(event.target.value)}
              >
                {sensorOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="condition-label">Condition</InputLabel>
              <Select
                labelId="condition-label"
                value={condition}
                label="Condition"
                onChange={(event) => setCondition(event.target.value)}
              >
                {conditionOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Threshold"
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel id="severity-label">Severity</InputLabel>
              <Select
                labelId="severity-label"
                value={severity}
                label="Severity"
                onChange={(event) => setSeverity(event.target.value)}
              >
                {severityOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={<Switch checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />}
              label="Active"
            />

            <Button variant="contained" color="primary" size="large" fullWidth onClick={handleAddAlertRule}>
              Add Alert Rule
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </PageContainer>
  );
};
export default Alerts;
