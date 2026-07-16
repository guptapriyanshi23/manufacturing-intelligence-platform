import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, Button, Typography, CircularProgress,
  MenuItem, Select, FormControl, InputLabel, TextField, Paper,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { MetricCard } from '../../components/Cards/MetricCard';
import { api } from '../../api/client';
import { getSeverityColor, getSeverityLevel, SEVERITY_LEVEL_MAP } from '../../constants/severity';
import type { HierarchyNode } from '../../types/hierarchy';
import { getStatusColor } from '../../constants/status';


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

  const handleViewClick = () => {
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
    <PageContainer>
      <PageHeader
        title="Generate Reports"
        subtitle="Generate Advisory summaries - for a single asset, a set of equipment or an entire process line."
      />

      {/* Filter bar */}
      <Paper sx={{ px: 2, py: 2.5, mb: 3, border: '1px solid #ccc' }}>
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
          <Button onClick={handleViewClick} variant="contained" color="secondary" sx={{ minWidth: 90, fontWeight: 600, flexShrink: 0 }}>
            View
          </Button>
          <Button variant="contained" color="secondary" startIcon={<DownloadIcon />} sx={{ fontWeight: 600, flexShrink: 0 }}>
            Download PDF
          </Button>
        </Box>
      </Paper>

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
        <Grid container spacing={3}>
          {/* Metric summary */}
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Advisories" value={total} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Open" value={openCount} subValue={`(${pct(openCount)})`} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Acknowledged" value={ackCount} subValue={`(${pct(ackCount)})`} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard title="Resolved" value={resolvedCount} subValue={`(${pct(resolvedCount)})`} />
              </Grid>
            </Grid>
          </Grid>

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
      )}
    </PageContainer>
  );
};

export default Reports;
