import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Grid, Button, Typography, CircularProgress, MenuItem, Select, FormControl, InputLabel, TextField, Stack } from '@mui/material';
import { Download as DownloadIcon, Assessment as ReportIcon } from '@mui/icons-material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { MetricCard } from '../../components/Cards/MetricCard';
import { DataTable } from '../../components/Tables/DataTable';
import { StatusChip } from '../../components/Forms/StatusChip';
import { api } from '../../api/client';

export const Reports: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState('oee_analysis');
  const [scope, setScope] = useState('Individual equipment');
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  useEffect(() => {
    api.reports.list()
      .then((res) => {
        setReports(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch reports');
        setLoading(false);
      });
  }, []);

  const columns = [
    { id: 'id', label: 'Report ID' },
    { id: 'name', label: 'Report Name' },
    {
      id: 'report_type',
      label: 'Format Type',
      render: (row: any) => row.report_type.toUpperCase().replace('_', ' '),
    },
    {
      id: 'status',
      label: 'Generation Status',
      render: (row: any) => (
        <StatusChip label={row.status.toUpperCase()} status={row.status === 'ready' ? 'resolved' : 'info'} />
      ),
    },
    {
      id: 'created_at',
      label: 'Generated On',
      render: (row: any) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      id: 'download_url',
      label: 'Download Link',
      render: (row: any) => (
        <Button
          size="small"
          variant="outlined"
          color="primary"
          startIcon={<DownloadIcon />}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            alert(`Initiating download for: ${row.name}`);
          }}
        >
          Download
        </Button>
      ),
    },
  ];

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
              <Grid container spacing={2} alignItems="center">
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
                    InputLabelProps={{ shrink: true }}
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
                    InputLabelProps={{ shrink: true }}
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
        <Grid size={{ xs: 12, md: 12 }} sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard title="Advisories" value={5} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard title="Avg. severity" value={2.6} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard title="Resolved" value="40%" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard title="Open" value={2} />
            </Grid>
          </Grid>
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
