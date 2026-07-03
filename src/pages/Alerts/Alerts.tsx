import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { DataTable } from '../../components/Tables/DataTable';
import { StatusChip } from '../../components/Forms/StatusChip';
import { api } from '../../api/client';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.alerts.list()
      .then((res) => {
        setAlerts(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch alerts');
        setLoading(false);
      });
  }, []);

  const columns = [
    { id: 'id', label: 'Alert ID' },
    {
      id: 'node_id',
      label: 'Node Location',
      render: (row: any) => `Node #${row.node_id}`,
    },
    {
      id: 'severity',
      label: 'Severity',
      render: (row: any) => (
        <StatusChip label={row.severity.toUpperCase()} status={row.severity} />
      ),
    },
    { id: 'message', label: 'Description' },
    {
      id: 'status',
      label: 'Status',
      render: (row: any) => (
        <StatusChip label={row.status.toUpperCase()} status={row.status} />
      ),
    },
    {
      id: 'timestamp',
      label: 'Detected At',
      render: (row: any) => new Date(row.timestamp).toLocaleString(),
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
        title="Active Alerts"
        subtitle="Critical warnings, system diagnostics, and failure states needing immediate attention."
      />

      <Paper sx={{ background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(10px)', overflow: 'hidden' }}>
        {error ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <DataTable title="System Alerts Log" columns={columns} data={alerts} />
        )}
      </Paper>
    </PageContainer>
  );
};
export default Alerts;
