import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import BarChartIcon from '@mui/icons-material/BarChart';
import { Autocomplete, Box, Button, Card, Checkbox, Chip, IconButton, Modal, TextField, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';

import OrgTreePanel, { type OrgTreeNode } from '../org-tree/OrgTreePanel';
import '../alerts/Alerts.scss';
import './ProcessAnalysis.scss';

interface AlertSummary {
  id: string;
  assetTag: string;
  machineName: string;
  plantId: string;
  machineId: string;
  severity: string;
  status: string;
  timestamp?: Date;
  description?: string;
}

interface ProcessAnalysisProps {
  alert?: AlertSummary | null;
  onBack?: () => void;
}

/* Icons (copied from Alerts) */
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" /></svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" /></svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M10 17l5-5-5-5v10z" /></svg>
);

const PLANT_LABELS: Record<string, string> = {
  'plant-1': 'Plant Machining',
  'plant-2': 'Plant Uitilities',
};

const ALL_ALERTS: AlertSummary[] = [
  { id: '6', assetTag: 'Bearing Vibration', severity: 'S1 - High Severity', description: 'Compressor pressure spike outside safe operating region.', machineName: 'ID Fan #2', plantId: 'plant-2', machineId: 'p2-m1', timestamp: new Date('2026-07-02T10:30:00'), status: 'Unresolved' },
  { id: '7', assetTag: 'Bearing Temperature', severity: 'S2 - High Severity', description: 'Rotor vibration envelope crossed warning boundary.', machineName: 'ID Fan #2', plantId: 'plant-2', machineId: 'p2-m1', timestamp: new Date('2026-07-02T11:00:00'), status: 'Unresolved' },
  { id: '8', assetTag: 'Motor Current', severity: 'S3 - Moderate Severity', description: 'Bearing temperature remains elevated above baseline.', machineName: 'ID Fan #2', plantId: 'plant-2', machineId: 'p2-m1', timestamp: new Date('2026-07-02T11:15:00'), status: 'Resolved' },
  { id: '9', assetTag: 'AT-009', severity: 'S5 - Low Severity', description: 'Minor pressure offset observed in final stage valve.', machineName: 'Process Unit 3', plantId: 'plant-2', machineId: 'p2-m3', timestamp: new Date('2026-07-02T11:30:00'), status: 'Resolved' },
];

const CHART_OPTIONS = [
  'Bearing temperature',
  'Bearing vibration',
  'Motor current',
  'Shaft displacement',
];

function fmtDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(date: Date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const ProcessAnalysis: React.FC<ProcessAnalysisProps> = ({ alert: alertProp }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<OrgTreeNode | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCharts, setSelectedCharts] = useState<string[]>(['Bearing temperature']);
  const alert = alertProp || (location.state as { alert?: AlertSummary })?.alert || null;
  const [isRcaModalOpen, setIsRcaModalOpen] = useState(false);
  const [uploadedImageNames, setUploadedImageNames] = useState<string[]>([]);
  const [uploadedImagePreviewUrls, setUploadedImagePreviewUrls] = useState<string[]>([]);
  const [rootCauseDescription, setRootCauseDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const breadcrumb = useMemo(() => {
    if (alert && !selectedNode) {
      // Breadcrumb for navigated alert
      const plantLabel = PLANT_LABELS[alert.plantId ?? ''] ?? alert.plantId ?? '';
      const crumbs = ['Organization'];
      if (plantLabel) crumbs.push(plantLabel);
      if (alert.machineName) crumbs.push(alert.machineName);
      if (alert.assetTag) crumbs.push(alert.assetTag);
      return crumbs;
    }
    if (!selectedNode) return ['Organization'];
    const { type, plantId } = selectedNode.data;
    if (type === 'plant') return ['Organization', selectedNode.label];
    if (type === 'machine') return ['Organization', PLANT_LABELS[plantId ?? ''] ?? plantId ?? '', selectedNode.label];
    if (type === 'alert') return ['Organization', PLANT_LABELS[plantId ?? ''] ?? plantId ?? '', selectedNode.label];
    return ['Organization'];
  }, [selectedNode, alert]);

  const orgAlertCounts = useMemo(() => ALL_ALERTS, []);

  // Temperature data - with S1 critical anomaly detected below alarm threshold
  const temperatureData = [
    { timestamp: '2026-06-22 06:00', actual: 62.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-22 11:51', actual: 65.5, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-22 17:42', actual: 70.0, predicted_twin: 61, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-22 23:34', actual: 75.5, predicted_twin: 61, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 05:25', actual: 79.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 11:16', actual: 82.5, predicted_twin: 61, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 17:08', actual: 78.5, predicted_twin: 62, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 22:59', actual: 73.0, predicted_twin: 61, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-24 04:50', actual: 67.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-24 10:42', actual: 63.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
  ];

  // Vibration data - sine wave staying within safe range (max 82)
  const vibrationData = [
    { timestamp: '2026-06-22 06:00', actual: 64.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-22 11:51', actual: 66.5, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-22 17:42', actual: 64.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-22 23:34', actual: 68.5, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 05:25', actual: 71.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 11:16', actual: 72.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 17:08', actual: 70.5, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 22:59', actual: 66.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-24 04:50', actual: 62.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-24 10:42', actual: 63.5, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
  ];

  // Motor current data - sine wave staying within safe range (max 80)
  const motorCurrentData = [
    { timestamp: '2026-06-22 06:00', actual: 60.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-22 11:51', actual: 65.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-22 17:42', actual: 70.5, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-22 23:34', actual: 75.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 05:25', actual: 78.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 11:16', actual: 80.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 17:08', actual: 78.5, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 22:59', actual: 74.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-24 04:50', actual: 68.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-24 10:42', actual: 61.5, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
  ];

  // Shaft displacement data - sine wave staying within safe range (max 83)
  const shaftDisplacementData = [
    { timestamp: '2026-06-22 06:00', actual: 64.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-22 11:51', actual: 70.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-22 17:42', actual: 75.5, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-22 23:34', actual: 79.5, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 05:25', actual: 82.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 11:16', actual: 83.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 17:08', actual: 81.5, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-23 22:59', actual: 77.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-24 04:50', actual: 71.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
    { timestamp: '2026-06-24 10:42', actual: 65.0, predicted_twin: 60, alarm_limit: 85, trip_limit: 95 },
  ];

  // Helper function to get data for specific parameter
  const getChartData = (chartName: string) => {
    switch (chartName) {
      case 'Bearing temperature':
        return temperatureData;
      case 'Bearing vibration':
        return vibrationData;
      case 'Motor current':
        return motorCurrentData;
      case 'Shaft displacement':
        return shaftDisplacementData;
      default:
        return temperatureData;
    }
  };

  const timeLabels = temperatureData.map(d => {
    const date = new Date(d.timestamp);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  });
  
  // Temperature chart data
  const actualData = temperatureData.map(d => d.actual);
  const predictedTwinData = temperatureData.map(d => d.predicted_twin);
  const alarmLimitData = temperatureData.map(d => d.alarm_limit);
  const tripLimitData = temperatureData.map(d => d.trip_limit);

  // Critical severity detection (S1 - anomaly detected when divergence exceeds threshold)
  // Anomaly is detected well below alarm limit through digital twin comparison
  const criticalPoints = temperatureData.map((d) => {
    // S1 Critical: when actual diverges significantly from predicted twin (>20°C difference)
    // This catches incipient failures before they reach conventional alarm limits
    const divergence = Math.abs(d.actual - d.predicted_twin);
    if (divergence > 20) {
      return d.actual;
    }
    return null;
  });

  const handleNodeSelected = (node: OrgTreeNode) => {
    setSelectedNode(node);

    if (node.data.type === 'alert' && node.data.alertId) {
      const matchedAlert = ALL_ALERTS.find(
        (alert) => alert.id === node.data.alertId && alert.machineId === node.data.machineId,
      );
      if (matchedAlert) {
        navigate('/process-analysis', { state: { alert: matchedAlert } });
      }
    }
  };

  const handleAcknowledge = () => {
    // Placeholder for API integration.
    // eslint-disable-next-line no-console
    console.log('Advisory acknowledged');
  };

  const handleRcaImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    uploadedImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));

    setUploadedImageNames(selectedFiles.map((file) => file.name));
    setUploadedImagePreviewUrls(selectedFiles.map((file) => URL.createObjectURL(file)));
  };

  const handleSaveRca = () => {
    // Placeholder for API integration.
    // eslint-disable-next-line no-console
    console.log({ uploadedImageNames, rootCauseDescription, actionTaken });
    setIsRcaModalOpen(false);
  };

  const handleDeleteUploadedImage = (indexToDelete: number) => {
    const urlToDelete = uploadedImagePreviewUrls[indexToDelete];
    if (urlToDelete) {
      URL.revokeObjectURL(urlToDelete);
    }

    setUploadedImagePreviewUrls((prev) => prev.filter((_, index) => index !== indexToDelete));
    setUploadedImageNames((prev) => prev.filter((_, index) => index !== indexToDelete));
  };

  useEffect(() => {
    return () => {
      uploadedImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [uploadedImagePreviewUrls]);

  return (
    <Box sx={{ p: '1rem' }}>
      <div className="dashboard-layout">

        {/* ── Left Panel: Org Tree ── */}
        <aside className="left-panel">
          <OrgTreePanel onNodeSelected={handleNodeSelected} alerts={orgAlertCounts} />
        </aside>

        {/* ── Right Panel ── */}
        <section className="right-panel">
          {/* Page Title */}
          <div className="page-title">
            <BarChartIcon sx={{ color: '#0076A8' }} />
            <h1>Twin Dashboard</h1>
          </div>

          {/* Breadcrumb Bar */}
          <div className="breadcrumb-bar">
            <div className="breadcrumb-bar__crumbs">
              {breadcrumb.map((crumb, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="breadcrumb-bar__sep"><ChevronRightIcon /></span>}
                  <span className={i === breadcrumb.length - 1 ? 'breadcrumb-bar__item breadcrumb-bar__item--active' : 'breadcrumb-bar__item'}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
            <div className="breadcrumb-bar__datetime">
              <CalendarIcon />
              <span>{fmtDate(currentTime)}</span>
              <span className="breadcrumb-bar__time-sep">|</span>
              <ClockIcon />
              <span>{fmtTime(currentTime)}</span>
            </div>
          </div>

          {/* Chart Selection Dropdown */}
          <Box sx={{ mb: 2 }}>
            <Autocomplete
              multiple
              options={CHART_OPTIONS}
              value={selectedCharts}
              onChange={(_, newValue) => setSelectedCharts(newValue)}
              disableCloseOnSelect
              renderValue={() => null}
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox checked={selected} sx={{ mr: 1 }} />
                  {option}
                </li>
              )}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Browse other parameters" 
                  placeholder={selectedCharts.length > 0 ? `${selectedCharts.length} parameter(s) selected` : "Choose variables"} 
                  size="small" 
                />
              )}
              sx={{ maxWidth: 600 }}
            />
          </Box>

          {/* Charts and Content */}
          <Box sx={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            {/* Charts Area - 70% */}
            <Box sx={{ flex: '0 0 70%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Dedicated Bearing Temperature Chart with Critical Detection */}
              <Card className="process-analysis__chart-card">
                <Box className="process-analysis__chart-header" sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography className="process-analysis__chart-title">
                    Bearing temperature - <span className="chart-subtitle">anomaly detected below alarm threshold via digital twin divergence</span>
                  </Typography>
                  <Chip label="S1 - Critical" sx={{ backgroundColor: '#fecdd3', color: '#7f1d1d', fontWeight: 600 }} size="small" />
                </Box>

                <Box sx={{ height: 300, position: 'relative' }}>
                  <LineChart
                    height={300}
                    xAxis={[{ data: timeLabels, scaleType: 'point' }]}
                    yAxis={[{ min: 50, max: 100 }]}
                    series={[
                      { data: actualData, label: 'Actual', color: '#26890D', showMark: true },
                      { data: predictedTwinData, label: 'Predicted Twin', color: '#657bfa', showMark: false },
                      { data: alarmLimitData, label: 'Alarm Limit', color: '#ff8c00', showMark: false, curve: 'linear' },
                      { data: tripLimitData, label: 'Trip Limit', color: 'red', showMark: false, curve: 'linear' },
                      {
                        data: criticalPoints,
                        label: 'S1 Critical',
                        color: '#dc2626',
                        showMark: true,
                        shape: 'star',
                        type: 'line',
                      },
                    ]}
                    slotProps={{ legend: { position: { vertical: 'top', horizontal: 'center' } } }}
                    sx={{
                      '& .MuiLineElement-series-4': {
                        strokeWidth: 0,
                      },
                      '& .MuiMarkElement-series-4': {
                        r: 10,
                      },
                    }}
                  />
                  {/* S1 Critical Label */}
                  <Box
                    className="process-analysis__s1-label"
                    sx={{
                      position: 'absolute',
                      top: '35%',
                      left: '56%',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
                      zIndex: 10,
                      border: '2px solid #991b1b',
                    }}
                  >
                    S1 CRITICAL
                  </Box>
                </Box>
              </Card>

              <Card className="process-analysis__chart-card">
                <Box className="process-analysis__chart-header" sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography className="process-analysis__chart-title">
                    Bearing temperature - <span className="chart-subtitle">actual vs trip limit</span>
                  </Typography>
                  <Chip label="S1 - Critical" sx={{ backgroundColor: '#fecdd3', color: '#7f1d1d', fontWeight: 600 }} size="small" />
                </Box>

                <Box sx={{ height: 300, position: 'relative' }}>
                  <LineChart
                    height={300}
                    xAxis={[{ data: timeLabels, scaleType: 'point' }]}
                    yAxis={[{ min: 50, max: 100 }]}
                    series={[
                      { data: actualData, label: 'Actual', color: '#26890D', showMark: true },
                      { data: tripLimitData, label: 'Trip Limit', color: 'red', showMark: false, curve: 'linear' },
                      {
                        data: criticalPoints,
                        label: 'S1 Critical',
                        color: '#dc2626',
                        showMark: true,
                        shape: 'star',
                        type: 'line',
                      },
                    ]}
                    slotProps={{ legend: { position: { vertical: 'top', horizontal: 'center' } } }}
                    sx={{
                      '& .MuiLineElement-series-2': {
                        strokeWidth: 0,
                      },
                      '& .MuiMarkElement-series-2': {
                        r: 10,
                      },
                    }}
                  />
                   {/* S1 Critical Label */}
                  <Box
                    className="process-analysis__s1-label"
                    sx={{
                      position: 'absolute',
                      top: '35%',
                      left: '56%',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
                      zIndex: 10,
                      border: '2px solid #991b1b',
                    }}
                  >
                    S1 CRITICAL
                  </Box>
                </Box>
              </Card>

              {/* Other Selected Charts */}
              {selectedCharts.filter(name => name !== 'Bearing temperature').map((chartName) => {
                const paramData = getChartData(chartName);
                const paramActualData = paramData.map(d => d.actual);
                const paramPredictedTwinData = paramData.map(d => d.predicted_twin);
                const paramAlarmLimitData = paramData.map(d => d.alarm_limit);
                const paramTripLimitData = paramData.map(d => d.trip_limit);

                // Assign severity based on parameter
                const getSeverityForParam = (paramName: string) => {
                  if (paramName === 'Bearing vibration') return { label: 'S4 - Low', bgColor: '#fefce8', textColor: '#854d0e' };
                  if (paramName === 'Motor current') return { label: 'S5 - Informational', bgColor: '#f1f5f9', textColor: '#475569' };
                  if (paramName === 'Shaft displacement') return { label: 'S4 - Low', bgColor: '#fefce8', textColor: '#854d0e' };
                  return { label: 'S5 - Informational', bgColor: '#f1f5f9', textColor: '#475569' };
                };

                const severity = getSeverityForParam(chartName);

                return (
                  <Card key={chartName} className="process-analysis__chart-card">
                    <Box className="process-analysis__chart-header" sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography className="process-analysis__chart-title">
                        {chartName} - <span className="chart-subtitle">twin vs. actual vs. alarm/trip limits</span>
                      </Typography>
                      <Chip label={severity.label} sx={{ backgroundColor: severity.bgColor, color: severity.textColor, fontWeight: 600 }} size="small" />
                    </Box>

                    <Box sx={{ height: 300 }}>
                      <LineChart
                        height={300}
                        xAxis={[{ data: timeLabels, scaleType: 'point' }]}
                        yAxis={[{ min: 50, max: 100 }]}
                        series={[
                          { data: paramActualData, label: 'Actual', color: '#26890D', showMark: true },
                          { data: paramPredictedTwinData, label: 'Predicted Twin', color: '#657bfa', showMark: false },
                          { data: paramAlarmLimitData, label: 'Alarm Limit', color: '#ff8c00', showMark: false, curve: 'linear' },
                          { data: paramTripLimitData, label: 'Trip Limit', color: 'red', showMark: false, curve: 'linear' },
                        ]}
                        slotProps={{ legend: { position: { vertical: 'top', horizontal: 'center' } } }}
                      />
                    </Box>
                  </Card>
                );
              })}
            </Box>

            {/* Advisory Area - 30% */}
            <Card className="process-analysis__chart-card process-analysis__advisory-card" sx={{ flex: '0 0 30%' }}>
              <Box className="process-analysis__chart-header" sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography className="process-analysis__chart-title">Advisory</Typography>
                <Chip label="S1 - Critical" sx={{ backgroundColor: '#fecdd3', color: '#7f1d1d', fontWeight: 600 }} size="small" />
              </Box>

              <Box className="process-analysis__advisory-content">
                <Typography className="process-analysis__advisory-alert-title">Bearing Temperature</Typography>
                <Typography className="process-analysis__advisory-description">
                  Isolation Forest flagged a multivariate anomaly — sensor readings diverged from the learned normal cluster. Score 0.81 exceeds the configured threshold of 0.60. The bearing temperature peaked at 82.5°C, well below the conventional alarm limit of 85°C — this is an incipient failure caught early through digital twin analysis, enabling predictive maintenance before equipment damage occurs.
                </Typography>

                <Box className="process-analysis__advisory-actions">
                  <Button variant="outlined" size="small" onClick={handleAcknowledge}>Acknowledge</Button>
                  <Button variant="contained" size="small" onClick={() => setIsRcaModalOpen(true)}>Initiate RCA</Button>
                </Box>
              </Box>
            </Card>
          </Box>
        </section>
      </div>

      <Modal open={isRcaModalOpen} onClose={() => setIsRcaModalOpen(false)}>
        <Box className="process-analysis__rca-modal">
          <Typography variant="h6" className="process-analysis__rca-title">Initiate RCA</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
              ID Fan #2 - Bearing Temperature -
            </Typography>
            <Chip 
              label="S1 - Critical" 
              sx={{ 
                backgroundColor: '#fecdd3', 
                color: '#7f1d1d', 
                fontWeight: 600,
                fontSize: '0.85rem',
                height: '24px'
              }} 
              size="small" 
            />
          </Box>
          <div className="chart-subtitle">Deviation breached the advisory threshold for this tag</div>
          <Box className="process-analysis__rca-field-group">
            <Button variant="outlined" component="label" size="small">
              Upload Images
              <input type="file" accept="image/*" multiple hidden onChange={handleRcaImageChange} />
            </Button>
            <Typography className="process-analysis__rca-file-name">
              {uploadedImageNames.length > 0 ? `${uploadedImageNames.length} image(s) selected` : 'No file selected'}
            </Typography>
          </Box>

          {uploadedImagePreviewUrls.length > 0 && (
            <Box className="process-analysis__rca-image-previews">
              {uploadedImagePreviewUrls.map((previewUrl, index) => (
                <Box key={`${previewUrl}-${index}`} className="process-analysis__rca-image-preview-wrap">
                  <IconButton
                    size="small"
                    className="process-analysis__rca-image-delete"
                    onClick={() => handleDeleteUploadedImage(index)}
                    aria-label={`Delete uploaded image ${index + 1}`}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                  <img
                    src={previewUrl}
                    alt={`Uploaded advisory preview ${index + 1}`}
                    className="process-analysis__rca-image-preview"
                  />
                </Box>
              ))}
            </Box>
          )}

          <Box className="process-analysis__rca-text-row">
            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Root cause description"
              value={rootCauseDescription}
              onChange={(event) => setRootCauseDescription(event.target.value)}
            />

            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Action Taken"
              value={actionTaken}
              onChange={(event) => setActionTaken(event.target.value)}
            />
          </Box>

          <Box className="process-analysis__rca-actions">
            <Button variant="contained" className="process-analysis__rca-cancel-btn" onClick={() => setIsRcaModalOpen(false)}>Cancel</Button>
            <Button variant="contained" className="process-analysis__rca-save-btn" onClick={handleSaveRca}>Save</Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default ProcessAnalysis;
