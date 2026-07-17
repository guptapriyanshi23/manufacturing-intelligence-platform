import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, Button, Typography, CircularProgress,
  MenuItem, Select, FormControl, InputLabel, TextField, Paper,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
// import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
// import { MetricCard } from '../../components/Cards/MetricCard';
import { api } from '../../api/client';
import { getSeverityColor, getSeverityLevel, SEVERITY_LEVEL_MAP } from '../../constants/severity';
import type { HierarchyNode } from '../../types/hierarchy';
import { getStatusColor } from '../../constants/status';
import '../alerts/Alerts.scss';
import './Reports.scss';

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
  const map: Record<string, number> = {
    last_1h: 1, last_8h: 8, last_24h: 24, last_7d: 168, last_30d: 720,
  };
  const hours = map[rangeValue] ?? 24;
  const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 16), to: now.toISOString().slice(0, 16) };
};

const ReportIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
);
const BellIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>
);
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
);
const WarningIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
);

const REPORT_ROWS: any[] = [
  { id: 'r1', scope: 'Plant Machining', timestamp: new Date('2026-07-01T10:30:00'), severity: 'S1', status: 'Open' },
  { id: 'r2', scope: 'Plant Machining', timestamp: new Date('2026-07-01T16:00:00'), severity: 'S2', status: 'Resolved' },
  { id: 'r3', scope: 'Plant Machining', timestamp: new Date('2026-07-02T08:40:00'), severity: 'S3', status: 'Open' },
  { id: 'r4', scope: 'Plant Utilities', timestamp: new Date('2026-07-02T11:20:00'), severity: 'S1', status: 'Open' },
  { id: 'r5', scope: 'Plant Utilities', timestamp: new Date('2026-07-03T09:35:00'), severity: 'S4', status: 'Resolved' },
  { id: 'r6', scope: 'Plant Utilities', timestamp: new Date('2026-07-03T15:10:00'), severity: 'S2', status: 'Acknowledged' },
  { id: 'r7', scope: 'Plant Machining', timestamp: new Date('2026-07-04T12:10:00'), severity: 'S5', status: 'Resolved' },
  { id: 'r8', scope: 'Plant Utilities', timestamp: new Date('2026-07-04T18:00:00'), severity: 'S3', status: 'Open' },
  { id: 'r9', scope: 'Plant Machining', timestamp: new Date('2026-07-05T10:05:00'), severity: 'S2', status: 'Resolved' },
  { id: 'r10', scope: 'Plant Utilities', timestamp: new Date('2026-07-05T13:45:00'), severity: 'S4', status: 'Open' },
];


