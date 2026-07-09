import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, FormControl, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import OrgTreePanel, { type OrgTreeNode } from '../org-tree/OrgTreePanel';
import './Alerts.scss';

/* ── Types ── */
type Severity =
  | 'S1 - High Severity'
  | 'S2 - High Severity'
  | 'S3 - Moderate Severity'
  | 'S4 - Moderate Severity'
  | 'S5 - Low Severity';

type Status = 'Resolved' | 'Unresolved';
type TableSeverityFilter = 'all' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5';
type TableStatusFilter = 'all' | 'Act now' | 'Monitor' | 'Watch';

interface AlertItem {
  id: string;
  assetTag: string;
  severity: Severity;
  description: string;
  machineName: string;
  plantId: string;
  machineId: string;
  timestamp: Date;
  status: Status;
}

interface AlertTableRow {
  id: string;
  severity: 'S1' | 'S2' | 'S3' | 'S4' | 'S5';
  asset: string;
  tag: string;
  status: 'Act now' | 'Monitor' | 'Watch';
  advisoryMessage: string;
  timestamp: Date;
}

/* ── Static data ── */
const PLANT_LABELS: Record<string, string> = {
  'plant-1': 'Plant Machining',
  'plant-2': 'Plant Uitilities',
};

const ALL_ALERTS: AlertItem[] = [
//   { id: '1', assetTag: 'AT-001', severity: 'S1 - High Severity', description: 'Spindle vibration trending above twin baseline.', machineName: 'CNC-04', plantId: 'plant-1', machineId: 'p1-m1', timestamp: new Date('2026-07-02T08:30:00'), status: 'Unresolved' },
//   { id: '2', assetTag: 'AT-002', severity: 'S3 - Moderate Severity', description: 'Bearing temperature deviation sustained 6 hrs.', machineName: 'CNC-04', plantId: 'plant-1', machineId: 'p1-m1', timestamp: new Date('2026-07-02T08:45:00'), status: 'Resolved' },

//   { id: '3', assetTag: 'AT-003', severity: 'S5 - Low Severity', description: 'Pressure drift detected versus golden threshold.', machineName: 'CNC-07', plantId: 'plant-1', machineId: 'p1-m2', timestamp: new Date('2026-07-02T09:15:00'), status: 'Resolved' },

//   { id: '4', assetTag: 'AT-004', severity: 'S2 - High Severity', description: 'Temperature ramp exceeds expected digital twin envelope.', machineName: 'Process Unit 3', plantId: 'plant-1', machineId: 'p1-m3', timestamp: new Date('2026-07-02T10:00:00'), status: 'Unresolved' },
//   { id: '5', assetTag: 'AT-005', severity: 'S4 - Moderate Severity', description: 'Pressure oscillation persists across two production cycles.', machineName: 'Process Unit 3', plantId: 'plant-1', machineId: 'p1-m3', timestamp: new Date('2026-07-02T10:15:00'), status: 'Resolved' },

  { id: '6', assetTag: 'Bearing Vibration', severity: 'S1 - High Severity', description: 'Compressor pressure spike outside safe operating region.', machineName: 'ID Fan #2', plantId: 'plant-2', machineId: 'p2-m1', timestamp: new Date('2026-07-02T10:30:00'), status: 'Unresolved' },

  { id: '7', assetTag: 'Bearing Temperature', severity: 'S2 - High Severity', description: 'Rotor vibration envelope crossed warning boundary.', machineName: 'ID Fan #2', plantId: 'plant-2', machineId: 'p2-m1', timestamp: new Date('2026-07-02T11:00:00'), status: 'Unresolved' },
  { id: '8', assetTag: 'Motor Current', severity: 'S3 - Moderate Severity', description: 'Bearing temperature remains elevated above baseline.', machineName: 'ID Fan #2', plantId: 'plant-2', machineId: 'p2-m1', timestamp: new Date('2026-07-02T11:15:00'), status: 'Resolved' },

  { id: '9', assetTag: 'AT-009', severity: 'S5 - Low Severity', description: 'Minor pressure offset observed in final stage valve.', machineName: 'Process Unit 3', plantId: 'plant-2', machineId: 'p2-m3', timestamp: new Date('2026-07-02T11:30:00'), status: 'Resolved' },
];

