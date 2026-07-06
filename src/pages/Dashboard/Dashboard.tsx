import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Grid,
  Typography,
  Paper,
  Box,
  useTheme,
  Button,
  Chip
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

// Demo data for charts
const generateDemoChartData = () => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => ({
    timestamp: new Date(now.getTime() - (11 - i) * 60 * 60 * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    actual: 65 + Math.random() * 20,
    predicted: 70 + Math.random() * 15,
    alarmLimit: 85,
    tripLimit: 95,
  }));
};

const generateBearingVibrationData = () => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => ({
    timestamp: new Date(now.getTime() - (11 - i) * 60 * 60 * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    actual: 4.5 + Math.random() * 2,
    predicted: 4.8 + Math.random() * 1.5,
    alarmLimit: 8,
    tripLimit: 10,
  }));
};

export const Dashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const selectedNodeName = searchParams.get('selectedNodeName') || 'ID Fan #2 (Calciner Draft)';

  const bearingTempData = generateDemoChartData();
  const bearingVibrationData = generateBearingVibrationData();

  return (
    <PageContainer>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 12 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                {selectedNodeName} 
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, }}
              >
                Anomalous tags are shown by default, stacked one below the other. Use the dropdown to browse any
                other parameter on this asset — anomaly or not.
              </Typography>
            </Grid>
            {/* <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}> */}
              {/* <Button
                variant="outlined"
                color="primary"
                size="small"
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                + Browse other parameters
                <Chip
                  label="23"
                  size="small"
                  sx={{
                    ml: 1,
                    height: 22,
                    backgroundColor: 'primary.main',
                    color: 'white',
                  }}
                />
              </Button> */}
            {/* </Grid> */}
          </Grid>
        </Paper>
      </Box>

      {/* Main Charts and Advisory Section */}
      <Grid container spacing={3}>
        {/* Charts Column */}
        <Grid size={{ xs: 12, lg: 8 }}>
          {/* Bearing Temperature Chart */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Bearing Temperature
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, }}>
              <Chip
                label="S1 - CRITICAL"
                sx={{
                  backgroundColor: 'error.main',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              />
            </Box>
            </Box>

            {/* Severity Indicators */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              {['#10B981', '#F59E0B', '#EF4444', '#DC2626', '#991B1B', '#7F1D1D'].map((color, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                />
              ))}
              <Typography variant="caption" color="text.secondary">
              severity at each check-in, most recent —
            </Typography>
            </Box>

            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={bearingTempData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis
                    dataKey="timestamp"
                    stroke={theme.palette.text.secondary}
                    style={{ fontSize: 12 }}
                  />
                  <YAxis
                    domain={[40, 110]}
                    stroke={theme.palette.text.secondary}
                    style={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #000000',
                      borderRadius: 6,
                      padding: '8px 12px',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line
                    name="Actual"
                    type="monotone"
                    dataKey="actual"
                    stroke="#E67E22"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    name="Predicted (twin)"
                    type="monotone"
                    dataKey="predicted"
                    stroke="#3498DB"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    name="Alarm Limit"
                    type="monotone"
                    dataKey="alarmLimit"
                    stroke="#F39C12"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    name="Trip Limit"
                    type="monotone"
                    dataKey="tripLimit"
                    stroke="#E74C3C"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          {/* Bearing Vibration Chart */}
          <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Bearing Vibration
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2,}}>
              <Chip
                label="S4 - LOW"
                sx={{
                  backgroundColor: 'info.main',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              />
            </Box>
            </Box>

            {/* Severity Indicators */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              {['#6C7F8F', '#5CB85C', '#5CB85C', '#5CB85C', '#5CB85C', '#5CB85C'].map((color, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                />
              ))}
               <Typography variant="caption" color="text.secondary" >
              severity at each check-in, most recent —
            </Typography>
            </Box>

            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={bearingVibrationData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis
                    dataKey="timestamp"
                    stroke={theme.palette.text.secondary}
                    style={{ fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 12]}
                    stroke={theme.palette.text.secondary}
                    style={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #000000',
                      borderRadius: 6,
                      padding: '8px 12px',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line
                    name="Actual"
                    type="monotone"
                    dataKey="actual"
                    stroke="#F39C12"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    name="Predicted (twin)"
                    type="monotone"
                    dataKey="predicted"
                    stroke="#3498DB"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    name="Alarm Limit"
                    type="monotone"
                    dataKey="alarmLimit"
                    stroke="#F39C12"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    name="Trip Limit"
                    type="monotone"
                    dataKey="tripLimit"
                    stroke="#E74C3C"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Advisory Column */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper
            sx={{
              // p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                backgroundColor: '#B91C1C',
                p: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                }}
              >
                ADVISORY - S1 - CRITICAL
              </Typography>
            </Box>

            <Box sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {selectedNodeName}
            </Typography>

            <Typography variant="body2" sx={{ mb: 3, opacity: 0.95 }}>
              Bearing Temperature - first detected 24 Jun, 04:12
            </Typography>

            <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
              Bearing temperature has trended <strong>44% above</strong> the twin baseline over the last 6 hours —
              consistent with advancing bearing wear. Severity has escalated <strong>S4 → S3 → S2 → S1</strong> as the
              deviation sustained. The legacy 85°C alarm is only now starting to fire — the twin flagged this a full 6
              hours earlier, well ahead of the 95°C trip limit.
            </Typography>

            <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
              Bearing Vibration also flagged <strong>S4 - LOW</strong>
            </Typography>

            <Button
              fullWidth
              variant="contained"
              sx={{
                backgroundColor: '#1F2937',
                color: 'white',
                fontWeight: 600,
                textTransform: 'none',
                py: 1.5,
                '&:hover': {
                  backgroundColor: '#111827',
                },
              }}
              onClick={() => navigate(`/root-cause?selectedNodeName=${encodeURIComponent(selectedNodeName)}`)}
            >
              Initiate RCA →
            </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Dashboard;