export const Reports: React.FC = () => {
  const location = useLocation();
  const treeNodeId = location.state?.selectedNodeId ? Number(location.state.selectedNodeId) : null;
  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);

  // Applied filter states
  const [appliedNode, setAppliedNode] = useState<HierarchyNode | null>(null);
  const [timeRange, setTimeRange] = useState('last_24h');
  const initial = getDateRange('last_24h');
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [appliedFromDate, setAppliedFromDate] = useState(initial.from);
  const [appliedToDate, setAppliedToDate] = useState(initial.to);

  // const [scope, setScope] = useState('all');

  const scopeOptions = useMemo(
    () => Array.from(new Set(REPORT_ROWS.map((row) => row.scope))).sort(),
    [],
  );

  useEffect(() => {
    if (flatNodes.length === 0) return;
    const matchingNode = treeNodeId ? flatNodes.find(n => n.id === treeNodeId) : null;
    setAppliedNode(matchingNode || null);
  }, [treeNodeId, flatNodes]);

  const [advisories, setAdvisories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.advisories.list()
      .then((res) => { setAdvisories(res); setLoading(false); })
      .catch(() => setLoading(false));
    api.hierarchy.list(true)
      .then(setFlatNodes)
      .catch(() => setFlatNodes([]));
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

  const handleGenerateClick = () => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  };

  const filteredAdvisories = useMemo(() => {
    let result = [...advisories];

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

    // Filter by Selected Hierarchy Node
    if (appliedNode) {
      const { nodeIds, sensorIds } = getDescendants(appliedNode.id);
      result = result.filter(a => 
        nodeIds.has(a.node_id) || 
        (a.sensor_id && sensorIds.has(a.sensor_id))
      );
    }

    // 3. Filter by Time Range / Dates
    const start = new Date(appliedFromDate).getTime();
    const end = new Date(appliedToDate).getTime();
    result = result.filter(a => {
      const detectedTime = a.detected_at ? new Date(a.detected_at).getTime() : NaN;
      if (isNaN(detectedTime)) return false;
      return detectedTime >= start && detectedTime <= end;
    });

    return result;
  }, [advisories, appliedNode, appliedFromDate, appliedToDate, flatNodes]);

  const total = filteredAdvisories.length;
  const openCount = filteredAdvisories.filter(a => a.status === 'open').length;
  const ackCount = filteredAdvisories.filter(a => a.status === 'acknowledged').length;
  const resolvedCount = filteredAdvisories.filter(a => a.status === 'resolved').length;
  const inProgressCount = filteredAdvisories.filter(a => a.status === 'in_progress').length;
  const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';

  const severityChartData = Object.keys(SEVERITY_LEVEL_MAP)
    .map(sev => ({
      severity: getSeverityLevel(sev),
      count: filteredAdvisories.filter(a => a.severity === sev).length,
      originalSeverity: sev,
    }))
    .filter((d, i, arr) => arr.findIndex(x => x.severity === d.severity) === i)
    .sort((a, b) => a.severity.localeCompare(b.severity));

  const statusChartData = [
    { status: 'Open', key: 'open', count: openCount },
    { status: 'Acknowledged', key: 'acknowledged', count: ackCount },
    { status: 'In Progress', key: 'in_progress', count: inProgressCount },
    { status: 'Resolved', key: 'resolved', count: resolvedCount },
  ];

  return (
    <Box className='reporting-analysis'>
      <PageHeader
        title="Advisory Report"
        url="/reports"
      />

       <Box className="reporting-analysis__filters-grid">
          {/* <FormControl size="small" fullWidth>
            <InputLabel id="scope-filter-label">Scope</InputLabel>
            <Select
              labelId="scope-filter-label"
              value={scope}
              label="Scope"
              onChange={(event) => setScope(event.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              {scopeOptions.map((item) => (
                <MenuItem key={item} value={item}>{item}</MenuItem>
              ))}
            </Select>
          </FormControl> */}

          <FormControl size="small">
            <InputLabel id="time-range-label">Time Range</InputLabel>
            <Select
              labelId="time-range-label"
              value={timeRange}
              label="Time Range"
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              // displayEmpty
              // renderValue={timeRange === '' ? () => <span style={{ color: '#9e9e9e' }}>Select</span> : undefined}
            >
              <MenuItem value="">Select</MenuItem>
              {TIME_RANGE_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="From Date"
            type="datetime-local"
            size="small"
            value={fromDate}
            disabled={timeRange !== 'custom'}
            onChange={(e) => setFromDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />

          <TextField
            label="To Date"
            type="datetime-local"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={toDate}
            disabled={timeRange !== 'custom'}
            onChange={(event) => setToDate(event.target.value)}
            fullWidth
          />
        
          <Button
            variant="contained"
            className="reporting-analysis__generate-btn"
            onClick={handleGenerateClick}
            sx={{ 
              backgroundColor: 'var(--color-primary) !important',
              '&:hover': {
                backgroundColor: 'var(--color-primary-dark) !important'
              },
              '&.Mui-disabled': { 
                backgroundColor: '#e0e0e0 !important',
                color: 'rgba(141, 138, 138, 0.83)'

              }
            }}
          >
            Generate Report
          </Button>
          <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              disabled={!appliedNode}
              onClick={() => console.log('Download PDF')}
              sx={{ 
              backgroundColor: 'var(--color-primary) !important',
              '&:hover': {
                backgroundColor: 'var(--color-primary-dark) !important'
              },
              '&.Mui-disabled': { 
                backgroundColor: '#e0e0e0 !important',
                color: 'rgba(141, 138, 138, 0.83)'

              }
            }}
            >
              PDF
            </Button>
        </Box>
      
      {!appliedNode ? (
        <Paper sx={{ p: 6, borderRadius: 2, border: '1px dashed #ccc', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', backgroundColor: '#fafafa', height: '40vh' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>No Node Selected</Typography>
          <Typography variant="body2" color="text.secondary">
            Please select a hierarchy node from the left tree panel to generate reports.
          </Typography>
        </Paper>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress color="secondary" />
        </Box>
      ) : (
      <><div className="advisory-counters reporting-analysis__counters">

            <div className="counter-card counter-card--total">
              <div className="counter-card__icon"><ReportIcon /></div>
              <div className="counter-card__body">
                <span className="counter-card__value">{total}</span>
                <span className="counter-card__label">Total Advisory</span>
              </div>
            </div>

            <div className="counter-card counter-card--unresolved">
              <div className="counter-card__icon"><WarningIcon /></div>
              <div className="counter-card__body">
                <span className="counter-card__value">{openCount}
                  <span style={{fontSize: '0.8rem', paddingLeft: '0.2rem'}}>{`(${pct(openCount)})`}</span>
                </span>
                <span className="counter-card__label">Open</span>
              </div>
            </div>
            
            <div className="counter-card counter-card--acknowledged">
              <div className="counter-card__icon"><BellIcon /></div>
              <div className="counter-card__body">
                <span className="counter-card__value">{ackCount}
                  <span style={{fontSize: '0.8rem', paddingLeft: '0.2rem'}}>{`(${pct(ackCount)})`}</span>
                </span>
                <span className="counter-card__label">Acknowledged</span>
              </div>
            </div>

            <div className="counter-card counter-card--resolved">
              <div className="counter-card__icon"><CheckCircleIcon /></div>
              <div className="counter-card__body">
                <span className="counter-card__value">{resolvedCount}
                  <span style={{fontSize: '0.8rem', paddingLeft: '0.2rem'}}>{`(${pct(resolvedCount)})`}</span>
                </span>
                <span className="counter-card__label">Resolved</span>
              </div>
            </div>
          </div>

      <Grid container spacing={3}>
      {/* Severity chart */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Advisory Count by Severity</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Number of advisories raised per severity level
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart layout="vertical" data={severityChartData} margin={{ top: 8, right: 48, left: 16, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 13 }} tickCount={7} />
                    <YAxis type="category" dataKey="severity" width={50} tick={{ fontSize: 13 }} />
                    <Tooltip formatter={(v) => [`${v}`, 'Count']} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={36}>
                      <LabelList dataKey="count" position="right" style={{ fontSize: 13, fontWeight: 600 }} />
                      {severityChartData.map(entry => (
                        <Cell key={entry.severity} fill={getSeverityColor(entry.originalSeverity)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Status chart */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Advisory Count by Status</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Distribution of advisories across workflow statuses
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart layout="vertical" data={statusChartData} margin={{ top: 8, right: 48, left: 24, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 13 }} tickCount={7} />
                    <YAxis type="category" dataKey="status" width={100} tick={{ fontSize: 13 }} />
                    <Tooltip formatter={(v) => [`${v}`, 'Count']} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={36}>
                      <LabelList dataKey="count" position="right" style={{ fontSize: 13, fontWeight: 600 }} />
                      {statusChartData.map(entry => (
                        <Cell key={entry.key} fill={getStatusColor(entry.key)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
      </Grid>
      </>
      )}
    </Box>
  );
};

export default Reports;
