import React, { useEffect, useMemo, useState } from 'react';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import { Box, Card, Chip, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import OrgTreePanel, { type OrgTreeNode } from '../org-tree/OrgTreePanel';
import '../alerts/Alerts.scss';
import './AdvisorySummary.scss';

type ReportStatus = 'Open' | 'Acknowledged' | 'Resolved';
type StatusFilter = 'all' | 'open' | 'acknowledged' | 'resolved';
type SeverityFilter = 'all' | 's1' | 's2' | 's3s5';

interface AdvisoryRow {
  id: string;
  timestamp: Date;
  alertName: string;
  assetName: string;
  severity: string;
  status: ReportStatus;
  engineer: string;
  comments: string;
  plantId: string;
  machineId: string;
}

const PLANT_LABELS: Record<string, string> = {
  'Plant Machining': 'Plant Machining',
  'Plant Utilities': 'Plant Utilities',
};

const ADVISORY_ROWS: AdvisoryRow[] = [
  { id: 'a1', timestamp: new Date('2026-07-01T08:15:00'), alertName: 'Bearing temperature spike', assetName: 'ID Fan #4', severity: 'S1 - High Severity', status: 'Open', engineer: 'R. Sharma', comments: 'Reviewed by operations; waiting for maintenance dispatch.', plantId: 'Plant Utilities', machineId: 'p2-m1' },
  { id: 'a2', timestamp: new Date('2026-07-01T11:35:00'), alertName: 'Motor current fluctuation', assetName: 'ID Fan #4', severity: 'S2 - High Severity', status: 'Acknowledged', engineer: 'A. Patel', comments: 'Operator acknowledged the deviation and escalated to E&I.', plantId: 'Plant Utilities', machineId: 'p2-m1' },
  { id: 'a3', timestamp: new Date('2026-07-02T09:10:00'), alertName: 'Spindle vibration alert', assetName: 'CNC 04', severity: 'S1 - High Severity', status: 'Resolved', engineer: 'S. Mehta', comments: 'Clamp alignment adjusted; vibration normalized after restart.', plantId: 'Plant Machining', machineId: 'p1-m1' },
  { id: 'a4', timestamp: new Date('2026-07-02T13:05:00'), alertName: 'Bearing temperature deviation', assetName: 'CNC 07', severity: 'S3 - Moderate Severity', status: 'Open', engineer: 'V. Iyer', comments: 'Observed steady increase over 6 hours; monitoring continues.', plantId: 'Plant Machining', machineId: 'p1-m2' },
  { id: 'a5', timestamp: new Date('2026-07-03T07:45:00'), alertName: 'Pressure drift detected', assetName: 'Process Line', severity: 'S5 - Low Severity', status: 'Resolved', engineer: 'N. Rao', comments: 'Setpoint tuned and drift cleared after calibration.', plantId: 'Plant Machining', machineId: 'p1-m2' },
  { id: 'a6', timestamp: new Date('2026-07-03T15:25:00'), alertName: 'Rotor envelope crossing', assetName: 'Process Line', severity: 'S2 - High Severity', status: 'Acknowledged', engineer: 'P. Singh', comments: 'Shift lead notified; adjustment scheduled in next window.', plantId: 'Plant Machining', machineId: 'p1-m2' },
  { id: 'a7', timestamp: new Date('2026-07-04T10:20:00'), alertName: 'Temperature ramp escalation', assetName: 'ID Fan #4', severity: 'S4 - Moderate Severity', status: 'Open', engineer: 'K. Das', comments: 'Spike sustained beyond expected cycle duration.', plantId: 'Plant Utilities', machineId: 'p2-m1' },
  { id: 'a8', timestamp: new Date('2026-07-04T16:40:00'), alertName: 'Line pressure offset', assetName: 'Process Line', severity: 'S3 - Moderate Severity', status: 'Resolved', engineer: 'M. Khan', comments: 'Pressure reset completed and confirmed stable.', plantId: 'Plant Machining', machineId: 'p1-m2' },
  { id: 'a9', timestamp: new Date('2026-07-05T09:50:00'), alertName: 'Bearing temperature sustained', assetName: 'CNC 04', severity: 'S2 - High Severity', status: 'Open', engineer: 'D. Nair', comments: 'Escalated to planned action list for next shift.', plantId: 'Plant Machining', machineId: 'p1-m1' },
];

export const OPEN_ADVISORY_COUNT = ADVISORY_ROWS.filter((row) => row.status === 'Open').length;

function fmtDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(date: Date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const ReportIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="#0076A8"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
);
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" /></svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" /></svg>
);

