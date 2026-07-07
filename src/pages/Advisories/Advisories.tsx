import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { StatusChip } from '../../components/Forms/StatusChip';
import { api } from '../../api/client';
import { getSeverityColor, getSeverityBgColor, severityOptions } from '../../constants/severity';
import { getStatusColor, getStatusBgColor, statusOptions } from '../../constants/status';

export const Advisories: React.FC = () => {
  const navigate = useNavigate();
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');

  // Details Modal State
  const [selectedAdvisory, setSelectedAdvisory] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchAdvisories = () => {
    setLoading(true);
    api.advisories.list()
      .then((res) => {
        setAdvisories(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch advisories:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAdvisories();
  }, []);

  const filteredRows = advisories.filter((row) => {
    const statusMatch = statusFilter ? row.status === statusFilter : true;
    const severityMatch = severityFilter ? row.severity === severityFilter : true;
    return statusMatch && severityMatch;
  });

  const handleStatusChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
  };

  const handleSeverityChange = (event: SelectChangeEvent) => {
    setSeverityFilter(event.target.value);
  };

  const isAllActive = !statusFilter && !severityFilter;

  const handleResetFilters = () => {
    setStatusFilter('');
    setSeverityFilter('');
  };

  const handleRowClick = (advisory: any) => {
    setSelectedAdvisory(advisory);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedAdvisory(null);
  };

  const handleAcknowledgeFromDetails = async (advisoryId: number) => {
    try {
      await api.advisories.update(advisoryId, { status: 'acknowledged' });
      fetchAdvisories();
      handleCloseDetails();
    } catch (error) {
      console.error('Failed to acknowledge advisory:', error);
    }
  };

  const handleInitiateRcaFromDetails = (advisory: any) => {
    handleCloseDetails();
    navigate(`/root-cause?advisoryId=${advisory.id}&selectedNodeName=${encodeURIComponent(advisory.asset)}`);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Advisories"
        subtitle="Active system advisories for equipment health, severity tracking, and remediation actions. Click any row to view full details."
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          justifyContent: 'flex-start',
          alignItems: { xs: 'stretch', sm: 'center' }
        }}
      >
        <Button
          variant={isAllActive ? 'contained' : 'outlined'}
          color="primary"
          onClick={handleResetFilters}
        >
          All
        </Button>

        <FormControl sx={{ minWidth: 180 }} size="small">
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={statusFilter}
            label="Status"
            onChange={handleStatusChange}
            renderValue={(selected) =>
              selected ? selected.charAt(0).toUpperCase() + selected.slice(1) : 'Status'
            }
          >
            <MenuItem value=""><em>None</em></MenuItem>
            {statusOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option == 'in_progress' ? 'In Progress' : option.charAt(0).toUpperCase() + option.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 180 }} size="small">
          <InputLabel id="severity-filter-label">Severity</InputLabel>
          <Select
            labelId="severity-filter-label"
            value={severityFilter}
            label="Severity"
            onChange={handleSeverityChange}
            renderValue={(selected) =>
              selected ? selected.charAt(0).toUpperCase() + selected.slice(1) : 'Severity'
            }
          >
            <MenuItem value=""><em>None</em></MenuItem>
            {severityOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress color="secondary" />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{ backgroundColor: '#ffffff', boxShadow: 'none', border: '1px solid #000000', mt: 4 }}
        >
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 700, borderBottom: '1px solid #000000' }}>
                  Tag
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 700, borderBottom: '1px solid #000000' }}>
                  Asset
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 700, borderBottom: '1px solid #000000' }}>
                  Severity
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 700, borderBottom: '1px solid #000000' }}>
                  Status
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 700, borderBottom: '1px solid #000000' }}>
                  Action taken
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  onClick={() => handleRowClick(row)}
                  sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                >
                  <TableCell sx={{ color: 'text.primary', fontWeight: 600, borderBottom: '1px solid #000000' }}>
                    {row.tag}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid #000000' }}>
                    {row.asset}
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #000000' }}>
                    <Chip
                      label={row.severity.toUpperCase()}
                      size="small"
                      sx={{
                        backgroundColor: getSeverityBgColor(row.severity),
                        color: getSeverityColor(row.severity),
                        fontWeight: 700,
                        minWidth: 32,
                        justifyContent: 'center',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #000000' }}>
                    <StatusChip label={row.status.toUpperCase()} status={row.status} />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid #000000' }}>
                    {row.action_taken || '—'}
                  </TableCell>
                </TableRow>
              ))}
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    No advisories match the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Advisory Details Modal */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { border: '1px solid #000000', borderRadius: 2 } }}
      >
        {selectedAdvisory && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', pb: 2 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {selectedAdvisory.asset}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={selectedAdvisory.severity.toUpperCase()}
                  size="small"
                  sx={{
                    backgroundColor: getSeverityBgColor(selectedAdvisory.severity),
                    color: getSeverityColor(selectedAdvisory.severity),
                    fontWeight: 700,
                  }}
                />
                <StatusChip label={selectedAdvisory.status.toUpperCase()} status={selectedAdvisory.status} />
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Parameter Tag
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedAdvisory.tag}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Anomaly Description
                  </Typography>
                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                    {selectedAdvisory.description}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    First Detected
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedAdvisory.first_detected).toLocaleString()}
                  </Typography>
                </Box>

                {selectedAdvisory.root_cause_description && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Root Cause Description
                    </Typography>
                    <Typography variant="body1" sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1 }}>
                      {selectedAdvisory.root_cause_description}
                    </Typography>
                  </Box>
                )}

                {selectedAdvisory.action_taken && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Action Taken
                    </Typography>
                    <Typography variant="body1" sx={{ p: 2, bgcolor: 'rgba(34, 197, 94, 0.08)', border: '1px solid #bbf7d0', borderRadius: 1 }}>
                      {selectedAdvisory.action_taken}
                    </Typography>
                  </Box>
                )}

                {selectedAdvisory.image_path && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      RCA Evidence / Image
                    </Typography>
                    <Box
                      component="img"
                      src={
                        selectedAdvisory.image_path.startsWith('http')
                          ? selectedAdvisory.image_path
                          : `http://127.0.0.1:8000${selectedAdvisory.image_path}`
                      }
                      alt="RCA Evidence"
                      sx={{
                        maxWidth: '100%',
                        maxHeight: 300,
                        objectFit: 'contain',
                        borderRadius: 1,
                        border: '1px solid #e2e8f0',
                        mt: 1,
                      }}
                    />
                  </Box>
                )}
              </Stack>
            </DialogContent>

            <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2 }}>
              {selectedAdvisory.status === 'open' && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleAcknowledgeFromDetails(selectedAdvisory.id)}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Acknowledge
                </Button>
              )}
              {selectedAdvisory.status !== 'resolved' && (
                <Button
                  variant="contained"
                  sx={{
                    backgroundColor: '#000000',
                    color: 'white',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: '#1e293b',
                    },
                  }}
                  onClick={() => handleInitiateRcaFromDetails(selectedAdvisory)}
                >
                  Initiate RCA
                </Button>
              )}
              <Button onClick={handleCloseDetails} sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600 }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </PageContainer>
  );
};

export default Advisories;
