import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Grid, Button, Typography, CircularProgress, MenuItem, Select, FormControl, InputLabel, TextField } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { MetricCard } from '../../components/Cards/MetricCard';
import { api } from '../../api/client';

const severityColors: Record<string, string> = {
  critical: '#d32f2f',
  warning:  '#f57c00',
  info:     '#9e9e9e',
};

export const Reports: React.FC = () => {
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('Individual equipment');
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  useEffect(() => {
    api.advisories.list()
      .then((res) => {
        setAdvisories(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load advisories in Reports:", err);
        setLoading(false);
      });
  }, []);

  const total = advisories.length;
  const openCount = advisories.filter((a) => a.status === 'open').length;
  const ackCount = advisories.filter((a) => a.status === 'acknowledged').length;
  const resolvedCount = advisories.filter((a) => a.status === 'resolved').length;
  const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';

  const severityChartData = ['info', 'warning', 'critical'].map((sev) => ({
    severity: sev.toUpperCase(),
    count: advisories.filter((a) => a.severity === sev).length,
  })).reverse();

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
        title="Generate Reports"
        subtitle="Generate Advisory summaries - for a single asset, a set of equipment or an entire process line."
      />

      <Grid container spacing={3}>
        {/* Top filter / generate row */}
        <Grid size={{ xs: 12, md: 12 }}>
          <Card>
            <CardContent>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="scope-label">Scope</InputLabel>
                    <Select
                      labelId="scope-label"
                      value={scope}
                      label="Scope"
                      onChange={(e) => setScope(e.target.value as string)}
                    >
                      <MenuItem value="Individual equipment">Individual equipment</MenuItem>
                      <MenuItem value="Production line">Production line</MenuItem>
                      <MenuItem value="Plant">Plant</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="From"
                    type="date"
                    size="small"
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={fromDate || ''}
                    onChange={(e) => setFromDate(e.target.value || null)}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="To"
                    type="date"
                    size="small"
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={toDate || ''}
                    onChange={(e) => setToDate(e.target.value || null)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Generate action */}
        <Button variant="contained" color="primary">
          Generate report
        </Button>

        {/* Metric summary row */}
        <Grid size={{ xs: 12 }} sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard title="Advisories" value={total} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard title="Open" value={`${openCount}  (${pct(openCount)})`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard title="Acknowledged" value={`${ackCount}  (${pct(ackCount)})`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard title="Resolved" value={`${resolvedCount}  (${pct(resolvedCount)})`} />
            </Grid>
          </Grid>
        </Grid>

        {/* Severity column chart */}
        <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Advisory Count by Severity
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Number of advisories raised per severity level
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  layout="vertical"
                  data={severityChartData}
                  margin={{ top: 8, right: 48, left: 16, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 13 }}
                    tickCount={7}
                  />
                  <YAxis
                    type="category"
                    dataKey="severity"
                    width={90}
                    tick={{ fontSize: 13 }}
                  />
                  <Tooltip formatter={(v) => [`${v}`, 'Count']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={36}>
                    <LabelList dataKey="count" position="right" style={{ fontSize: 13, fontWeight: 600 }} />
                    {severityChartData.map((entry) => (
                      <Cell key={entry.severity} fill={severityColors[entry.severity.toLowerCase()] ?? '#90a4ae'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Download action */}
        <Button variant="contained" color="primary" startIcon={<DownloadIcon />}>
          Download PDF
        </Button>
      </Grid>
    </PageContainer>
  );
};
export default Reports;
