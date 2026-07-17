import React, { useState, useEffect } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, Button, Typography, CircularProgress,
  MenuItem, Select, FormControl, InputLabel, TextField, Paper, Breadcrumbs,
} from '@mui/material';
import { Download as DownloadIcon, NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { MetricCard } from '../../components/Cards/MetricCard';
import { api } from '../../api/client';
import { getSeverityColor, getSeverityLevel } from '../../constants/severity';
import type { HierarchyNode } from '../../types/hierarchy';
import { getStatusColor } from '../../constants/status';
import { TimeRange, TIME_RANGE_OPTIONS, AdvisoryStatus } from '../../types/enums';

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

export const Reports: React.FC = () => {
  const location = useLocation();
  const context = useOutletContext<{ selectedNodeId?: number | null }>();
  const selectedNodeId = context?.selectedNodeId ?? (location.state?.selectedNodeId ? Number(location.state.selectedNodeId) : null);

  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);
  const [appliedNode, setAppliedNode] = useState<HierarchyNode | null>(null);
  const [timeRange, setTimeRange] = useState<string>(TimeRange.LAST_24H);
  const initial = getDateRange(TimeRange.LAST_24H);
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<{
    total: number;
    status_counts: Record<string, number>;
    severity_counts: Record<number, number>;
  } | null>(null);

  const fetchStats = (nodeId: number | null, rangeVal: string, from?: string, to?: string) => {
    if (!nodeId) {
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    let startIso: string | undefined = undefined;
    let endIso: string | undefined = undefined;

    if (rangeVal === TimeRange.CUSTOM) {
      if (from) startIso = new Date(from).toISOString();
      if (to) endIso = new Date(to).toISOString();
    } else {
      const range = getDateRange(rangeVal);
      startIso = new Date(range.from).toISOString();
      endIso = new Date(range.to).toISOString();
    }

    api.advisories.stats({
      node_id: nodeId,
      start_time: startIso,
      end_time: endIso
    })
      .then((res) => {
        setStats(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch stats:", err);
        setStats(null);
        setLoading(false);
      });
  };

  useEffect(() => {
    api.hierarchy.list(true)
      .then(setFlatNodes)
      .catch(() => setFlatNodes([]));
  }, []);

  useEffect(() => {
    if (flatNodes.length === 0) return;
    const matchingNode = selectedNodeId ? flatNodes.find(n => n.id === selectedNodeId) : null;
    setAppliedNode(matchingNode || null);

    if (selectedNodeId) {
      setBreadcrumbs(getBreadcrumbsPath(selectedNodeId, flatNodes));
      fetchStats(selectedNodeId, timeRange, fromDate, toDate);
    } else {
      setBreadcrumbs([]);
      setStats(null);
    }
  }, [selectedNodeId, flatNodes]);

  const handleTimeRangeChange = (val: string) => {
    setTimeRange(val);
    if (val !== TimeRange.CUSTOM) {
      const { from, to } = getDateRange(val);
      setFromDate(from);
      setToDate(to);
    }
  };

  const handleViewClick = () => {
    if (appliedNode) {
      fetchStats(appliedNode.id, timeRange, fromDate, toDate);
    }
  };

  const total = stats?.total || 0;
  const openCount = stats?.status_counts.open || 0;
  const ackCount = stats?.status_counts.acknowledged || 0;
  const resolvedCount = stats?.status_counts.resolved || 0;
  const inProgressCount = stats?.status_counts.in_progress || 0;
  const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';

  const severityChartData = [1, 2, 3, 4, 5].map(level => {
    const count = stats?.severity_counts[level] || stats?.severity_counts[String(level)] || 0;
    return {
      severity: getSeverityLevel(level),
      count: count,
      originalSeverity: level,
    };
  });

  const statusChartData = [
    { status: 'Open', key: AdvisoryStatus.OPEN, count: openCount },
    { status: 'Acknowledged', key: AdvisoryStatus.ACKNOWLEDGED, count: ackCount },
    { status: 'In Progress', key: AdvisoryStatus.IN_PROGRESS, count: inProgressCount },
    { status: 'Resolved', key: AdvisoryStatus.RESOLVED, count: resolvedCount },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        subtitle="Generate Advisory summaries - for a single asset, a set of equipment or an entire process line."
      />

      {breadcrumbs.length > 0 && (
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.secondary' }} />} sx={{ mb: 2 }}>
          {breadcrumbs.map((name, index, arr) => (
            <Typography
              key={name}
              color={index === arr.length - 1 ? 'text.primary' : 'text.secondary'}
              sx={{ fontWeight: index === arr.length - 1 ? 700 : 500, fontSize: '0.85rem' }}
            >
              {name}
            </Typography>
          ))}
        </Breadcrumbs>
      )}

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
            disabled={timeRange !== TimeRange.CUSTOM}
            onChange={(e) => setFromDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 200 }}
          />
          <TextField
            label="To"
            type="datetime-local"
            size="small"
            value={toDate}
            disabled={timeRange !== TimeRange.CUSTOM}
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
