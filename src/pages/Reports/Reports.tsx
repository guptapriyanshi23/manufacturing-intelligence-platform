import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Grid, Button, Typography, CircularProgress, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { Download as DownloadIcon, Assessment as ReportIcon } from '@mui/icons-material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { DataTable } from '../../components/Tables/DataTable';
import { StatusChip } from '../../components/Forms/StatusChip';
import { api } from '../../api/client';

export const Reports: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState('oee_analysis');

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
        title="Industrial Reports"
        subtitle="Export shift summaries, asset diagnostic logs, and energy profiles."
      />

      <Grid container spacing={3}>
        {/* Report configuration panel */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                <ReportIcon color="primary" /> Generate Report
              </Typography>

              <FormControl fullWidth size="small">
                <InputLabel id="report-type-label">Select Template</InputLabel>
                <Select
                  labelId="report-type-label"
                  value={reportType}
                  label="Select Template"
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <MenuItem value="oee_analysis">OEE Shift Analysis</MenuItem>
                  <MenuItem value="maintenance_log">Machinery Maintenance Logs</MenuItem>
                  <MenuItem value="shift_summary">General Shift Summary</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => alert(`Starting compilation for: ${reportType.toUpperCase()}`)}
              >
                Compile Report
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Generated Reports list */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: 1 }}>
            {error ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="error">{error}</Typography>
              </Box>
            ) : (
              <DataTable title="Recently Compiled Reports" columns={columns} data={reports} />
            )}
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
};
export default Reports;
