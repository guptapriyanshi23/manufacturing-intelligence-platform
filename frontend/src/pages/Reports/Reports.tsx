import React, { useState, useEffect } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, Button, Typography, CircularProgress,
  MenuItem, Select, FormControl, InputLabel, TextField, Paper,
} from '@mui/material';
import { Download as DownloadIcon, } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
// import { MetricCard } from '../../components/Cards/MetricCard';
import { api } from '../../api/client';
import { getSeverityColor, getSeverityLevel } from '../../constants/severity';
import type { HierarchyNode } from '../../types/hierarchy';
import { getStatusColor } from '../../constants/status';
import '../Alerts/Alerts.scss';
import './Reports.scss';
import { TimeRange, TIME_RANGE_OPTIONS, AdvisoryStatus } from '../../types/enums';
import BreadCrumsBar from '../../components/BreadCrumsBar/BreadCrumsBar';

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
const TotalAdvIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
);
const OpenIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
);
const AcknowledgedIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 5C5 5 1 12 1 12s4 7 11 7 11-7 11-7-4-7-11-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-2.5A2.5 2.5 0 1012 9a2.5 2.5 0 000 5z" /></svg>
);
const InProgressIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M22.7 19.3l-6.4-6.4c.5-1.4.2-3-.9-4.1-1.3-1.3-3.2-1.6-4.8-.8l2.8 2.8-2.1 2.1-2.8-2.8c-.8 1.6-.5 3.5.8 4.8 1.1 1.1 2.7 1.4 4.1.9l6.4 6.4 2.9-2.9z"/></svg>
);
const ResolvedIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
);

