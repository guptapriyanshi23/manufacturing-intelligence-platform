import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Grid, Typography, Paper, Box, useTheme, Chip, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Button,
  IconButton, Dialog, DialogContent, TextField, Card
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot,
} from 'recharts';
import { OpenInFull as ExpandIcon, Close as CloseIcon } from '@mui/icons-material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { api } from '../../api/client';
import type { HierarchyNode } from '../../types/hierarchy';
import { getSeverityBgColor, getSeverityColor, getSeverityLevelFull } from '../../constants/severity';
import { PageHeader } from '../../components/Cards/PageHeader';
import { AdvisoryStatus, SeverityLevel } from '../../types/enums';
import BreadCrumsBar from '../../components/BreadCrumsBar/BreadCrumsBar';
import '../alerts/Alerts.scss';
import './Dashboard.scss';

const TIME_RANGE_OPTIONS = [
  { value: 'last_1h', label: 'Last 1 Hour' },
  { value: 'last_8h', label: 'Last 8 Hours' },
  { value: 'last_24h', label: 'Last 24 Hours' },
  { value: 'last_7d', label: 'Last Week' },
  { value: 'last_30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
];

const getDateRange = (rangeValue: string) => {
  const now = new Date();
  const map: Record<string, number> = { last_1h: 1, last_8h: 8, last_24h: 24, last_7d: 168, last_30d: 720 };
  const hours = map[rangeValue] ?? 24;
  const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 16), to: now.toISOString().slice(0, 16) };
};

interface TelemetryPoint {
  timestamp: string | null;
  sensor_id: string;
  sensor_name: string;
  value: number | null;
}

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

