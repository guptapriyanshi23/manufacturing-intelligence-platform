import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
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
  TableHead,
  TableRow,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Card,
  TablePagination,
} from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { StatusChip } from '../../components/Forms/StatusChip';
import { api } from '../../api/client';
import { getSeverityColor, getSeverityBgColor, getSeverityLevelFull, severityClassMap } from '../../constants/severity';
import { getStatusClassName, getStatusText, statusClassMap, statusLabelMap } from '../../constants/status';
import type { HierarchyNode } from '../../types/hierarchy';
import { AdvisoryStatus, NodeType, TimeRange, TIME_RANGE_OPTIONS } from '../../types/enums';
import BreadCrumsBar from '../../components/BreadCrumsBar/BreadCrumsBar';
import './Advisories.scss';
import '../Alerts/Alerts.scss';
import { fmtDate, fmtTime } from '../../constants/datetimefmt';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const InboxIcon = () => (
  <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-3h3.56c.69 1.19 1.97 2 3.45 2s2.75-.81 3.45-2H19v3zm0-5h-4.99c0 1.1-.9 1.99-2 1.99S10 15.1 10 14H5V5h14v9z" /></svg>
);

const getDateRange = (rangeValue: string) => {
  const now = new Date();
  const map: Record<string, number> = {
    [TimeRange.LAST_1H]: 1,
    [TimeRange.LAST_8H]: 8,
    [TimeRange.LAST_24H]: 24,
    [TimeRange.LAST_7D]: 168,
    [TimeRange.LAST_30D]: 720,
  };
  const hours = map[rangeValue] ?? 24;
  const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 16), to: now.toISOString().slice(0, 16) };
};

const getBreadcrumbsPath = (nodeId: number, flatNodes: HierarchyNode[]): string[] => {
  const path: string[] = [];
  let current = flatNodes.find(n => n.id === nodeId);
  while (current) {
    path.unshift(current.display_name);
    const pid = current.parent_id;
    current = pid ? flatNodes.find(n => n.id === pid) : undefined;
  }
  return path;
};

