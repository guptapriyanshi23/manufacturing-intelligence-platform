import React, { useState, useEffect } from 'react';
import { Grid, Typography, Paper, Box, CircularProgress, useTheme } from '@mui/material';
import {
  Speed as OeeIcon,
  Timer as AvailabilityIcon,
  SettingsSuggest as PerformanceIcon,
  Grade as QualityIcon
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { MetricCard } from '../../components/Cards/MetricCard';
import { api } from '../../api/client';

export const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboard.getSummary()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch dashboard data');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error" variant="h5">
          {error || 'Error loading dashboard summary'}
        </Typography>
      </Box>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Production Dashboard"
        subtitle="Real-time Overall Equipment Effectiveness (OEE) metrics and performance trends."
      />

      {/* KPI Cards row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Overall OEE"
            value={data.oee.value}
            unit={data.oee.unit}
            trend={data.oee.trend}
            icon={<OeeIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Availability"
            value={data.availability.value}
            unit={data.availability.unit}
            trend={data.availability.trend}
            icon={<AvailabilityIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Performance"
            value={data.performance.value}
            unit={data.performance.unit}
            trend={data.performance.trend}
            icon={<PerformanceIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Quality Rate"
            value={data.quality.value}
            unit={data.quality.unit}
            trend={data.quality.trend}
            icon={<QualityIcon />}
          />
        </Grid>
      </Grid>

      {/* Recharts Performance Area Chart */}
      <Paper sx={{ p: 3, background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(10px)' }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          OEE Performance Trend (Weekly View)
        </Typography>
        <Box sx={{ width: '100%', height: 350 }}>
          <ResponsiveContainer>
            <AreaChart data={data.weekly_chart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOee" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAvailability" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis dataKey="timestamp" stroke={theme.palette.text.secondary} style={{ fontSize: 12 }} />
              <YAxis domain={[60, 100]} stroke={theme.palette.text.secondary} style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 6,
                }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Area
                name="Overall OEE"
                type="monotone"
                dataKey="oee"
                stroke={theme.palette.primary.main}
                fillOpacity={1}
                fill="url(#colorOee)"
                strokeWidth={2}
              />
              <Area
                name="Availability"
                type="monotone"
                dataKey="availability"
                stroke={theme.palette.secondary.main}
                fillOpacity={1}
                fill="url(#colorAvailability)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </PageContainer>
  );
};
export default Dashboard;