const getSeverityClass = (severity: string) => {
  if (severity.startsWith('S1')) return 'advisory-chip advisory-chip--s1';
  if (severity.startsWith('S2')) return 'advisory-chip advisory-chip--s2';
  if (severity.startsWith('S3')) return 'advisory-chip advisory-chip--s3';
  if (severity.startsWith('S4')) return 'advisory-chip advisory-chip--s4';
  return 'advisory-chip advisory-chip--s5';
};

const getStatusClass = (status: ReportStatus) => {
  if (status === 'Resolved') return 'advisory-chip advisory-chip--resolved';
  if (status === 'Acknowledged') return 'advisory-chip advisory-chip--acknowledged';
  return 'advisory-chip advisory-chip--open';
};

const applySeverityFilter = (rows: AdvisoryRow[], severity: SeverityFilter) => {
  if (severity === 's1') return rows.filter((row) => row.severity.startsWith('S1'));
  if (severity === 's2') return rows.filter((row) => row.severity.startsWith('S2'));
  if (severity === 's3s5') return rows.filter((row) => row.severity.startsWith('S3') || row.severity.startsWith('S4') || row.severity.startsWith('S5'));
  return rows;
};

const applyStatusFilter = (rows: AdvisoryRow[], status: StatusFilter) => {
  if (status === 'all') return rows;
  const mappedStatus = status === 'resolved' ? 'Resolved' : status === 'open' ? 'Open' : 'Acknowledged';
  return rows.filter((row) => row.status === mappedStatus);
};