export const Reports: React.FC = () => {
  const location = useLocation();
  const context = useOutletContext<{ selectedNodeId?: number | null }>();
  const selectedNodeId = context?.selectedNodeId ?? (location.state?.selectedNodeId ? Number(location.state.selectedNodeId) : null);

  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);
  const [appliedNode, setAppliedNode] = useState<HierarchyNode | null>(null);
  const [timeRange, setTimeRange] = useState<string>(TimeRange.LAST_24H);
  const initial = getDateRange(TimeRange.LAST_24H);
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<{
    total: number;
    status_counts: Record<string, number>;
    severity_counts: Record<number, number>;
  } | null>(null);

  const fetchStats = (nodeId: number | null, rangeVal: string, from?: string, to?: string) => {
    if (!nodeId) {
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    let startIso: string | undefined = undefined;
    let endIso: string | undefined = undefined;

    if (rangeVal === TimeRange.CUSTOM) {
      if (from) startIso = new Date(from).toISOString();
      if (to) endIso = new Date(to).toISOString();
    } else {
      const range = getDateRange(rangeVal);
      startIso = new Date(range.from).toISOString();
      endIso = new Date(range.to).toISOString();
    }

    api.advisories.stats({
      node_id: nodeId,
      start_time: startIso,
      end_time: endIso
    })
      .then((res) => {
        setStats(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch stats:", err);
        setStats(null);
        setLoading(false);
      });
  };


  useEffect(() => {
    api.hierarchy.list(true)
      .then(setFlatNodes)
      .catch(() => setFlatNodes([]));
  }, []);

  useEffect(() => {
    if (flatNodes.length === 0) return;
    const matchingNode = selectedNodeId ? flatNodes.find(n => n.id === selectedNodeId) : null;
    setAppliedNode(matchingNode || null);

    if (selectedNodeId) {
      setBreadcrumbs(getBreadcrumbsPath(selectedNodeId, flatNodes));
      fetchStats(selectedNodeId, timeRange, fromDate, toDate);
    } else {
      setBreadcrumbs([]);
      setStats(null);
    }
  }, [selectedNodeId, flatNodes]);

  const handleTimeRangeChange = (val: string) => {
    setTimeRange(val);
    if (val !== TimeRange.CUSTOM) {
      const { from, to } = getDateRange(val);
      setFromDate(from);
      setToDate(to);
    }
  };

  const handleGenerateClick = () => {
    if (appliedNode) {
      fetchStats(appliedNode.id, timeRange, fromDate, toDate);
    }
  };

  const total = stats?.total || 0;
  const openCount = stats?.status_counts.open || 0;
  const ackCount = stats?.status_counts.acknowledged || 0;
  const resolvedCount = stats?.status_counts.resolved || 0;
  const inProgressCount = stats?.status_counts.in_progress || 0;
  const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';

  const severityChartData = [1, 2, 3, 4, 5].map(level => {
    const count = stats?.severity_counts[level] || stats?.severity_counts[level] || 0;
    return {
      severity: getSeverityLevel(level),
      count: count,
      originalSeverity: level,
    };
  });

  const statusChartData = [
    { status: 'Open', key: AdvisoryStatus.OPEN, count: openCount },
    { status: 'Acknowledged', key: AdvisoryStatus.ACKNOWLEDGED, count: ackCount },
    { status: 'In Progress', key: AdvisoryStatus.IN_PROGRESS, count: inProgressCount },
    { status: 'Resolved', key: AdvisoryStatus.RESOLVED, count: resolvedCount },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        url="/analytics"
      />

      <BreadCrumsBar breadcrumbsData={breadcrumbs} />

      <div className='reporting-analysis'>

        <Box className="reporting-analysis__filters-grid">

          <FormControl size="small">
            <InputLabel id="time-range-label">Time Range</InputLabel>
            <Select
              labelId="time-range-label"
              value={timeRange}
              label="Time Range"
              onChange={(e) => handleTimeRangeChange(e.target.value)}
            // displayEmpty
            // renderValue={timeRange === '' ? () => <span style={{ color: '#9e9e9e' }}>Select</span> : undefined}
            >
              <MenuItem value="">Select</MenuItem>
              {TIME_RANGE_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="From Date"
            type="datetime-local"
            size="small"
            value={fromDate}
            disabled={timeRange !== TimeRange.CUSTOM}
            onChange={(e) => setFromDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />

          <TextField
            label="To Date"
            type="datetime-local"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={toDate}
            disabled={timeRange !== TimeRange.CUSTOM}
            onChange={(e) => setToDate(e.target.value)}
            sx={{ minWidth: 200 }}
          />

          <Button
            variant="contained"
            className="reporting-analysis__generate-btn"
            onClick={handleGenerateClick}
            sx={{
              minWidth: 90, fontWeight: 600, height: 35,
              backgroundColor: '#1a1a1a',
            }}
          >
            Generate Report
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled={!appliedNode}
            onClick={() => console.log('Download PDF')}
            sx={{
              minWidth: 90, fontWeight: 600, height: 35,
              backgroundColor: 'var(--color-primary) !important',
              '&:hover': {
                backgroundColor: 'var(--color-primary-dark) !important'
              },
              '&.Mui-disabled': {
                backgroundColor: '#e0e0e0 !important',
                color: 'rgba(141, 138, 138, 0.83)'

              }
            }}
          >
            PDF
          </Button>
        </Box>

        {!appliedNode ? (
          <div className="empty-state">
            <InboxIcon />
            <p>Select heirarchy node to view analysis.</p>
          </div>

        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <CircularProgress color="secondary" />
          </Box>
        ) : (
          <>
            <div className="advisory-counters reporting-analysis__counters">

              <div className="counter-card counter-card--total">
                <div className="counter-card__icon"><TotalAdvIcon /></div>
                <div className="counter-card__body">
                  <span className="counter-card__value">{total}</span>
                  <span className="counter-card__label">Total Advisory</span>
                </div>
              </div>

              <div className="counter-card counter-card--unresolved">
                <div className="counter-card__icon"><OpenIcon /></div>
                <div className="counter-card__body">
                  <span className="counter-card__value">{openCount}
                    <span style={{ fontSize: '0.8rem', paddingLeft: '0.2rem' }}>{`(${pct(openCount)})`}</span>
                  </span>
                  <span className="counter-card__label">Open</span>
                </div>
              </div>

              <div className="counter-card counter-card--acknowledged">
                <div className="counter-card__icon"><AcknowledgedIcon /></div>
                <div className="counter-card__body">
                  <span className="counter-card__value">{ackCount}
                    <span style={{ fontSize: '0.8rem', paddingLeft: '0.2rem' }}>{`(${pct(ackCount)})`}</span>
                  </span>
                  <span className="counter-card__label">Acknowledged</span>
                </div>
              </div>
              
              <div className="counter-card counter-card--in_progress">
                <div className="counter-card__icon"><InProgressIcon /></div>
                <div className="counter-card__body">
                  <span className="counter-card__value">{inProgressCount}
                    <span style={{ fontSize: '0.8rem', paddingLeft: '0.2rem' }}>{`(${pct(inProgressCount)})`}</span>
                  </span>
                  <span className="counter-card__label">In Progress</span>
                </div>
              </div>

              <div className="counter-card counter-card--resolved">
                <div className="counter-card__icon"><ResolvedIcon /></div>
                <div className="counter-card__body">
                  <span className="counter-card__value">{resolvedCount}
                    <span style={{ fontSize: '0.8rem', paddingLeft: '0.2rem' }}>{`(${pct(resolvedCount)})`}</span>
                  </span>
                  <span className="counter-card__label">Resolved</span>
                </div>
              </div>
            </div>

            <Grid container spacing={3}>
              {/* Severity chart */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Advisory Count by Severity</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Number of advisories raised per severity level
                    </Typography>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart layout="vertical" data={severityChartData} margin={{ top: 8, right: 48, left: 16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 13 }} tickCount={7} />
                        <YAxis type="category" dataKey="severity" width={50} tick={{ fontSize: 13 }} />
                        <Tooltip formatter={(v) => [`${v}`, 'Count']} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={36}>
                          <LabelList dataKey="count" position="right" style={{ fontSize: 13, fontWeight: 600 }} />
                          {severityChartData.map(entry => (
                            <Cell key={entry.severity} fill={getSeverityColor(entry.originalSeverity)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Status chart */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Advisory Count by Status</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Distribution of advisories across workflow statuses
                    </Typography>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart layout="vertical" data={statusChartData} margin={{ top: 8, right: 48, left: 24, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 13 }} tickCount={7} />
                        <YAxis type="category" dataKey="status" width={100} tick={{ fontSize: 13 }} />
                        <Tooltip formatter={(v) => [`${v}`, 'Count']} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={36}>
                          <LabelList dataKey="count" position="right" style={{ fontSize: 13, fontWeight: 600 }} />
                          {statusChartData.map(entry => (
                            <Cell key={entry.key} fill={getStatusColor(entry.key)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default Reports;
