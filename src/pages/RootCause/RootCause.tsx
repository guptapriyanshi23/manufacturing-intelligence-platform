import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, LinearProgress, CircularProgress, Paper, Button } from '@mui/material';
import { Troubleshoot as TroubleshootingIcon, CheckCircle as SolveIcon } from '@mui/icons-material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { api } from '../../api/client';

export const RootCause: React.FC = () => {
  const [rcaData, setRcaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch mock diagnostics for event 101
    api.rootCause.get('101')
      .then((res) => {
        setRcaData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch RCA diagnostics');
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

  if (error || !rcaData) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">{error || 'Error loading root cause analysis details.'}</Typography>
      </Box>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Root Cause Analysis (RCA)"
        subtitle="AI-driven diagnostics mapping anomalies to likely failure factors."
      />

      <Grid container spacing={3}>
        {/* Incident Summary */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TroubleshootingIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Anomaly Details
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Event ID</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{rcaData.event_id}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Asset Location</Typography>
                  <Typography variant="body1">{rcaData.asset_name}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Detected Event</Typography>
                  <Typography variant="body1" color="error.main" sx={{ fontWeight: 600 }}>{rcaData.anomaly_type}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Timestamp</Typography>
                  <Typography variant="body2">{new Date(rcaData.detected_at).toLocaleString()}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Possible Causes Bar Chart Mockup */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, height: '100%', background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(10px)' }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Likely Failure Factors
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {rcaData.possible_causes.map((cause: any, idx: number) => (
                <Box key={idx}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {cause.name} ({cause.category.toUpperCase()})
                    </Typography>
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                      {Math.round(cause.probability * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={cause.probability * 100}
                    color={cause.probability > 0.5 ? 'error' : 'warning'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {cause.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Actionable Recommendations */}
        <Grid size={12}>
          <Card sx={{ border: '1px solid rgba(16, 185, 129, 0.2)', backgroundColor: 'rgba(16, 185, 129, 0.02)' }}>
            <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
              <Box>
                <Typography variant="h6" color="secondary.main" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                  <SolveIcon /> Recommended Action Plan
                </Typography>
                <Typography variant="body1">
                  {rcaData.recommendation}
                </Typography>
              </Box>
              <Button variant="contained" color="secondary" size="large">
                Acknowledge & Start Maintenance
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
};
export default RootCause;
