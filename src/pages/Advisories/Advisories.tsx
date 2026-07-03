import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, Chip, CircularProgress } from '@mui/material';
import { Lightbulb as IdeaIcon, Check as AcceptIcon } from '@mui/icons-material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { StatusChip } from '../../components/Forms/StatusChip';
import { api } from '../../api/client';

export const Advisories: React.FC = () => {
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.advisories.list()
      .then((res) => {
        setAdvisories(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch advisories');
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

  return (
    <PageContainer>
      <PageHeader
        title="Optimization Advisories"
        subtitle="AI/Machine learning model suggestions to improve machinery health and utility efficiency."
      />

      <Grid container spacing={3}>
        {error ? (
          <Grid size={12}>
            <Typography color="error">{error}</Typography>
          </Grid>
        ) : (
          advisories.map((advisory) => (
            <Grid size={{ xs: 12, md: 6 }} key={advisory.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Chip
                      label={advisory.category.toUpperCase().replace('_', ' ')}
                      size="small"
                      color={advisory.category === 'energy' ? 'success' : 'info'}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                    <StatusChip label={advisory.priority.toUpperCase()} status={advisory.priority} />
                  </Box>

                  <Typography variant="h5" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                    <IdeaIcon sx={{ color: 'warning.main' }} /> {advisory.title}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {advisory.description}
                  </Typography>

                  <Box sx={{ p: 2, borderRadius: 1, backgroundColor: 'rgba(6, 182, 212, 0.04)', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Estimated Financial Impact
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'primary.main', fontWeight: 600 }}>
                      {advisory.impact}
                    </Typography>
                  </Box>
                </CardContent>

                <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                  <Button size="small" variant="text" color="inherit">
                    Dismiss
                  </Button>
                  <Button size="small" variant="contained" color="primary" startIcon={<AcceptIcon />}>
                    Accept Action
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </PageContainer>
  );
};
export default Advisories;