export const Advisories: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);


  const context = useOutletContext<{ selectedNodeId?: number | null }>();
  const treeNodeId = context?.selectedNodeId ?? (location.state?.selectedNodeId ? Number(location.state.selectedNodeId) : null);
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dropdown states (selection state, not applied immediately)
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSensorId, setSelectedSensorId] = useState<number | ''>('');
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('');
  const [timeRange, setTimeRange] = useState<string>(TimeRange.LAST_24H);
  const initial = getDateRange(TimeRange.LAST_24H);
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);

  // Applied states (updates only when 'View' button is clicked)
  const [appliedSensorId, setAppliedSensorId] = useState<number | ''>('');
  const [appliedAssetId, setAppliedAssetId] = useState<number | ''>('');
  const [appliedTimeRange, setAppliedTimeRange] = useState<string>(TimeRange.LAST_24H);
  const [appliedFromDate, setAppliedFromDate] = useState(initial.from);
  const [appliedToDate, setAppliedToDate] = useState(initial.to);
  const [appliedNode, setAppliedNode] = useState<HierarchyNode | null>(null);

  const descendantsOfSidePanel = useMemo(() => {
    if (!treeNodeId) return flatNodes;
    const getDescendants = (nodeId: number) => {
      const result: HierarchyNode[] = [];
      const queue = [nodeId];
      const visited = new Set<number>();
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        const node = flatNodes.find(n => n.id === id);
        if (node) {
          result.push(node);
          flatNodes.filter(n => n.parent_id === id).forEach(n => queue.push(n.id));
        }
      }
      return result;
    };
    return getDescendants(treeNodeId);
  }, [treeNodeId, flatNodes]);

  const availableAssets = useMemo(() => {
    return descendantsOfSidePanel.filter(n => n.node_type === NodeType.ASSET);
  }, [descendantsOfSidePanel]);

  const availableSensors = useMemo(() => {
    return descendantsOfSidePanel.filter(n => n.node_type === NodeType.SENSOR);
  }, [descendantsOfSidePanel]);

  const isLineSelected = useMemo(() => {
    return flatNodes.find(n => n.id === treeNodeId)?.node_type === NodeType.LINE;
  }, [treeNodeId, flatNodes]);

  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  useEffect(() => {
    if (treeNodeId && flatNodes.length > 0) {
      setBreadcrumbs(getBreadcrumbsPath(treeNodeId, flatNodes));
    } else {
      setBreadcrumbs([]);
    }
  }, [treeNodeId, flatNodes]);

  useEffect(() => {
    const saved = localStorage.getItem('advisories_applied_filters');
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        if (filters.timeRange) {
          setTimeRange(filters.timeRange);
          setAppliedTimeRange(filters.timeRange);
        }
        if (filters.fromDate) {
          setFromDate(filters.fromDate);
          setAppliedFromDate(filters.fromDate);
        }
        if (filters.toDate) {
          setToDate(filters.toDate);
          setAppliedToDate(filters.toDate);
        }
      } catch (e) { }
    }
  }, [location.state]);

  useEffect(() => {
    if (flatNodes.length === 0) return;
    const matchingNode = treeNodeId ? flatNodes.find(n => n.id === treeNodeId) : null;
    setAppliedNode(matchingNode || null);

    if (treeNodeId) {
      setSelectedSensorId('');
      setSelectedAssetId('');
      setAppliedSensorId('');
      setAppliedAssetId('');
    }
  }, [treeNodeId, flatNodes]);

  const [selectedAdvisory, setSelectedAdvisory] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [profile, setProfile] = useState<{ email: string; permissions: string[] } | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('user_profile');
    if (cached) {
      try {
        setProfile(JSON.parse(cached));
      } catch (e) { }
    }
  }, []);

  const canAcknowledge = profile?.permissions.includes('advisories:acknowledge') ?? false;
  const canRca = profile?.permissions.includes('advisories:rca') ?? false;

  useEffect(() => {
    api.hierarchy.list(true)
      .then(setFlatNodes)
      .catch(() => setFlatNodes([]));
  }, []);

  // Reactive effect to fetch advisories from server whenever applied filters change
  useEffect(() => {
    if (appliedNode === null) {
      setAdvisories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // const targetNodeId = appliedSensorId ? Number(appliedSensorId) : appliedNode.id;
    const targetNodeId = Number(appliedAssetId) ? Number(appliedAssetId) : appliedNode.id;

    let startIso: string | undefined = undefined;
    let endIso: string | undefined = undefined;

    if (appliedTimeRange === TimeRange.CUSTOM) {
      if (appliedFromDate) startIso = new Date(appliedFromDate).toISOString();
      if (appliedToDate) endIso = new Date(appliedToDate).toISOString();
    } else {
      const range = getDateRange(appliedTimeRange);
      startIso = new Date(range.from).toISOString();
      endIso = new Date(range.to).toISOString();
    }

    api.advisories.list({
      node_id: targetNodeId,
      start_time: startIso,
      end_time: endIso,
    })
      .then((res) => {
        setAdvisories(res);
        setSelectedSeverity('All');
        setSelectedStatus('All');
        setLoading(false);
      })
      .catch((err) => { console.error('Failed to fetch advisories:', err); setLoading(false); });
  }, [appliedNode, appliedSensorId, appliedAssetId, appliedTimeRange, appliedFromDate, appliedToDate]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const filteredRows = advisories.filter((adv) => {
    const severityMatch =
      selectedSeverity === 'All' ||
      `S${adv.severity}` === selectedSeverity;

    const statusMatch =
      selectedStatus === 'All' ||
      statusLabelMap[adv.status] === selectedStatus;

    return severityMatch && statusMatch;
  });

  const paginatedRows = filteredRows?.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_: any, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTimeRangeChange = (val: string) => {
    setTimeRange(val);
    if (val !== TimeRange.CUSTOM) {
      const { from, to } = getDateRange(val);
      setFromDate(from);
      setToDate(to);
    }
  };

  const handleView = () => {

    setAppliedSensorId(selectedSensorId);
    setAppliedAssetId(selectedAssetId);
    setAppliedTimeRange(timeRange);
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);

    localStorage.setItem('advisories_applied_filters', JSON.stringify({
      timeRange: timeRange,
      fromDate: fromDate,
      toDate: toDate,
    }));
  };

  const exportToXlsx = async () => {
    if(paginatedRows?.length === 0) return;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Advisories');

    // Column definitions
    worksheet.columns = [
      { header: 'Asset', key: 'asset', width: 25 },
      { header: 'Severity', key: 'severity', width: 20 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Engineer', key: 'engineer', width: 20 },
      { header: 'Action Taken', key: 'actionTaken', width: 50 },
      { header: 'Timestamp', key: 'timestamp', width: 25 },
    ];

    // Header styling
    const headerRow = worksheet.getRow(1);

    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: '1A1A1A' },
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'BCC9D2' },
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Visible data only (same as table)
    paginatedRows.forEach((row) => {
      const excelRow = worksheet.addRow({
        asset: getAssetName(row),
        severity: getSeverityLevelFull(row.severity),
        status: getStatusText(row.status),
        engineer: 'Engineer Name',
        actionTaken: row?.action_taken?.trim() || '-',
        timestamp: `${fmtDate(new Date(row.detected_at))} ${fmtTime(
          new Date(row.detected_at)
        )}`,
      });

      // Severity color
      const severityCell = excelRow.getCell(2);

      const severityColors: Record<number, { bg: string; font: string }> = {
        1: { bg: 'FDE2E2', font: 'B91C1C' },
        2: { bg: 'FFE8CC', font: 'C2410C' },
        3: { bg: 'FEF3C7', font: 'B45309' },
        4: { bg: 'DBEAFE', font: '1D4ED8' },
        5: { bg: 'E5E7EB', font: '6B7280' },
      };

      const sev = severityColors[row.severity];

      if (sev) {
        severityCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: sev.bg },
        };

        severityCell.font = {
          bold: true,
          color: { argb: sev.font },
        };
      }

      // Status color
      const statusCell = excelRow.getCell(3);

      const statusText = getStatusText(row.status);

      const statusStyles : Record<string, { bg: string; font: string }>= {
        Open: {
          bg: 'FDE2E2',
          font: 'B91C1C',
        },
        Acknowledged: {
          bg: 'DBEAFE',
          font: '1D4ED8',
        },
        'In Progress': {
          bg: 'FEF3C7',
          font: 'B45309',
        },
        Resolved: {
          bg: 'DCFCE7',
          font: '15803D',
        },
      };

      const style = statusStyles[statusText];

      if (style) {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: style.bg },
        };

        statusCell.font = {
          bold: true,
          color: { argb: style.font },
        };
      }

      // All cell borders
      excelRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'D1D5DB' } },
          left: { style: 'thin', color: { argb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
          right: { style: 'thin', color: { argb: 'D1D5DB' } },
        };

        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(
      new Blob([buffer]),
      `Advisory_Report_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const getAssetName = (row: any) => {
    if (row.asset_name) return row.asset_name;
    let currentId: number | undefined = row.node_id;
    while (currentId) {
      const node = flatNodes.find(n => n.id === currentId);
      if (node?.node_type === NodeType.ASSET) return node.display_name;
      currentId = node?.parent_id;
    }
    return 'N/A';
  };

  const handleRowClick = (advisory: any) => { setSelectedAdvisory(advisory); setDetailsOpen(true); };
  const handleCloseDetails = () => { setDetailsOpen(false); setSelectedAdvisory(null); };

  const handleAcknowledgeFromDetails = async (advisoryId: number) => {
    try {
      await api.advisories.update(advisoryId, { status: AdvisoryStatus.ACKNOWLEDGED });
      if (appliedNode) {
        api.advisories.list({
          node_id: appliedNode.id,
        })
          .then(setAdvisories)
          .catch((err) => console.error('Failed to refresh advisories:', err));
      }
      handleCloseDetails();
    } catch (error) {
      console.error('Failed to acknowledge advisory:', error);
    }
  };

  const handleInitiateRcaFromDetails = (advisory: any) => {
    handleCloseDetails();
    navigate('/root-cause', { state: { advisoryId: advisory.id, selectedNodeName: advisory.asset } });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Advisory Summary"
        url="/advisories"
      />

      <BreadCrumsBar breadcrumbsData={breadcrumbs} />

      <Box className="advisory-summary__filters-grid">
        <FormControl size="small">
          <InputLabel shrink>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            displayEmpty
            renderValue={timeRange === '' ? () => <span >Select</span> : undefined}
          >
            <MenuItem value="">Select</MenuItem>
            {TIME_RANGE_OPTIONS.map(o => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Start Date"
          type="datetime-local"
          size="small"
          value={fromDate}
          disabled={timeRange !== TimeRange.CUSTOM}
          onChange={(e) => setFromDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />

        <TextField
          label="End Date"
          type="datetime-local"
          size="small"
          value={toDate}
          disabled={timeRange !== TimeRange.CUSTOM}
          onChange={(e) => setToDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />

        <FormControl size="small" disabled={!isLineSelected}>
          <InputLabel id="alerts-asset-filter-label">Asset</InputLabel>
          <Select
            labelId="alerts-asset-filter-label"
            label="Asset"
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value as number | '')}
          >
            <MenuItem value="all">All</MenuItem>
            {availableAssets.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.display_name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={handleView}
          sx={{ minWidth: 90, fontWeight: 600, height: 35, backgroundColor: '#1a1a1a', }}
        >
          View
        </Button>

      </Box>

      <div className="advisory-filters-row">
        <div className="deviation-filters advisory-severity-filters">
          {['All', 'S1', 'S2', 'S3', 'S4', 'S5'].map((sev) => {
            const isSelected = selectedSeverity === sev;

            const handleSeverityClick = () => {
              setSelectedSeverity(sev);
              setPage(0);
            };

            const advisoryCount =
              sev === 'All'
                ? advisories?.length
                : advisories?.filter(
                  adv => `S${adv.severity}` === sev
                ).length;
            const clsName = `deviation-chip deviation-chip--${severityClassMap[sev]}${isSelected ? ' deviation-chip--active' : ''}`;

            return (
              <button key={sev}
                className={clsName}
                onClick={handleSeverityClick}
              >
                <span className="deviation-chip__label">{sev}</span>
                <span className="deviation-chip__count">{advisoryCount}</span>
              </button>
            );
          })}

        </div>

        <div className="deviation-filters advisory-status-filters">
          {['All', 'Open', 'Acknowledged', 'In Progress', 'Resolved'].map((status) => {
            const isSelected = selectedStatus === status;

            const handleStatusClick = () => {
              setSelectedStatus(status);
              setPage(0);
            };

            const advisoryCount =
              status === 'All'
                ? advisories?.length
                : advisories?.filter(
                  adv => statusLabelMap[adv.status] === status
                ).length;
            const mainCls = status === 'All' || status === 'Open' ? 'deviation' : 'advisory-status';
            const clsName = `deviation-chip ${mainCls}-chip--${statusClassMap[status]}${isSelected ? ' deviation-chip--active' : ''}`;

            return (
              <button key={status}
                className={clsName}
                onClick={handleStatusClick}
              >
                <span className="deviation-chip__label">{status}</span>
                <span className="deviation-chip__count">{advisoryCount}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress color="secondary" />
        </Box>
      ) : (<>
        <Card className="advisory-summary__grid-card">
          <Box className="advisory-summary__export-actions">
            {/* <button type="button" className="advisory-export-btn"
              disabled={paginatedRows?.length === 0}>
              <DownloadOutlinedIcon className="advisory-export-btn__icon" />
              <span> PDF</span>
            </button> */}
            <button type="button" className="advisory-export-btn advisory-export-btn--xlsx"
              onClick={exportToXlsx} disabled={paginatedRows?.length === 0}>
              <DownloadOutlinedIcon className="advisory-export-btn__icon" />
              <span>XLSX</span>
            </button>
          </Box>
          <Box className="advisory-summary__grid-wrap">
            {paginatedRows?.length === 0 ? (
              <div className="empty-state">
                <InboxIcon />
                <p>No advisory found for the selected item.</p>
              </div>
            ) : (
              <Table size="small" className="alerts-table">
                <TableHead>
                  <TableRow>
                    {['Asset', 'Severity', 'Status', 'Engineer', 'Action Taken', 'Timestamp'].map(col => (
                      <TableCell key={col}>{col}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedRows?.map((row) => {
                    const sevClsName = `severity-badge severity-s${row?.severity}`;
                    const statusClsName = getStatusClassName(row?.status)
                    return (
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
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{getAssetName(row)}</TableCell>
                        <TableCell>
                          <span className={sevClsName}>{getSeverityLevelFull(row.severity)}</span>
                        </TableCell>
                        <TableCell>
                          <span className={statusClsName}>{getStatusText(row?.status)}</span>
                        </TableCell>
                        <TableCell>Engineer Name</TableCell>
                        <TableCell>{row?.action_taken ? row?.action_taken : '-'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {`${fmtDate(new Date(row?.detected_at))} ${fmtTime(new Date(row?.detected_at))}`}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>

              </Table>
            )}
          </Box>

          {paginatedRows && paginatedRows?.length > 0 && <TablePagination
            component="div"
            count={filteredRows?.length || 0}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
          />}

        </Card>
      </>
      )}

      {/* Advisory Details Modal */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { border: '1px solid #ccc', borderRadius: 2 } } }}
      >
        {selectedAdvisory && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', pb: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{selectedAdvisory.asset}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={getSeverityLevelFull(selectedAdvisory.severity).toUpperCase()}
                  size="small"
                  sx={{
                    backgroundColor: getSeverityBgColor(selectedAdvisory.severity),
                    color: getSeverityColor(selectedAdvisory.severity),
                    fontWeight: 700,
                    borderRadius: '4px',
                  }}
                />
                <StatusChip label={selectedAdvisory.status.toUpperCase()} status={selectedAdvisory.status} />
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3, mt: 2 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Sensor Name</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedAdvisory.sensor_name || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Anomaly Description</Typography>
                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>{selectedAdvisory?.description}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>First Detected</Typography>
                  <Typography variant="body1">
                    {selectedAdvisory.detected_at && !isNaN(new Date(selectedAdvisory.detected_at).getTime())
                      ? new Date(selectedAdvisory.detected_at).toLocaleString()
                      : '—'}
                  </Typography>
                </Box>
                {selectedAdvisory.root_cause_description && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Root Cause Description</Typography>
                    <Typography variant="body1" sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1 }}>
                      {selectedAdvisory.root_cause_description}
                    </Typography>
                  </Box>
                )}
                {selectedAdvisory.action_taken && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Action Taken</Typography>
                    <Typography variant="body1" sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1 }}>
                      {selectedAdvisory.action_taken}
                    </Typography>
                  </Box>
                )}
                {selectedAdvisory.image_path && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>RCA Evidence / Image</Typography>
                    <Box
                      component="img"
                      src={
                        selectedAdvisory.image_path.startsWith('http')
                          ? selectedAdvisory.image_path
                          : `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}${selectedAdvisory.image_path}`
                      }
                      alt="RCA Evidence"
                      sx={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 1, border: '1px solid #e2e8f0', mt: 1 }}
                    />
                  </Box>
                )}
              </Stack>
            </DialogContent>

            <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2 }}>
              {selectedAdvisory.status === AdvisoryStatus.OPEN && (
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!canAcknowledge}
                  onClick={() => handleAcknowledgeFromDetails(selectedAdvisory.id)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    '&.Mui-disabled': {
                      backgroundColor: '#e2e8f0',
                      color: '#94a3b8',
                    }
                  }}
                >
                  Acknowledge
                </Button>
              )}
              {selectedAdvisory.status !== AdvisoryStatus.RESOLVED && (
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!canRca}
                  onClick={() => handleInitiateRcaFromDetails(selectedAdvisory)}
                >
                  Initiate RCA
                </Button>
              )}
              <Button variant="outlined" color='secondary' onClick={handleCloseDetails} >
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