const AdvisorySummary: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<OrgTreeNode | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const treeAlerts = useMemo(() => ADVISORY_ROWS.map((row) => ({
    id: row.id,
    assetTag: row.alertName,
    severity: row.severity,
    plantId: row.plantId,
    machineId: row.machineId,
  })), []);

  const assetOptions = useMemo(() => Array.from(new Set(ADVISORY_ROWS.map((row) => row.assetName))).sort(), []);

  const breadcrumb = useMemo(() => {
    if (!selectedNode) return ['Organization'];
    const { type, plantId } = selectedNode.data;
    if (type === 'plant') return ['Organization', selectedNode.label];
    if (type === 'machine') return ['Organization', PLANT_LABELS[plantId ?? ''] ?? plantId ?? '', selectedNode.label];
    if (type === 'alert') return ['Organization', PLANT_LABELS[plantId ?? ''] ?? plantId ?? '', selectedNode.label];
    return ['Organization'];
  }, [selectedNode]);

  const nodeFilteredRows = useMemo(() => {
    if (!selectedNode) return ADVISORY_ROWS;
    const { type, plantId, machineId, alertId } = selectedNode.data;
    if (type === 'plant' && plantId) return ADVISORY_ROWS.filter((row) => row.plantId === plantId);
    if (type === 'machine' && machineId) return ADVISORY_ROWS.filter((row) => row.machineId === machineId);
    if (type === 'alert' && machineId && alertId) return ADVISORY_ROWS.filter((row) => row.machineId === machineId && row.id === alertId);
    return ADVISORY_ROWS;
  }, [selectedNode]);

  const contextRows = useMemo(() => {
    let rows = nodeFilteredRows;

    if (selectedAsset !== 'all') rows = rows.filter((row) => row.assetName === selectedAsset);
    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);
      rows = rows.filter((row) => row.timestamp >= start);
    }
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999`);
      rows = rows.filter((row) => row.timestamp <= end);
    }

    return rows;
  }, [endDate, nodeFilteredRows, selectedAsset, startDate]);

  const visibleRows = useMemo(() => {
    const severityApplied = applySeverityFilter(contextRows, selectedSeverity);
    return applyStatusFilter(severityApplied, selectedStatus);
  }, [contextRows, selectedSeverity, selectedStatus]);

  const severityCountRows = useMemo(() => applyStatusFilter(contextRows, selectedStatus), [contextRows, selectedStatus]);
  const statusCountRows = useMemo(() => applySeverityFilter(contextRows, selectedSeverity), [contextRows, selectedSeverity]);

  const severityCounts = useMemo(() => ({
    all: severityCountRows.length,
    s1: severityCountRows.filter((row) => row.severity.startsWith('S1')).length,
    s2: severityCountRows.filter((row) => row.severity.startsWith('S2')).length,
    s3s5: severityCountRows.filter((row) => row.severity.startsWith('S3') || row.severity.startsWith('S4') || row.severity.startsWith('S5')).length,
  }), [severityCountRows]);

  const statusCounts = useMemo(() => ({
    all: statusCountRows.length,
    open: statusCountRows.filter((row) => row.status === 'Open').length,
    acknowledged: statusCountRows.filter((row) => row.status === 'Acknowledged').length,
    resolved: statusCountRows.filter((row) => row.status === 'Resolved').length,
  }), [statusCountRows]);

  const columns = useMemo<GridColDef[]>(() => [
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      flex: 1,
      minWidth: 170,
      renderCell: (params) => (
        <Box>
          <div>{fmtDate(params.row.timestamp)}</div>
          <div className="advisory-summary__time-subtext">{fmtTime(params.row.timestamp)}</div>
        </Box>
      ),
    },
    { field: 'alertName', headerName: 'ALert Name', flex: 1.1, minWidth: 180 },
    { field: 'assetName', headerName: 'Asset Name', flex: 0.95, minWidth: 140 },
    {
      field: 'severity',
      headerName: 'Severity',
      flex: 0.85,
      minWidth: 140,
      renderCell: (params) => <Chip className={getSeverityClass(params.value)} label={params.value} size="small" />,
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.9,
      minWidth: 150,
      renderCell: (params) => <Chip className={getStatusClass(params.value)} label={params.value} size="small" />,
    },
    {
      field: 'engineer',
      headerName: 'Engineer',
      flex: 0.85,
      minWidth: 130,
    },
    {
      field: 'comments',
      headerName: 'Action Taken',
      flex: 1.5,
      minWidth: 260,
      renderCell: (params) => <span className="advisory-summary__comments">{params.value}</span>,
    },
  ], []);

  const exportRows = useMemo(() => visibleRows.map((row) => ({
    timestamp: `${fmtDate(row.timestamp)} ${fmtTime(row.timestamp)}`,
    alertName: row.alertName,
    assetName: row.assetName,
    severity: row.severity,
    status: row.status,
    engineer: row.engineer,
    actionTaken: row.comments,
  })), [visibleRows]);

  const handleDownloadXlsx = () => {
    const headers = ['Timestamp', 'Alert Name', 'Asset Name', 'Severity', 'Status', 'Engineer', 'Action Taken'];
    const rows = exportRows.map((row) => [
      row.timestamp,
      row.alertName,
      row.assetName,
      row.severity,
      row.status,
      row.engineer,
      row.actionTaken,
    ]);

    const tableRows = rows
      .map((cells) => `<tr>${cells.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>`)
      .join('');

    const excelHtml = `
      <html>
        <head><meta charset="UTF-8" /></head>
        <body>
          <table border="1">
            <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `advisory-summary-${new Date().toISOString().slice(0, 10)}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const headers = ['Timestamp', 'Alert Name', 'Asset Name', 'Severity', 'Status', 'Engineer', 'Action Taken'];
    const tableRows = exportRows
      .map((row) => `
        <tr>
          <td>${escapeHtml(row.timestamp)}</td>
          <td>${escapeHtml(row.alertName)}</td>
          <td>${escapeHtml(row.assetName)}</td>
          <td>${escapeHtml(row.severity)}</td>
          <td>${escapeHtml(row.status)}</td>
          <td>${escapeHtml(row.engineer)}</td>
          <td>${escapeHtml(row.actionTaken)}</td>
        </tr>
      `)
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Advisory Summary</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2 { margin: 0 0 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 6px; font-size: 12px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h2>Advisory Summary</h2>
          <table>
            <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
      <Box sx={{ p: '1rem' }}>
      <div className="dashboard-layout">
        <aside className="left-panel">
          <OrgTreePanel onNodeSelected={setSelectedNode} alerts={treeAlerts} />
        </aside>

        <section className="right-panel">
          <div className="page-title">
            <ReportIcon />
            <h1>Advisory Summary</h1>
          </div>

          <div className="breadcrumb-bar">
            <div className="breadcrumb-bar__crumbs">
              {breadcrumb.map((crumb, index) => (
                <React.Fragment key={crumb}>
                  {index > 0 && <span className="breadcrumb-bar__sep">/</span>}
                  <span className={index === breadcrumb.length - 1 ? 'breadcrumb-bar__item breadcrumb-bar__item--active' : 'breadcrumb-bar__item'}>{crumb}</span>
                </React.Fragment>
              ))}
            </div>
            <div className="breadcrumb-bar__datetime">
              <CalendarIcon />
              <span>{fmtDate(currentTime)}</span>
              <span className="breadcrumb-bar__time-sep">|</span>
              <ClockIcon />
              <span>{fmtTime(currentTime)}</span>
            </div>
          </div>

          {/* <div className="advisory-counters advisory-summary__summary-row">
            <div className="counter-card counter-card--total">
              <div className="counter-card__icon"><ReportIcon /></div>
              <div className="counter-card__body">
                <span className="counter-card__value">{allCount}</span>
                <span className="counter-card__label">All</span>
              </div>
            </div>
            <div className="counter-card counter-card--resolved">
              <div className="counter-card__icon" style={{ color: '#15803d' }}><CheckCircleIcon /></div>
              <div className="counter-card__body">
                <span className="counter-card__value">{resolvedCount}</span>
                <span className="counter-card__label">Resolved</span>
              </div>
            </div>
            <div className="counter-card counter-card--unresolved">
              <div className="counter-card__icon" style={{ color: '#b91c1c' }}><WarningIcon /></div>
              <div className="counter-card__body">
                <span className="counter-card__value">{unresolvedCount}</span>
                <span className="counter-card__label">Unresolved</span>
              </div>
            </div>
          </div> */}

            <Box className="advisory-summary__filters-wrap">
              <Box className="advisory-summary__filters-grid">
              <TextField
                label="Start Date"
                type="date"
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                fullWidth
              />

              <TextField
                label="End Date"
                type="date"
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                fullWidth
              />

              <FormControl size="small" fullWidth>
                <InputLabel id="asset-filter-label">Asset</InputLabel>
                <Select
                  labelId="asset-filter-label"
                  value={selectedAsset}
                  label="Asset"
                  onChange={(event) => setSelectedAsset(event.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  {assetOptions.map((asset) => (
                    <MenuItem key={asset} value={asset}>{asset}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              </Box>
            </Box>
   
          <div className="advisory-filters-row">
            <div className="deviation-filters advisory-severity-filters">
              <button
                type="button"
                className={`deviation-chip deviation-chip--all${selectedSeverity === 'all' ? ' deviation-chip--active' : ''}`}
                onClick={() => setSelectedSeverity('all')}
              >
                <span className="deviation-chip__label">All</span>
                <span className="deviation-chip__count">{severityCounts.all}</span>
              </button>
              <button
                type="button"
                className={`deviation-chip deviation-chip--high${selectedSeverity === 's1' ? ' deviation-chip--active' : ''}`}
                onClick={() => setSelectedSeverity('s1')}
              >
                <span className="deviation-chip__label">S1</span>
                <span className="deviation-chip__count">{severityCounts.s1}</span>
              </button>
              <button
                type="button"
                className={`deviation-chip deviation-chip--high${selectedSeverity === 's2' ? ' deviation-chip--active' : ''}`}
                onClick={() => setSelectedSeverity('s2')}
              >
                <span className="deviation-chip__label">S2</span>
                <span className="deviation-chip__count">{severityCounts.s2}</span>
              </button>
              <button
                type="button"
                className={`deviation-chip deviation-chip--moderate${selectedSeverity === 's3s5' ? ' deviation-chip--active' : ''}`}
                onClick={() => setSelectedSeverity('s3s5')}
              >
                <span className="deviation-chip__label">S3-S5</span>
                <span className="deviation-chip__count">{severityCounts.s3s5}</span>
              </button>
            </div>

            <div className="deviation-filters advisory-status-filters">
              <button
                type="button"
                className={`deviation-chip deviation-chip--all${selectedStatus === 'all' ? ' deviation-chip--active' : ''}`}
                onClick={() => setSelectedStatus('all')}
              >
                <span className="deviation-chip__label">All Status</span>
                <span className="deviation-chip__count">{statusCounts.all}</span>
              </button>
              <button
                type="button"
                className={`deviation-chip deviation-chip--high${selectedStatus === 'open' ? ' deviation-chip--active' : ''}`}
                onClick={() => setSelectedStatus('open')}
              >
                <span className="deviation-chip__label">Open</span>
                <span className="deviation-chip__count">{statusCounts.open}</span>
              </button>
              <button
                type="button"
                className={`deviation-chip advisory-status-chip--acknowledged${selectedStatus === 'acknowledged' ? ' deviation-chip--active' : ''}`}
                onClick={() => setSelectedStatus('acknowledged')}
              >
                <span className="deviation-chip__label">Acknowledged</span>
                <span className="deviation-chip__count">{statusCounts.acknowledged}</span>
              </button>
              <button
                type="button"
                className={`deviation-chip advisory-status-chip--resolved${selectedStatus === 'resolved' ? ' deviation-chip--active' : ''}`}
                onClick={() => setSelectedStatus('resolved')}
              >
                <span className="deviation-chip__label">Resolved</span>
                <span className="deviation-chip__count">{statusCounts.resolved}</span>
              </button>
            </div>
          </div>

          <Card className="advisory-summary__grid-card">
            <Box className="advisory-summary__export-actions">
              <button type="button" className="advisory-export-btn" onClick={handleDownloadPdf}>
                <DownloadOutlinedIcon className="advisory-export-btn__icon" />
                <span> PDF</span>
              </button>
              <button type="button" className="advisory-export-btn advisory-export-btn--xlsx" onClick={handleDownloadXlsx}>
                <DownloadOutlinedIcon className="advisory-export-btn__icon" />
                <span> XLSX</span>
              </button>
            </Box>
            <Box className="advisory-summary__grid-wrap">
              <DataGrid
                rows={visibleRows}
                columns={columns}
                disableRowSelectionOnClick
                hideFooterSelectedRowCount
                pageSizeOptions={[5, 10]}
                initialState={{ pagination: { paginationModel: { pageSize: 5, page: 0 } } }}
                sx={{ border: 'none' }}
              />
            </Box>
          </Card>
        </section>
      </div>
    </Box>
  );
};

export default AdvisorySummary;