export const Dashboard: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const context = useOutletContext<{ selectedNodeId?: number | null }>();
  const initialNodeId = context?.selectedNodeId ?? (location.state?.selectedNodeId ? Number(location.state.selectedNodeId) : (searchParams.get('selectedNodeId') ? Number(searchParams.get('selectedNodeId')) : null));
  const [hierarchyLoading, setHierarchyLoading] = useState(true);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);
  const [telemetryPoints, setTelemetryPoints] = useState<TelemetryPoint[]>([]);
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [advisoriesFetched, setAdvisoriesFetched] = useState(false);
  const [appliedSensors, setAppliedSensors] = useState<HierarchyNode[]>([]);

  const [selectedSiteId, setSelectedSiteId] = useState<number | ''>('');

  // Dropdown filter states
  const [selectedSensorId, setSelectedSensorId] = useState<number | ''>('');

  React.useEffect(() => {
    if (flatNodes.length > 0) {
      const sitesList = flatNodes.filter(n => n.node_type === 'site');
      if (initialNodeId) {
        let current: HierarchyNode | undefined = flatNodes.find(n => n.id === initialNodeId);
        let siteId: number | '' = '';
        while (current) {
          if (current.node_type === 'site') {
            siteId = current.id;
            break;
          }
          const pId = current.parent_id;
          current = pId ? flatNodes.find(n => n.id === pId) : undefined;
        }
        setSelectedSiteId(siteId || sitesList[0]?.id || '');
      } else {
        if (!selectedSiteId) {
          setSelectedSiteId(sitesList[0]?.id || '');
        }
      }
    }
  }, [flatNodes, initialNodeId]);

  // Helper to get descendant nodes of a given node ID
  const getDescendantNodes = React.useMemo(() => {
    return (nodeId: number): HierarchyNode[] => {
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
        }

        flatNodes
          .filter(n => n.parent_id === id)
          .forEach(n => queue.push(n.id));
      }
      return result;
    };
  }, [flatNodes]);

  // Nodes corresponding to the hierarchy selected in the side panel
  const descendantsOfSidePanel = React.useMemo(() => {
    if (!initialNodeId) return flatNodes;
    return getDescendantNodes(initialNodeId);
  }, [initialNodeId, flatNodes, getDescendantNodes]);

  // Sensor/Tag dropdown options
  const availableSensors = React.useMemo(() => {
    return descendantsOfSidePanel.filter(n => n.node_type === 'sensor');
  }, [descendantsOfSidePanel]);

  const isAssetSelected = React.useMemo(() => {
    return flatNodes.find(n => n.id === initialNodeId)?.node_type === 'asset';
  }, [initialNodeId, flatNodes]);

  // Autopopulate and sync dropdown selections based on the side panel hierarchy node selection in Dashboard
  React.useEffect(() => {
    if (flatNodes.length === 0) return;

    if (!initialNodeId) {
      setSelectedSensorId('');
      return;
    }

    const incomingSensorId = location.state?.originalSensorNodeId;
    if (incomingSensorId) {
      const sensorNode = flatNodes.find(n => n.id === incomingSensorId);
      if (sensorNode && sensorNode.node_type === 'sensor') {
        setSelectedSensorId(sensorNode.id);
        return;
      }
    }

    const node = flatNodes.find(n => n.id === initialNodeId);
    if (!node) return;

    if (node.node_type === 'sensor') {
      setSelectedSensorId(node.id);
    } else {
      if (selectedSensorId && !availableSensors.some(s => s.id === selectedSensorId)) {
        setSelectedSensorId('');
      }
    }
  }, [initialNodeId, flatNodes, availableSensors, location.state?.originalSensorNodeId]);

  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  useEffect(() => {
    if (initialNodeId && flatNodes.length > 0) {
      setBreadcrumbs(getBreadcrumbsPath(initialNodeId, flatNodes));
    } else {
      setBreadcrumbs([]);
    }
  }, [initialNodeId, flatNodes]);

  // Find active advisory details if initialNodeId is present
  const activeAdvisory = React.useMemo(() => {
    if (!initialNodeId || advisories.length === 0) return null;
    const descendants = getDescendantNodes(initialNodeId);
    const descendantIds = descendants.map(d => d.id);
    return advisories.find(a => a.node_id === initialNodeId || descendantIds.includes(a.node_id)) || null;
  }, [initialNodeId, advisories, getDescendantNodes]);

  const initRange = getDateRange('last_24h');
  const [timeRange, setTimeRange] = useState('last_24h');
  const [fromDate, setFromDate] = useState(initRange.from);
  const [toDate, setToDate] = useState(initRange.to);
  const [appliedTimeRange, setAppliedTimeRange] = useState('last_24h');
  const [appliedFromDate, setAppliedFromDate] = useState(initRange.from);
  const [appliedToDate, setAppliedToDate] = useState(initRange.to);
  const [isTimeOverridden, setIsTimeOverridden] = useState(false);

  const handleTimeRangeChange = (val: string) => {
    setTimeRange(val);
    setIsTimeOverridden(true);

    // Don't auto-update dates for custom range
    if (val !== 'custom') {
      const { from, to } = getDateRange(val);
      setFromDate(from);
      setToDate(to);
    }
  };

  const getHoursFromRange = () => {
    const map: Record<string, number> = { last_1h: 1, last_8h: 8, last_24h: 24, last_7d: 168, last_30d: 720 };
    return map[timeRange] ?? 24;
  };

  // Telemetry line chart expand state
  const [expandedSensor, setExpandedSensor] = useState<HierarchyNode | null>(null);
  const sensorExpInit = getDateRange('last_24h');
  const [sensorExpTimeRange, setSensorExpTimeRange] = useState('last_24h');
  const [sensorExpFrom, setSensorExpFrom] = useState(sensorExpInit.from);
  const [sensorExpTo, setSensorExpTo] = useState(sensorExpInit.to);
  const [expandedTelemetry, setExpandedTelemetry] = useState<TelemetryPoint[]>([]);
  const [expandedTelemetryLoading, setExpandedTelemetryLoading] = useState(false);
  const [expandedGranularity, setExpandedGranularity] = useState<string>('auto');

  const handleSensorExpTimeRangeChange = (val: string) => {
    setSensorExpTimeRange(val);
    const { from, to } = getDateRange(val);
    setSensorExpFrom(from); setSensorExpTo(to);
  };

  const openSensorExpanded = (sensor: HierarchyNode) => {
    setExpandedSensor(sensor);
    const { from, to } = getDateRange(timeRange);
    setSensorExpTimeRange(timeRange); setSensorExpFrom(from); setSensorExpTo(to);
    setExpandedGranularity('auto');
  };

  useEffect(() => {
    if (!expandedSensor) {
      setExpandedTelemetry([]);
      return;
    }
    const sid = expandedSensor.sensor_metadata?.sensor_id;
    if (!sid) return;

    setExpandedTelemetryLoading(true);
    const getExpHours = () => {
      const map: Record<string, number> = { last_1h: 1, last_8h: 8, last_24h: 24, last_7d: 168, last_30d: 720 };
      return map[sensorExpTimeRange] ?? 24;
    };

    const customStart = sensorExpTimeRange === 'custom' ? new Date(sensorExpFrom).toISOString() : undefined;
    const customEnd = sensorExpTimeRange === 'custom' ? new Date(sensorExpTo).toISOString() : undefined;

    api.dashboard.getTelemetry(
      [sid],
      getExpHours(),
      expandedGranularity === 'auto' ? undefined : expandedGranularity,
      customStart,
      customEnd
    )
      .then(setExpandedTelemetry)
      .catch(() => setExpandedTelemetry([]))
      .finally(() => setExpandedTelemetryLoading(false));
  }, [expandedSensor, sensorExpTimeRange, expandedGranularity, sensorExpFrom, sensorExpTo]);




  const targetNodeForAdvisory = location.state?.alertId
    ? (location.state?.originalSensorNodeId ? Number(location.state.originalSensorNodeId) : (location.state?.selectedNodeId ? Number(location.state.selectedNodeId) : null))
    : initialNodeId;

  const fetchAdvisories = (nodeId: number | null) => {
    const filters = nodeId ? { node_id: nodeId } : undefined;
    api.advisories.list(filters)
      .then((res) => {
        setAdvisories(res);
        setAdvisoriesFetched(true);
      })
      .catch((err) => {
        console.error('Failed to load advisories:', err);
        setAdvisoriesFetched(true);
      });
  };

  useEffect(() => {
    fetchAdvisories(targetNodeForAdvisory);
  }, [targetNodeForAdvisory]);

  useEffect(() => {
    api.hierarchy.list(true)
      .then((res) => setFlatNodes(res))
      .catch(() => setFlatNodes([]))
      .finally(() => setHierarchyLoading(false));
  }, []);

  const getAdvisoryTimeWindow = (adv: any) => {
    const formatLocalIST = (ms: number) => {
      const dateObj = new Date(ms);
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(dateObj);
      const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
      return `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}`;
    };

    const detectedTime = adv?.detected_at ? new Date(adv.detected_at).getTime() : NaN;
    const now = Date.now();
    const fourHoursMs = 4 * 60 * 60 * 1000;
    const eightHoursMs = 8 * 60 * 60 * 1000;

    let startTime: number;
    let endTime: number;

    if (!isNaN(detectedTime)) {
      if (detectedTime + fourHoursMs > now) {
        endTime = now;
        startTime = now - eightHoursMs;
      } else {
        startTime = detectedTime - fourHoursMs;
        endTime = detectedTime + fourHoursMs;
      }
    } else {
      endTime = now;
      startTime = now - eightHoursMs;
    }

    return {
      from: new Date(startTime).toISOString(),
      to: new Date(endTime).toISOString(),
      fromLocal: formatLocalIST(startTime),
      toLocal: formatLocalIST(endTime)
    };
  };

  useEffect(() => {
    if (activeAdvisory && activeAdvisory.status !== AdvisoryStatus.RESOLVED) {
      const window = getAdvisoryTimeWindow(activeAdvisory);
      setTimeRange('custom');
      setFromDate(window.fromLocal);
      setToDate(window.toLocal);
      setIsTimeOverridden(false);
    }
  }, [activeAdvisory]);

  const handleViewClick = () => {
    let activeNodeId = initialNodeId;
    if (selectedSensorId) {
      activeNodeId = Number(selectedSensorId);
    }

    if (!activeNodeId) {
      setTelemetryPoints([]);
      setAppliedSensors([]);
      return;
    }

    fetchAdvisories(activeNodeId);

    const sensors: HierarchyNode[] = [];
    const queue = [activeNodeId];
    const visited = new Set<number>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const node = flatNodes.find(n => n.id === currentId);
      if (node) {
        if (node.node_type === 'sensor') {
          sensors.push(node);
        }
        flatNodes
          .filter(n => n.parent_id === currentId)
          .forEach(child => queue.push(child.id));
      }
    }

    const sensorIds = sensors.map(s => s.sensor_metadata?.sensor_id).filter(Boolean) as string[];

    if (sensorIds.length === 0) {
      setTelemetryPoints([]);
      setAppliedSensors([]);
      return;
    }

    setTelemetryLoading(true);
    let customStart = timeRange === 'custom' ? new Date(fromDate).toISOString() : undefined;
    let customEnd = timeRange === 'custom' ? new Date(toDate).toISOString() : undefined;

    if (activeAdvisory && activeAdvisory.status !== AdvisoryStatus.RESOLVED && !isTimeOverridden) {
      const win = getAdvisoryTimeWindow(activeAdvisory);
      customStart = win.from;
      customEnd = win.to;
    }

    api.dashboard.getTelemetry(sensorIds, getHoursFromRange(), undefined, customStart, customEnd)
      .then((res) => {
        setTelemetryPoints(res);
        setAppliedSensors(sensors);
        setAppliedTimeRange(timeRange);
        setAppliedFromDate(fromDate);
        setAppliedToDate(toDate);
      })
      .catch(() => {
        setTelemetryPoints([]);
        setAppliedSensors([]);
      })
      .finally(() => setTelemetryLoading(false));
  };

  // Auto-run view click when initialNodeId is provided via URL
  useEffect(() => {
    if (!advisoriesFetched) return;
    if (initialNodeId && flatNodes.length > 0 && !telemetryLoading && telemetryPoints.length === 0) {
      // Find descendant sensors under the active node
      const incomingSensorId = location.state?.originalSensorNodeId;
      const targetNodeId = incomingSensorId ? Number(incomingSensorId) : initialNodeId;

      const sensors: HierarchyNode[] = [];
      const queue = [targetNodeId];
      const visited = new Set<number>();

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const node = flatNodes.find(n => n.id === currentId);
        if (node) {
          if (node.node_type === 'sensor') {
            sensors.push(node);
          }
          flatNodes
            .filter(n => n.parent_id === currentId)
            .forEach(child => queue.push(child.id));
        }
      }

      const sensorIds = sensors.map(s => s.sensor_metadata?.sensor_id).filter(Boolean) as string[];
      if (sensorIds.length > 0) {
        setTelemetryLoading(true);
        let customStart = timeRange === 'custom' ? new Date(fromDate).toISOString() : undefined;
        let customEnd = timeRange === 'custom' ? new Date(toDate).toISOString() : undefined;

        if (activeAdvisory && !isTimeOverridden) {
          const win = getAdvisoryTimeWindow(activeAdvisory);
          customStart = win.from;
          customEnd = win.to;
        }

        api.dashboard.getTelemetry(sensorIds, getHoursFromRange(), undefined, customStart, customEnd)
          .then((res) => {
            setTelemetryPoints(res);
            setAppliedSensors(sensors);
            if (activeAdvisory && !isTimeOverridden) {
              const win = getAdvisoryTimeWindow(activeAdvisory);
              setAppliedTimeRange('custom');
              setAppliedFromDate(win.fromLocal);
              setAppliedToDate(win.toLocal);
            } else {
              setAppliedTimeRange(timeRange);
              setAppliedFromDate(fromDate);
              setAppliedToDate(toDate);
            }
          })
          .catch(() => {
            setTelemetryPoints([]);
            setAppliedSensors([]);
          })
          .finally(() => setTelemetryLoading(false));
      }
    }
  }, [initialNodeId, flatNodes, activeAdvisory, isTimeOverridden, advisoriesFetched, location.state?.originalSensorNodeId]);

  const getBucketedDataPoints = (
    points: TelemetryPoint[],
    sensor: HierarchyNode,
    start: Date,
    end: Date,
    granularityStr?: string
  ) => {
    const sensorId = sensor.sensor_metadata?.sensor_id || '';
    const sensorPoints = points.filter(p => p.sensor_id === sensorId);



    let intervalMs = 10 * 60 * 1000; // default 10m
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (granularityStr && granularityStr !== 'auto') {
      const secondsMap: Record<string, number> = {
        '1m': 60,
        '5m': 300,
        '10m': 600,
        '1h': 3600,
        '6h': 21600,
        '1d': 86400,
      };
      if (secondsMap[granularityStr]) {
        intervalMs = secondsMap[granularityStr] * 1000;
      } else if (granularityStr === 'raw') {
        intervalMs = 60 * 1000; // raw approx 1m
      }
    } else {
      if (hours <= 2) {
        intervalMs = 60 * 1000; // 1m
      } else if (hours <= 24) {
        intervalMs = 10 * 60 * 1000; // 10m
      } else if (hours <= 168) {
        intervalMs = 60 * 60 * 1000; // 1h
      } else {
        intervalMs = 6 * 60 * 60 * 1000; // 6h
      }
    }

    const timePointsMap = new Map<number, any>();
    sensorPoints.forEach(p => {
      const pTime = new Date(p.timestamp || '').getTime();
      const bucketTime = Math.floor(pTime / intervalMs) * intervalMs;
      timePointsMap.set(bucketTime, p);
    });

    const bucketedPoints: any[] = [];
    const startBucket = Math.floor(start.getTime() / intervalMs) * intervalMs;
    const endBucket = Math.floor(end.getTime() / intervalMs) * intervalMs;

    for (let t = startBucket; t <= endBucket; t += intervalMs) {
      const existing = timePointsMap.get(t);
      const tDate = new Date(t);
      const timestampStr = tDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

      if (existing) {
        bucketedPoints.push({
          timestamp: timestampStr,
          timestampMs: t,
          value: existing.value,
          name: existing.sensor_name,
          alarmLimit: 80,
          tripLimit: 95,
        });
      } else {
        bucketedPoints.push({
          timestamp: timestampStr,
          timestampMs: t,
          value: 0, // Plot at 0 if no telemetry data is present
          name: sensorPoints[0]?.sensor_name || sensor.display_name,
          alarmLimit: 80,
          tripLimit: 95,
        });
      }
    }

    return bucketedPoints;
  };

  const getSensorDataPoints = (sensor: HierarchyNode) => {
    const now = new Date();
    const getAppliedHoursFromRange = () => {
      const map: Record<string, number> = { last_1h: 1, last_8h: 8, last_24h: 24, last_7d: 168, last_30d: 720 };
      return map[appliedTimeRange] ?? 24;
    };
    let start = new Date(now.getTime() - getAppliedHoursFromRange() * 60 * 60 * 1000);
    let end = now;
    if (appliedTimeRange === 'custom') {
      start = new Date(appliedFromDate);
      end = new Date(appliedToDate);
    }
    return getBucketedDataPoints(telemetryPoints, sensor, start, end);
  };

  const getAdvisoryMatchingPoint = (data: any[], adv: any) => {
    if (!adv || data.length === 0) return null;
    const startMs = data[0].timestampMs || 0;
    const endMs = data[data.length - 1].timestampMs || 0;
    const advMs = new Date(adv.detected_at).getTime();
    if (advMs < startMs || advMs > endMs) {
      return null;
    }

    let closestPt = data[0];
    let minDiff = Math.abs((data[0].timestampMs || 0) - advMs);

    for (let i = 1; i < data.length; i++) {
      const diff = Math.abs((data[i].timestampMs || 0) - advMs);
      if (diff < minDiff) {
        minDiff = diff;
        closestPt = data[i];
      }
    }
    return closestPt;
  };

  const renderLineChart = (data: any[], sensor: HierarchyNode, height: number, sensorAdvisory?: any) => {
    const unit = sensor.sensor_metadata?.unit || '';
    const resolvedAdvisory = sensorAdvisory !== undefined
      ? sensorAdvisory
      : advisories.find(a => a.node_id === sensor.id || a.sensor_id === sensor.sensor_metadata?.sensor_id);
    const advPoint = resolvedAdvisory ? getAdvisoryMatchingPoint(data, resolvedAdvisory) : null;

    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
          <XAxis dataKey="timestamp" stroke={theme.palette.text.secondary} style={{ fontSize: 10 }} />
          <YAxis stroke={theme.palette.text.secondary} style={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #ccc', borderRadius: 6, fontSize: 12 }} />
          <Legend verticalAlign="top" height={36} />
          <Line name={`${sensor.display_name} (${unit})`} type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} dot={false} />
          <Line name="Safe Limit" type="monotone" dataKey="alarmLimit" stroke="#16A34A" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          <Line name="Threshold" type="monotone" dataKey="tripLimit" stroke="#DC2626" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          {advPoint && (
            <ReferenceDot
              x={advPoint.timestamp}
              y={advPoint.value}
              r={7}
              fill="#FF1744"
              stroke="#FFFFFF"
              strokeWidth={3}
              label={{ value: '⚠ Advisory Triggered', position: 'top', fill: '#FF1744', fontSize: 11, fontWeight: 700 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  };





  // Expand dialog filter bar helper
  const renderExpandFilters = (
    tr: string, onTrChange: (v: string) => void,
    from: string, onFromChange: (v: string) => void,
    to: string, onToChange: (v: string) => void,
    granularity: string, onGranularityChange: (v: string) => void,
    onClose: () => void,
    extraRight?: React.ReactNode,
  ) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel shrink>Time Range</InputLabel>
          <Select
            value={tr}
            label="Time Range"
            onChange={(e) => onTrChange(e.target.value)}
            displayEmpty
            renderValue={tr === '' ? () => <span style={{ color: '#9e9e9e' }}>Select</span> : undefined}
          >
            <MenuItem value="" style={{ color: '#9e9e9e' }}>Select</MenuItem>
            {TIME_RANGE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel shrink>Granularity</InputLabel>
          <Select
            value={granularity}
            label="Granularity"
            onChange={(e) => onGranularityChange(e.target.value)}
            displayEmpty
            renderValue={granularity === '' ? () => <span style={{ color: '#9e9e9e' }}>Select</span> : undefined}
          >
            <MenuItem value="" style={{ color: '#9e9e9e' }}>Select</MenuItem>
            <MenuItem value="auto">Auto</MenuItem>
            <MenuItem value="raw">Raw Data</MenuItem>
            <MenuItem value="1m">1 Minute</MenuItem>
            <MenuItem value="5m">5 Minutes</MenuItem>
            <MenuItem value="10m">10 Minutes</MenuItem>
            <MenuItem value="1h">1 Hour</MenuItem>
            <MenuItem value="6h">6 Hours</MenuItem>
            <MenuItem value="1d">1 Day</MenuItem>
          </Select>
        </FormControl>

        <TextField label="From" type="datetime-local" size="small" value={from}
          onChange={(e) => onFromChange(e.target.value)} disabled={sensorExpTimeRange !== 'custom'}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 200 }} />
        <TextField label="To" type="datetime-local" size="small" value={to}
          onChange={(e) => onToChange(e.target.value)} disabled={sensorExpTimeRange !== 'custom'}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 200 }} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {extraRight}
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </Box>
    </Box>
  );

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Dashboard"
        url='/dashboard'
      />

      <BreadCrumsBar breadcrumbsData={breadcrumbs} />

      {/* Chart Selection Dropdown + Date Filters */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel shrink>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            displayEmpty
            renderValue={timeRange === '' ? () => <span style={{ color: '#9e9e9e' }}>Select</span> : undefined}
          >
            <MenuItem value="" style={{ color: '#9e9e9e' }}>Select</MenuItem>
            {TIME_RANGE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>

        <TextField
          label="Start Date"
          type="datetime-local" size="small" value={fromDate}
          disabled={timeRange !== 'custom'}
          onChange={(e) => { setFromDate(e.target.value); setIsTimeOverridden(true); }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 160 }}
        />
        <TextField
          label="End Date"
          type="datetime-local" size="small" value={toDate}
          disabled={timeRange !== 'custom'}
          onChange={(e) => { setToDate(e.target.value); setIsTimeOverridden(true); }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 160 }}
        />

        <Box></Box>

        <FormControl size="small" sx={{ minWidth: 200 }} disabled={!isAssetSelected}>
          <InputLabel shrink>Sensor/Tag</InputLabel>
          <Select
            value={selectedSensorId}
            onChange={(e) => setSelectedSensorId(e.target.value as number | '')}
            label="Sensor/Tag"
            displayEmpty
          >
            <MenuItem value="">All Sensors/Tags</MenuItem>
            {availableSensors.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.display_name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={handleViewClick}
          sx={{ minWidth: 90, fontWeight: 600, height: 35, backgroundColor: '#1a1a1a', }}
        >
          View
        </Button>
      </Box>


      {hierarchyLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress size={40} color="secondary" />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Telemetry Charts list */}
          <Grid size={12}>
            <Grid container spacing={3}>
              {appliedSensors.length === 0 && telemetryPoints.length === 0 && !telemetryLoading ? (
                <Grid size={12}>
                  
                  <Paper sx={{ p: 6, textAlign: 'center', border: '1px solid #ccc', borderRadius: 2 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                      No Telemetry Data Loaded
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      Please customize your hierarchy level, time range, asset, or tag filters and click the <strong>View</strong> button to load charts.
                    </Typography>
                  </Paper>
                </Grid>
              ) : telemetryLoading ? (
                <Grid size={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                    <CircularProgress size={40} color="secondary" />
                  </Box>
                </Grid>
              ) : appliedSensors.length === 0 ? (
                <Grid size={12}>
                  <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid #ccc' }}>
                    <Typography color="text.secondary">
                      No sensors defined under the selected hierarchy level. Select a level with configured sensor metadata.
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                appliedSensors
                  .sort((a, b) => {
                    const aSid = a.sensor_metadata?.sensor_id || '';
                    const bSid = b.sensor_metadata?.sensor_id || '';

                    const aAdvisory = advisories.find(adv =>
                      (adv.node_id === a.id || adv.sensor_id === aSid) &&
                      adv.status !== AdvisoryStatus.RESOLVED
                    );
                    const bAdvisory = advisories.find(adv =>
                      (adv.node_id === b.id || adv.sensor_id === bSid) &&
                      adv.status !== AdvisoryStatus.RESOLVED
                    );

                    const noAdvisoryPriority = Math.max(...Object.values(SeverityLevel)) + 1;
                    const aVal = aAdvisory ? aAdvisory.severity : noAdvisoryPriority;
                    const bVal = bAdvisory ? bAdvisory.severity : noAdvisoryPriority;

                    return aVal - bVal;
                  })
                  .map(sensor => {
                    const data = getSensorDataPoints(sensor);
                    const unit = sensor.sensor_metadata?.unit || '';
                    const sensorAdvisory = advisories.find(a =>
                      a.node_id === sensor.id ||
                      a.sensor_id === sensor.sensor_metadata?.sensor_id
                    );
                    const hasActiveAdvisory = sensorAdvisory && sensorAdvisory.status !== AdvisoryStatus.RESOLVED;

                    return (
                      <Grid size={12} key={sensor.id}>
                        <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
                          {/* Chart Area */}
                          <Grid size={8}>
                            <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid #ccc', height: '100%', display: 'flex', flexDirection: 'column' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>{sensor.display_name}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {data.length > 0 && data[data.length - 1].value !== null && (
                                    <Chip label={`Current: ${data[data.length - 1].value} ${unit}`} color="secondary" size="small" sx={{ fontWeight: 600 }} />
                                  )}
                                  <IconButton size="small" onClick={() => openSensorExpanded(sensor)} title="Expand">
                                    <ExpandIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </Box>
                              <Box sx={{ width: '100%', height: 270 }}>
                                {renderLineChart(data, sensor, 270, hasActiveAdvisory ? sensorAdvisory : null)}
                              </Box>
                            </Paper>
                          </Grid>
                          {/* Detailed Advisory Panel for this sensor */}
                          {hasActiveAdvisory ? (<Card className="process-analysis__chart-card process-analysis__advisory-card" sx={{ flex: '0 0 30%', }}>
                            <Box className="process-analysis__chart-header" sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography className="process-analysis__chart-title">Advisory</Typography>
                              <Chip
                                label={getSeverityLevelFull(sensorAdvisory.severity)}
                                size="small"
                                sx={{ backgroundColor: getSeverityBgColor(sensorAdvisory.severity), color: getSeverityColor(sensorAdvisory.severity), fontWeight: 600 }}
                              />
                            </Box>

                            <Box className="process-analysis__advisory-content">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography className="process-analysis__advisory-alert-title">{sensorAdvisory.asset || 'Equipment Advisory'}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textAlign: 'right' }}>
                                  {new Date(sensorAdvisory.detected_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                              </Box>
                              <Typography className="process-analysis__advisory-description">
                                {sensorAdvisory.description}
                              </Typography>

                              <Box className="process-analysis__advisory-actions">
                                <Button variant="outlined" size="small"
                                  disabled={sensorAdvisory.status === 'acknowledged'}
                                  sx={{
                                    borderColor: '#00A3E0',
                                    color: '#00A3E0',
                                    // fontWeight: 500,
                                    '&:hover': {
                                      backgroundColor: '#00a4e056',
                                      // fontWeight: 600,
                                    },
                                  }}
                                  onClick={async () => {
                                    try {
                                      await api.advisories.update(sensorAdvisory.id, { status: AdvisoryStatus.ACKNOWLEDGED });
                                      setAdvisories(prev => prev.map(a => a.id === sensorAdvisory.id ? { ...a, status: AdvisoryStatus.ACKNOWLEDGED } : a));
                                    } catch (err) {
                                      console.error("Failed to acknowledge advisory:", err);
                                    }
                                  }}
                                >{sensorAdvisory.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}
                                </Button>

                                <Button variant="contained" size="small"
                                  onClick={() => {
                                    navigate('/root-cause', { state: { advisoryId: sensorAdvisory.id, selectedNodeName: sensorAdvisory.asset || '' } });
                                  }}>
                                  Initiate RCA
                                </Button>
                              </Box>
                            </Box>
                          </Card>
                          ) : (
                            <Card className="process-analysis__chart-card process-analysis__advisory-card" sx={{ flex: '0 0 30%', }}>

                              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', py: 4 }}>
                                <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                                  No Advisory for this Sensor/Tag
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, px: 2 }}>
                                  This parameter is currently operating within normal limits.
                                </Typography>
                              </Box>
                            </Card>
                          )}
                        </Grid>
                      </Grid>
                    );
                  })
              )}
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* Expanded telemetry line chart dialog */}
      <Dialog
        open={!!expandedSensor}
        onClose={() => setExpandedSensor(null)}
        maxWidth={false}
        fullWidth
        slotProps={{ paper: { sx: { width: '95vw', maxWidth: '95vw', m: 2, border: '1px solid #000000', borderRadius: 2 } } }}
      >
        <DialogContent sx={{ p: 3 }}>
          {expandedSensor && (() => {
            const getExpStartEnd = () => {
              const now = new Date();
              const map: Record<string, number> = { last_1h: 1, last_8h: 8, last_24h: 24, last_7d: 168, last_30d: 720 };
              const hours = map[sensorExpTimeRange] ?? 24;
              let sTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
              let eTime = now;
              if (sensorExpTimeRange === 'custom') {
                sTime = new Date(sensorExpFrom);
                eTime = new Date(sensorExpTo);
              }
              return { start: sTime, end: eTime };
            };
            const { start, end } = getExpStartEnd();
            const data = getBucketedDataPoints(expandedTelemetry, expandedSensor, start, end, expandedGranularity);
            const unit = expandedSensor.sensor_metadata?.unit || '';
            return (
              <>
                {renderExpandFilters(
                  sensorExpTimeRange, handleSensorExpTimeRangeChange,
                  sensorExpFrom, setSensorExpFrom,
                  sensorExpTo, setSensorExpTo,
                  expandedGranularity, setExpandedGranularity,
                  () => setExpandedSensor(null),
                  data.length > 0 ? <Chip label={`Current: ${data[data.length - 1].value} ${unit}`} color="secondary" size="small" sx={{ fontWeight: 600 }} /> : undefined,
                )}
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{expandedSensor.display_name}</Typography>
                <Box sx={{ width: '100%', height: 500, position: 'relative' }}>
                  {expandedTelemetryLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress size={40} color="secondary" />
                    </Box>
                  ) : data.length === 0 ? (
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        No telemetry data found for the selected time range and granularity.
                      </Typography>
                    </Box>
                  ) : (
                    renderLineChart(data, expandedSensor, 500)
                  )}
                </Box>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>


    </PageContainer>
  );
};

export default Dashboard;
