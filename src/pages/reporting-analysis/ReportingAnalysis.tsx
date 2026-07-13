import React, { useMemo, useState } from 'react';
import { Box, Button, Card, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import DownloadIcon from '@mui/icons-material/Download';
import '../alerts/Alerts.scss';
import './ReportingAnalysis.scss';

type Severity = 'S1' | 'S2' | 'S3' | 'S4' | 'S5';
type Status = 'Open' | 'Resolved' | 'Acknowledged';

interface AdvisoryReportRow {
  id: string;
  scope: string;
  timestamp: Date;
  severity: Severity;
  status: Status;
}

const REPORT_ROWS: AdvisoryReportRow[] = [
  { id: 'r1', scope: 'Plant Machining', timestamp: new Date('2026-07-01T10:30:00'), severity: 'S1', status: 'Open' },
  { id: 'r2', scope: 'Plant Machining', timestamp: new Date('2026-07-01T16:00:00'), severity: 'S2', status: 'Resolved' },
  { id: 'r3', scope: 'Plant Machining', timestamp: new Date('2026-07-02T08:40:00'), severity: 'S3', status: 'Open' },
  { id: 'r4', scope: 'Plant Utilities', timestamp: new Date('2026-07-02T11:20:00'), severity: 'S1', status: 'Open' },
  { id: 'r5', scope: 'Plant Utilities', timestamp: new Date('2026-07-03T09:35:00'), severity: 'S4', status: 'Resolved' },
  { id: 'r6', scope: 'Plant Utilities', timestamp: new Date('2026-07-03T15:10:00'), severity: 'S2', status: 'Acknowledged' },
  { id: 'r7', scope: 'Plant Machining', timestamp: new Date('2026-07-04T12:10:00'), severity: 'S5', status: 'Resolved' },
  { id: 'r8', scope: 'Plant Utilities', timestamp: new Date('2026-07-04T18:00:00'), severity: 'S3', status: 'Open' },
  { id: 'r9', scope: 'Plant Machining', timestamp: new Date('2026-07-05T10:05:00'), severity: 'S2', status: 'Resolved' },
  { id: 'r10', scope: 'Plant Utilities', timestamp: new Date('2026-07-05T13:45:00'), severity: 'S4', status: 'Open' },
];

const SEVERITY_META: Array<{ key: Severity; label: string; color: string }> = [
  { key: 'S1', label: 'S1 - Critical', color: '#fecaca' },
  { key: 'S2', label: 'S2 - High', color: '#ffe4e6' },
  { key: 'S3', label: 'S3 - Medium', color: '#fde68a' },
  { key: 'S4', label: 'S4 - Low', color: '#fef9c3' },
  { key: 'S5', label: 'S5 - Informational', color: '#e2e8f0' },
];

const BellIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>
);
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
);
const WarningIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
);


const ReportingAnalysis: React.FC = () => {
  const [scope, setScope] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [submitted, setSubmitted] = useState(true);

  const scopeOptions = useMemo(
    () => Array.from(new Set(REPORT_ROWS.map((row) => row.scope))).sort(),
    [],
  );

  const filteredRows = useMemo(() => {
    let rows = REPORT_ROWS;

    if (scope !== 'all') {
      rows = rows.filter((row) => row.scope === scope);
    }
    if (fromDate) {
      const from = new Date(`${fromDate}T00:00:00`);
      rows = rows.filter((row) => row.timestamp >= from);
    }
    if (toDate) {
      const to = new Date(`${toDate}T23:59:59.999`);
      rows = rows.filter((row) => row.timestamp <= to);
    }

    return rows;
  }, [fromDate, scope, toDate]);

  const totalAdvisory = filteredRows.length;
  const resolvedCount = filteredRows.filter((row) => row.status === 'Resolved').length;
  const openCount = filteredRows.filter((row) => row.status === 'Open').length;
  const resolvedPercent = totalAdvisory === 0 ? 0 : Math.round((resolvedCount / totalAdvisory) * 100);

  const severityCounts = useMemo(() => {
    const counts: Record<Severity, number> = { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0 };
    filteredRows.forEach((row) => {
      counts[row.severity] += 1;
    });
    return counts;
  }, [filteredRows]);

  const maxSeverityCount = Math.max(...Object.values(severityCounts), 1);

  return (
    <Box className="reporting-analysis">
      <div className="page-title">
        <BarChartIcon sx={{ color: '#0076A8' }} />
        <h1>Advisory Report</h1>
      </div>

    
        <Box className="reporting-analysis__filters-grid">
          <FormControl size="small" fullWidth>
            <InputLabel id="scope-filter-label">Scope</InputLabel>
            <Select
              labelId="scope-filter-label"
              value={scope}
              label="Scope"
              onChange={(event) => setScope(event.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              {scopeOptions.map((item) => (
                <MenuItem key={item} value={item}>{item}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="From Date"
            type="date"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            fullWidth
          />

          <TextField
            label="To Date"
            type="date"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            fullWidth
          />

          <Button
            variant="contained"
            className="reporting-analysis__generate-btn"
            onClick={() => setSubmitted(true)}
            sx={{ 
              backgroundColor: 'var(--color-primary) !important',
              '&:hover': {
                backgroundColor: 'var(--color-primary-dark) !important'
              }
            }}
          >
            Generate Report
          </Button>
        </Box>
     

      {submitted && (
        <>
          <div className="advisory-counters reporting-analysis__counters">
            <div className="counter-card counter-card--total">
              <div className="counter-card__icon"><BellIcon /></div>
              <div className="counter-card__body">
                <span className="counter-card__value">{totalAdvisory}</span>
                <span className="counter-card__label">Total Advisory</span>
              </div>
            </div>

            <div className="counter-card counter-card--resolved">
              <div className="counter-card__icon"><CheckCircleIcon /></div>
              <div className="counter-card__body">
                <span className="counter-card__value">{resolvedPercent}%</span>
                <span className="counter-card__label">Resolved</span>
              </div>
            </div>

            <div className="counter-card counter-card--unresolved">
              <div className="counter-card__icon"><WarningIcon /></div>
              <div className="counter-card__body">
                <span className="counter-card__value">{openCount}</span>
                <span className="counter-card__label">Open Count</span>
              </div>
            </div>
          </div>

          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => console.log('Download PDF')}
            >
              PDF
            </Button>
          </Box>

         <Card className="reporting-analysis__chart-card">
            <Typography className="reporting-analysis__chart-title">Early RCA</Typography>

            <Box className="reporting-analysis__severity-bars">
              {SEVERITY_META.map((severity) => {
                const count = severityCounts[severity.key];
                const width = `${(count / maxSeverityCount) * 100}%`;

                return (
                  <Box key={severity.key} className="reporting-analysis__severity-row">
                    <Typography className="reporting-analysis__severity-label">{severity.label}</Typography>
                    <Box className="reporting-analysis__severity-track">
                      <Box
                        className="reporting-analysis__severity-fill"
                        sx={{ width, backgroundColor: severity.color }}
                      />
                    </Box>
                    <Typography className="reporting-analysis__severity-count">{count}</Typography>
                  </Box>
                );
              })}
            </Box>
          </Card> 
        </>
      )}
    </Box>
  );
};

export default ReportingAnalysis;
