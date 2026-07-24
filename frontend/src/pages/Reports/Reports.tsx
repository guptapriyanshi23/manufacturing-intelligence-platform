import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, Button, Typography, CircularProgress,
  MenuItem, Select, FormControl, InputLabel, TextField,
} from '@mui/material';
import { Download as DownloadIcon, } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { MetricCard } from '../../components/Cards/MetricCard';
import { api } from '../../api/client';
import { getSeverityBarColor, getSeverityLevel } from '../../constants/severity';
import type { HierarchyNode } from '../../types/hierarchy';
import { getStatusBarColor } from '../../constants/status';
import '../Alerts/Alerts.scss';
import './Reports.scss';
import { TimeRange, TIME_RANGE_OPTIONS, AdvisoryStatus } from '../../types/enums';
import BreadCrumsBar from '../../components/BreadCrumsBar/BreadCrumsBar';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { fmtDate, fmtTime } from '../../constants/datetimefmt';

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

  const severityChartRef = useRef(null);
  const statusChartRef = useRef(null);

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
    setLoading(true)
    api.hierarchy.list(true)
      .then(setFlatNodes)
      .catch(() => setFlatNodes([]))
      .finally(() => setLoading(false));
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

  const handleDownloadPdf = async () => {

    if (!fromDate || !toDate || !appliedNode || !stats?.total || !breadcrumbs) return;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const deloitteLogo = "/deloitteLogoWhite.png"
      const breadcrumbText = breadcrumbs?.join(' > ') || appliedNode?.display_name;
      const currentDateTime = `${fmtDate(new Date())} | ${fmtTime(new Date())}`;

      const pageWidth = pdf.internal.pageSize.getWidth();

      // Black strip
      pdf.setFillColor(22, 22, 22);
      pdf.rect(0, 0, pageWidth, 12, 'F');
      pdf.addImage(deloitteLogo, 'PNG', 4, 3, 18.5, 4.2);
      pdf.setDrawColor(90, 90, 90);
      pdf.setLineWidth(0.2);
      pdf.line(25, 2, 25, 8);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text('FactoryWize Asset Digital Twin', 28, 6.5);

      //Breadcrum strip
      pdf.setFillColor(250, 250, 250);

      pdf.rect(0, 10, pageWidth, 8, 'F');
      pdf.setDrawColor(220, 220, 220);

      pdf.line(0, 18, pageWidth, 18);
      pdf.setFont('helvetica', 'normal');

      pdf.setFontSize(8);

      pdf.setTextColor(84, 101, 128);

      pdf.text(breadcrumbText, 14, 15);
      const dateWidth = pdf.getTextWidth(currentDateTime);

      pdf.text(currentDateTime, pageWidth - dateWidth - 15, 15);

      // Header
      let y = 28;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Analytics Report', 14, y);

      pdf.setFont('helvetica', 'normal');

      y += 6;

      pdf.text(
        `Date Range: ${fmtDate(new Date(fromDate))} ${fmtTime(new Date(fromDate))} - ${fmtDate(new Date(toDate))} ${fmtTime(new Date(toDate))}`,
        14,
        y
      );

      y += 8;

      // Summary Cards
      const cards = [
        {
          label: 'Total Advisory',
          value: total,
          fillColor: [220, 221, 222],      // #dcddde
          borderColor: [145, 151, 152],    // #919798
          textColor: [96, 125, 139]
        },
        {
          label: 'Open',
          value: `${openCount} (${pct(openCount)})`,
          fillColor: [252, 235, 235],
          borderColor: [229, 115, 115],
          textColor: [211, 47, 47]
        },
        {
          label: 'Acknowledged',
          value: `${ackCount} (${pct(ackCount)})`,
          fillColor: [230, 247, 253],      // #e6f7fd
          borderColor: [125, 217, 245],    // #7dd9f5
          textColor: [2, 136, 209]
        },
        {
          label: 'In Progress',
          value: `${inProgressCount} (${pct(inProgressCount)})`,
          fillColor: [250, 247, 231],      // #faf7e7
          borderColor: [240, 211, 79],     // #f0d34f
          textColor: [245, 124, 0]
        },
        {
          label: 'Resolved',
          value: `${resolvedCount} (${pct(resolvedCount)})`,
          fillColor: [237, 249, 234],      // #edf9ea
          borderColor: [159, 209, 148],    // #9fd194
          textColor: [56, 142, 60]
        }
      ];

      const margin = 14;
      const gap = 4;
      const cardWidth =
        (pageWidth - margin * 2 - gap * 4) / 5;
      const cardHeight = 18;
      let x = margin;

      cards.forEach(card => {
        pdf.setFillColor(
          card.fillColor[0],
          card.fillColor[1],
          card.fillColor[2]
        );

        pdf.rect(x, y, cardWidth, cardHeight, 'F');

        pdf.setDrawColor(
          card.borderColor[0],
          card.borderColor[1],
          card.borderColor[2]
        );

        pdf.setLineWidth(0.2);

        pdf.rect(x, y, cardWidth, cardHeight);

        pdf.setTextColor(
          card.textColor[0],
          card.textColor[1],
          card.textColor[2]
        );

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);

        pdf.text(String(card.value), x + 3, y + 7);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);

        pdf.text(card.label, x + 3, y + 14);

        x += cardWidth + gap;
      });

      y += 25;

      const chartWidth = pageWidth - (margin*2);
      const chartHeight = 95;

      // Severity Chart
      if (severityChartRef.current) {
        const canvas = await html2canvas(severityChartRef.current, {
          scale: 2,
          useCORS: true
        });

        const img = canvas.toDataURL('image/png');
        pdf.addImage(
          img,
          'PNG',
          margin,
          y,
          chartWidth,
          chartHeight
        );

        y += chartHeight + 2;
      }

      // Move to next page if required
      if (y + chartHeight > 270) {
        pdf.addPage();
        y = 20;
      }

      // Status Chart
      if (statusChartRef.current) {
        const canvas = await html2canvas(statusChartRef.current, {
          scale: 2,
          useCORS: true
        });

        const img = canvas.toDataURL('image/png');
        pdf.addImage(
          img,
          'PNG',
          margin,
          y,
          chartWidth,
          chartHeight
        );

        y += chartHeight + 4;
      }

      pdf.save(
        `Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`
      );
    } catch (error) {
      console.error('Error generating PDF', error);
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
              minWidth: 90, fontWeight: 600,
              backgroundColor: '#1a1a1a',
            }}
          >
            Generate Report
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled={!appliedNode || !stats?.total}
            onClick={handleDownloadPdf}
            sx={{
              minWidth: 90, fontWeight: 600, 
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

        <div className="advisory-counters reporting-analysis__counters">
          {['Total Advisory', 'Open', 'Acknowledged', 'In Progress', 'Resolved'].map((label, i) =>
            <MetricCard key={i} label={label} stats={stats} />
          )}
        </div>

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
            <Grid container spacing={3}>
              {/* Severity chart */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card ref={severityChartRef} className="advisory-summary__grid-card">
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
                          {severityChartData?.map(entry => (
                            <Cell key={entry.severity} fill={getSeverityBarColor(entry.originalSeverity)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Status chart */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card ref={statusChartRef} className="advisory-summary__grid-card">
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
                          {statusChartData?.map(entry => (
                            <Cell key={entry.key} fill={getStatusBarColor(entry.key)} />
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