const ALERT_TABLE_ROWS: AlertTableRow[] = [
  { id: 't1', severity: 'S1', asset: 'ID Fan #2', tag: 'BRG-DE-TEMP', status: 'Act now', advisoryMessage: 'Bearing temperature 31% above predicted baseline - sustained 7 hrs', timestamp: new Date('2026-07-08T08:15:00') },
  { id: 't2', severity: 'S2', asset: 'ID Fan #2', tag: 'MTR-CURR', status: 'Act now', advisoryMessage: 'Motor current deviation - possible rotor imbalance onset', timestamp: new Date('2026-07-08T09:10:00') },
  { id: 't3', severity: 'S2', asset: 'ID Fan #1', tag: 'BRG-NDE-VIB', status: 'Act now', advisoryMessage: 'Vibration rising across 5 measurement cycles - early misalignment', timestamp: new Date('2026-07-08T09:55:00') },
  { id: 't4', severity: 'S3', asset: 'Boiler Feed Pump', tag: 'SEAL-TEMP', status: 'Monitor', advisoryMessage: 'Seal temperature 18% above twin - lubrication degradation suspected', timestamp: new Date('2026-07-08T10:25:00') },
  { id: 't5', severity: 'S3', asset: 'ID Fan #1', tag: 'FAN-VIB-AX', status: 'Monitor', advisoryMessage: 'Axial vibration trending - possible blade fouling or erosion', timestamp: new Date('2026-07-08T11:05:00') },
  { id: 't6', severity: 'S3', asset: 'Boiler Feed Pump', tag: 'PUMP-BRG-TEMP', status: 'Monitor', advisoryMessage: 'Bearing temp creeping - 12% above twin for 3 consecutive shifts', timestamp: new Date('2026-07-08T11:45:00') },
  { id: 't7', severity: 'S4', asset: 'PA Fan', tag: 'PA-MTR-BRG', status: 'Watch', advisoryMessage: 'Minor deviation - within watch threshold, monitoring', timestamp: new Date('2026-07-08T12:20:00') },
  { id: 't8', severity: 'S4', asset: 'PA Fan', tag: 'COUP-VIB', status: 'Watch', advisoryMessage: 'Coupling vibration slight rise - no action required yet', timestamp: new Date('2026-07-08T13:05:00') },
  { id: 't9', severity: 'S5', asset: 'ID Fan #2', tag: 'CAS-TEMP', status: 'Watch', advisoryMessage: 'Marginal temperature change - informational', timestamp: new Date('2026-07-08T13:40:00') },
];

export const UNRESOLVED_ALERT_COUNT = ALL_ALERTS.filter((alert) => alert.status === 'Unresolved').length;

/* ── Helpers ── */
function fmtDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(date: Date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function tableSeverityBadgeClass(severity: AlertTableRow['severity']) {
  if (severity === 'S1') return 'severity-badge severity-s1';
  if (severity === 'S2') return 'severity-badge severity-s2';
  if (severity === 'S3') return 'severity-badge severity-s3';
  if (severity === 'S4') return 'severity-badge severity-s4';
  return 'severity-badge severity-s5';
}

function tableSeverityLabel(severity: AlertTableRow['severity']) {
  if (severity === 'S1') return 'S1 - Critical';
  if (severity === 'S2') return 'S2 - High';
  if (severity === 'S3') return 'S3 - Medium';
  if (severity === 'S4') return 'S4 - Low';
  return 'S5 - Informational';
}

function tableStatusClass(status: AlertTableRow['status']) {
  if (status === 'Act now') return 'alerts-table__status alerts-table__status--act';
  if (status === 'Monitor') return 'alerts-table__status alerts-table__status--monitor';
  return 'alerts-table__status alerts-table__status--watch';
}

/* ── Inline SVG icons ── */
const BellIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="#0076A8"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>
);
const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M10 17l5-5-5-5v10z" /></svg>
);
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" /></svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" /></svg>
);
const InboxIcon = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-3h3.56c.69 1.19 1.97 2 3.45 2s2.75-.81 3.45-2H19v3zm0-5h-4.99c0 1.1-.9 1.99-2 1.99S10 15.1 10 14H5V5h14v9z" /></svg>
);

