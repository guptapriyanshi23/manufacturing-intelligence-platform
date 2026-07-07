import React, { useState, useEffect } from 'react';
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
import { getStatusColor } from '../../constants/status';
import type { HierarchyNode } from '../../types/hierarchy';

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

export const Reports: React.FC = () => {
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [timeRange, setTimeRange] = useState('last_24h');
  const initial = getDateRange('last_24h');
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);

  useEffect(() => {
    api.advisories.list()
      .then((res) => { setAdvisories(res); setLoading(false); })
      .catch(() => setLoading(false));
    api.hierarchy.list(true).then(setFlatNodes).catch(() => setFlatNodes([]));
  }, []);

  const handleTimeRangeChange = (val: string) => {
    setTimeRange(val);
    const { from, to } = getDateRange(val);
    setFromDate(from);
    setToDate(to);
  };

  const getAssetDepth = (node: HierarchyNode): number => {
    let depth = 0; let cur = node;
    while (cur.parent_id) {
      const p = flatNodes.find(n => n.id === cur.parent_id);
      if (!p) break; depth++; cur = p;
    }
    return depth;
  };

  const assetOptions = flatNodes
    .filter(n => n.node_type !== 'sensor')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(n => ({ node: n, depth: getAssetDepth(n) }));

  const total = advisories.length;
  const openCount = advisories.filter(a => a.status === 'open').length;
  const ackCount = advisories.filter(a => a.status === 'acknowledged').length;
  const resolvedCount = advisories.filter(a => a.status === 'resolved').length;
  const inProgressCount = advisories.filter(a => a.status === 'in_progress').length;
  const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';

  const severityChartData = Object.keys(SEVERITY_LEVEL_MAP)
    .map(sev => ({
      severity: getSeverityLevel(sev),
      count: advisories.filter(a => a.severity === sev).length,
      originalSeverity: sev,
    }))
    .filter((d, i, arr) => arr.findIndex(x => x.severity === d.severity) === i)
    .sort((a, b) => a.severity.localeCompare(b.severity));

  const statusChartData = [
    { status: 'Open',         key: 'open',         count: openCount },
    { status: 'Acknowledged', key: 'acknowledged',  count: ackCount },
    { status: 'In Progress',  key: 'in_progress',   count: inProgressCount },
    { status: 'Resolved',     key: 'resolved',      count: resolvedCount },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Generate Reports"
        subtitle="Generate Advisory summaries - for a single asset, a set of equipment or an entire process line."
      />

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 3, border: '1px solid #ccc' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel id="asset-label">Asset</InputLabel>
            <Select
              labelId="asset-label"
              value={selectedAssetId}
              label="Asset"
              onChange={(e) => setSelectedAssetId(e.target.value)}
              renderValue={(val) => {
                if (!val) return 'All Assets';
                const found = flatNodes.find(n => String(n.id) === val);
                return found ? found.display_name : val;
              }}
            >
              <MenuItem value=""><em>All Assets</em></MenuItem>
              {assetOptions.map(({ node, depth }) => (
                <MenuItem key={node.id} value={String(node.id)}>
                  <Box sx={{ pl: depth * 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {depth > 0 && <Typography component="span" color="text.disabled" sx={{ fontSize: 12 }}>└</Typography>}
                    {node.display_name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flex: 1 }}>
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
            sx={{ flex: 1 }}
          />
          <TextField
            label="To"
            type="datetime-local"
            size="small"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: 1 }}
          />

          <Button variant="contained" color="secondary" sx={{ minWidth: 90, fontWeight: 600, flexShrink: 0 }}>
            View
          </Button>
        </Box>
      </Paper>

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

        {/* Download */}
        <Grid size={{ xs: 12 }}>
          <Button variant="contained" color="secondary" startIcon={<DownloadIcon />}>
            Download PDF
          </Button>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Reports;
