import React from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { StatusChip } from '../../components/Forms/StatusChip';

const advisoryRows = [
  {
    id: 1,
    tag: 'Bearing temp',
    asset: 'ID Fan #2',
    severity: 3,
    status: 'acknowledged',
    action: 'Bearing greased and re-aligned during shift changeover',
  },
  {
    id: 2,
    tag: 'Spindle vibration',
    asset: 'CNC-04 (VMC)',
    severity: 2,
    status: 'open',
    action: '—',
  },
  {
    id: 3,
    tag: 'Hydraulic pressure',
    asset: 'Press Line 3',
    severity: 4,
    status: 'resolved',
    action: 'Seal replaced',
  },
  {
    id: 4,
    tag: 'Motor current',
    asset: 'ID Fan #2',
    severity: 5,
    status: 'resolved',
    action: 'Logged, monitoring',
  },
  {
    id: 5,
    tag: 'Feed force',
    asset: 'CNC-07 (HMC)',
    severity: 1,
    status: 'open',
    action: '—',
  },
];

const severityStyles = {
  1: { backgroundColor: 'rgba(244, 63, 94, 0.12)', color: 'error.main' },
  2: { backgroundColor: 'rgba(245, 158, 11, 0.12)', color: 'warning.main' },
  3: { backgroundColor: 'rgba(250, 204, 21, 0.12)', color: 'warning.dark' },
  4: { backgroundColor: 'rgba(14, 165, 233, 0.12)', color: 'info.main' },
  5: { backgroundColor: 'rgba(34, 197, 94, 0.12)', color: 'success.main' },
};

const statusOptions = ['open', 'acknowledged', 'resolved'] as const;
const severityOptions = ['1', '2', '3', '4', '5'] as const;

type StatusOption = (typeof statusOptions)[number];
type SeverityOption = (typeof severityOptions)[number];

export const Advisories: React.FC = () => {
  const [statusFilter, setStatusFilter] = React.useState<StatusOption | ''>('');
  const [severityFilter, setSeverityFilter] = React.useState<SeverityOption | ''>('');

  const filteredRows = advisoryRows.filter((row) => {
    const statusMatch = statusFilter ? row.status === statusFilter : true;
    const severityMatch = severityFilter ? String(row.severity) === severityFilter : true;
    return statusMatch && severityMatch;
  });

  const handleStatusChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value as StatusOption | '');
  };

  const handleSeverityChange = (event: SelectChangeEvent) => {
    setSeverityFilter(event.target.value as SeverityOption | '');
  };

  const isAllActive = !statusFilter && !severityFilter;

  const handleResetFilters = () => {
    setStatusFilter('');
    setSeverityFilter('');
  };

  return (
    <PageContainer>
      <PageHeader
        title="Advisories"
        subtitle="Active system advisories for equipment health, severity tracking, and remediation actions."
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
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
            renderValue={(selected) => {
              if (!selected) {
                return 'Status';
              }
              return selected.charAt(0).toUpperCase() + selected.slice(1);
            }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {statusOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
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
            renderValue={(selected) => {
              if (!selected) {
                return 'Severity';
              }
              return selected;
            }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {severityOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <TableContainer component={Paper} sx={{ backgroundColor: '#ffffff',
        boxShadow: 'none',  border: '1px solid #000000' , mt: 4 }}>
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
              <TableRow key={row.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ color: 'text.primary', fontWeight: 600, borderBottom: '1px solid #000000' }}>
                  {row.tag}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid #000000' }}>
                  {row.asset}
                </TableCell>
                <TableCell sx={{ borderBottom: '1px solid #000000' }}>
                  <Chip
                    label={row.severity}
                    size="small"
                    sx={{
                      ...severityStyles[row.severity as keyof typeof severityStyles],
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
                  {row.action}
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
    </PageContainer>
  );
};

export default Advisories;