/* ── Component ── */
const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<OrgTreeNode | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<TableSeverityFilter>('all');
  const [selectedStatus, setSelectedStatus] = useState<TableStatusFilter>('all');
  const [selectedAsset, setSelectedAsset] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const breadcrumb = useMemo(() => {
    if (!selectedNode) return ['Organization'];
    const { type, plantId } = selectedNode.data;
    if (type === 'plant') return ['Organization', selectedNode.label];
    if (type === 'machine') return ['Organization', PLANT_LABELS[plantId ?? ''] ?? plantId ?? '', selectedNode.label];
    if (type === 'alert') return ['Organization', PLANT_LABELS[plantId ?? ''] ?? plantId ?? '', selectedNode.label];
    return ['Organization'];
  }, [selectedNode]);

  const orgAlertCounts = useMemo(() => ALL_ALERTS, []);

  const severityCounts = useMemo(() => ({
    all: ALERT_TABLE_ROWS.length,
    S1: ALERT_TABLE_ROWS.filter((row) => row.severity === 'S1').length,
    S2: ALERT_TABLE_ROWS.filter((row) => row.severity === 'S2').length,
    S3: ALERT_TABLE_ROWS.filter((row) => row.severity === 'S3').length,
    S4: ALERT_TABLE_ROWS.filter((row) => row.severity === 'S4').length,
    S5: ALERT_TABLE_ROWS.filter((row) => row.severity === 'S5').length,
  }), []);

  const assetOptions = useMemo(() => Array.from(new Set(ALERT_TABLE_ROWS.map((row) => row.asset))).sort(), []);
  const tagOptions = useMemo(() => {
    const rows = selectedAsset === 'all'
      ? ALERT_TABLE_ROWS
      : ALERT_TABLE_ROWS.filter((row) => row.asset === selectedAsset);

    return Array.from(new Set(rows.map((row) => row.tag))).sort();
  }, [selectedAsset]);

  const filteredTableRows = useMemo(() => {
    let rows = ALERT_TABLE_ROWS;

    if (selectedSeverity !== 'all') {
      rows = rows.filter((row) => row.severity === selectedSeverity);
    }
    if (selectedStatus !== 'all') {
      rows = rows.filter((row) => row.status === selectedStatus);
    }
    if (selectedAsset !== 'all') {
      rows = rows.filter((row) => row.asset === selectedAsset);
    }
    if (selectedTag !== 'all') {
      rows = rows.filter((row) => row.tag === selectedTag);
    }

    return rows;
  }, [selectedAsset, selectedSeverity, selectedStatus, selectedTag]);

  const handleNodeSelected = (node: OrgTreeNode) => {
    setSelectedNode(node);
    setSelectedSeverity('all');
    setSelectedStatus('all');
    setSelectedAsset('all');
    setSelectedTag('all');

    if (node.data.type === 'alert' && node.data.alertId) {
      const matchedAlert = ALL_ALERTS.find(
        (alert) => alert.id === node.data.alertId && alert.machineId === node.data.machineId,
      );
      if (matchedAlert) {
        navigate('/twin-dashboard', { state: { alert: matchedAlert } });
      }
    }
  };

  const handleRowClick = (row: AlertTableRow) => {
    // Map AlertTableRow to AlertItem format
    const severityMap: Record<AlertTableRow['severity'], Severity> = {
      'S1': 'S1 - High Severity',
      'S2': 'S2 - High Severity',
      'S3': 'S3 - Moderate Severity',
      'S4': 'S4 - Moderate Severity',
      'S5': 'S5 - Low Severity',
    };

    const statusMap: Record<AlertTableRow['status'], Status> = {
      'Act now': 'Unresolved',
      'Monitor': 'Unresolved',
      'Watch': 'Resolved',
    };

    const alertItem: AlertItem = {
      id: row.id,
      assetTag: row.tag,
      severity: severityMap[row.severity],
      description: row.advisoryMessage,
      machineName: row.asset,
      plantId: 'plant-2', // Default plant
      machineId: 'p2-m1', // Default machine
      timestamp: row.timestamp,
      status: statusMap[row.status],
    };

    navigate('/twin-dashboard', { state: { alert: alertItem } });
  };

  return (
    <Box sx={{ p: '1rem' }}>
      <div className="dashboard-layout">

        {/* ── Left Panel: Org Tree ── */}
        <aside className="left-panel">
          <OrgTreePanel onNodeSelected={handleNodeSelected} alerts={orgAlertCounts} />
        </aside>

        {/* ── Right Panel ── */}
        <section className="right-panel">
          {/* Page Title */}
          <div className="page-title">
            <BellIcon />
            <h1>Alerts Dashboard</h1>
          </div>

              {/* Breadcrumb Bar */}
              <div className="breadcrumb-bar">
                <div className="breadcrumb-bar__crumbs">
                  {/* <span className="breadcrumb-bar__icon"><SitemapIcon /></span> */}
                  {breadcrumb.map((crumb, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="breadcrumb-bar__sep"><ChevronRightIcon /></span>}
                      <span className={i === breadcrumb.length - 1 ? 'breadcrumb-bar__item breadcrumb-bar__item--active' : 'breadcrumb-bar__item'}>
                        {crumb}
                      </span>
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

              {/* Stats Row */}
              <div className="stats-row alerts-severity-filters-row">
                <div className="deviation-filters alerts-severity-filters">
                  <button
                    className={`deviation-chip deviation-chip--all${selectedSeverity === 'all' ? ' deviation-chip--active' : ''}`}
                    onClick={() => setSelectedSeverity('all')}
                  >
                    <span className="deviation-chip__label">All</span>
                    <span className="deviation-chip__count">{severityCounts.all}</span>
                  </button>
                  <button
                    className={`deviation-chip deviation-chip--high${selectedSeverity === 'S1' ? ' deviation-chip--active' : ''}`}
                    onClick={() => setSelectedSeverity('S1')}
                  >
                    <span className="deviation-chip__label">S1</span>
                    <span className="deviation-chip__count">{severityCounts.S1}</span>
                  </button>
                  <button
                    className={`deviation-chip deviation-chip--high${selectedSeverity === 'S2' ? ' deviation-chip--active' : ''}`}
                    onClick={() => setSelectedSeverity('S2')}
                  >
                    <span className="deviation-chip__label">S2</span>
                    <span className="deviation-chip__count">{severityCounts.S2}</span>
                  </button>
                  <button
                    className={`deviation-chip deviation-chip--moderate${selectedSeverity === 'S3' ? ' deviation-chip--active' : ''}`}
                    onClick={() => setSelectedSeverity('S3')}
                  >
                    <span className="deviation-chip__label">S3</span>
                    <span className="deviation-chip__count">{severityCounts.S3}</span>
                  </button>
                  <button
                    className={`deviation-chip deviation-chip--low${selectedSeverity === 'S4' ? ' deviation-chip--active' : ''}`}
                    onClick={() => setSelectedSeverity('S4')}
                  >
                    <span className="deviation-chip__label">S4</span>
                    <span className="deviation-chip__count">{severityCounts.S4}</span>
                  </button>
                  <button
                    className={`deviation-chip deviation-chip--low${selectedSeverity === 'S5' ? ' deviation-chip--active' : ''}`}
                    onClick={() => setSelectedSeverity('S5')}
                  >
                    <span className="deviation-chip__label">S5</span>
                    <span className="deviation-chip__count">{severityCounts.S5}</span>
                  </button>
                </div>

                <div className="alerts-table-filters">
                  <FormControl size="small" className="alerts-table-filters__field">
                    <InputLabel id="alerts-asset-filter-label">Asset</InputLabel>
                    <Select
                      labelId="alerts-asset-filter-label"
                      value={selectedAsset}
                      label="Asset"
                      onChange={(event) => {
                        setSelectedAsset(event.target.value);
                        setSelectedTag('all');
                      }}
                    >
                      <MenuItem value="all">All</MenuItem>
                      {assetOptions.map((asset) => (
                        <MenuItem key={asset} value={asset}>{asset}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" className="alerts-table-filters__field">
                    <InputLabel id="alerts-tag-filter-label">Tag</InputLabel>
                    <Select
                      labelId="alerts-tag-filter-label"
                      value={selectedTag}
                      label="Tag"
                      onChange={(event) => setSelectedTag(event.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      {tagOptions.map((tag) => (
                        <MenuItem key={tag} value={tag}>{tag}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

              </div>

            

              {/* Alert List */}
              <div className="alert-list">

                {filteredTableRows.length === 0 ? (
                  <div className="empty-state">
                    <InboxIcon />
                    <p>No alerts found for the selected item.</p>
                  </div>
                ) : (
                  <div className="alerts-table-wrap">
                    <Table size="small" className="alerts-table">
                      <TableHead>
                        <TableRow>
                          <TableCell>Severity</TableCell>
                          <TableCell>Asset</TableCell>
                          <TableCell>Tag</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Advisory message</TableCell>
                          <TableCell>Timestamp</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredTableRows.map((row) => (
                          <TableRow
                            key={row.id}
                            onClick={() => handleRowClick(row)}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: '#f8fafc',
                              },
                            }}
                          >
                            <TableCell>
                              <span className={tableSeverityBadgeClass(row.severity)}>{tableSeverityLabel(row.severity)}</span>
                            </TableCell>
                            <TableCell>{row.asset}</TableCell>
                            <TableCell>{row.tag}</TableCell>
                            <TableCell>
                              <span className={tableStatusClass(row.status)}>{row.status}</span>
                            </TableCell>
                            <TableCell>{row.advisoryMessage}</TableCell>
                            <TableCell>{`${fmtDate(row.timestamp)} ${fmtTime(row.timestamp)}`}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
        </section>
      </div>
    </Box>
  );
};

export default Alerts;
