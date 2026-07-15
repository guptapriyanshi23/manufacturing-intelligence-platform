import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Grid, Typography, Paper, Box, useTheme, Chip, Checkbox, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, ListItemText, Button, Stack,
  IconButton, Dialog, DialogContent, TextField, Breadcrumbs,
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot,
} from 'recharts';
import { OpenInFull as ExpandIcon, Close as CloseIcon, NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { api } from '../../api/client';
import type { HierarchyNode } from '../../types/hierarchy';
import { getSeverityBgColor, getSeverityColor, getSeverityLevelFull } from '../../constants/severity';
import { PageHeader } from '../../components/Cards/PageHeader';
import { HierarchySelector } from '../../components/Filters/HierarchySelector';

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
  timestamp: string;
  sensor_id: string;
  sensor_name: string;
  value: number;
}

const getBreadcrumbsPath = (nodeId: number, flatNodes: HierarchyNode[]): string[] => {
  const path: string[] = [];
  let current = flatNodes.find(n => n.id === nodeId);
  while (current) {
    path.unshift(current.display_name);
    current = current.parent_id ? flatNodes.find(n => n.id === current.parent_id) : undefined;
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
  const alertId = location.state?.alertId ? Number(location.state.alertId) : (searchParams.get('alertId') ? Number(searchParams.get('alertId')) : null);

  const [hierarchyLoading, setHierarchyLoading] = useState(true);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);
  const [descendantSensors, setDescendantSensors] = useState<HierarchyNode[]>([]);
  const [selectedSensorIds, setSelectedSensorIds] = useState<string[]>([]);
  const [telemetryPoints, setTelemetryPoints] = useState<TelemetryPoint[]>([]);
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [advisoriesFetched, setAdvisoriesFetched] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [appliedSensors, setAppliedSensors] = useState<HierarchyNode[]>([]);
  const [appliedSensorIds, setAppliedSensorIds] = useState<string[]>([]);

  const [selectedSiteId, setSelectedSiteId] = useState<number | ''>('');

  // Dropdown filter states
  const [selectedSensorId, setSelectedSensorId] = useState<number | ''>('');
  const [appliedSensorId, setAppliedSensorId] = useState<number | ''>('');

  const sites = React.useMemo(() => {
    return flatNodes.filter(n => n.node_type === 'site');
  }, [flatNodes]);

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
      setAppliedSensorId('');
      return;
    }

    const incomingSensorId = location.state?.originalSensorNodeId;
    if (incomingSensorId) {
      const sensorNode = flatNodes.find(n => n.id === incomingSensorId);
      if (sensorNode && sensorNode.node_type === 'sensor') {
        setSelectedSensorId(sensorNode.id);
        setAppliedSensorId(sensorNode.id);
        return;
      }
    }

    const node = flatNodes.find(n => n.id === initialNodeId);
    if (!node) return;

    if (node.node_type === 'sensor') {
      setSelectedSensorId(node.id);
      setAppliedSensorId(node.id);
    } else {
      if (selectedSensorId && !availableSensors.some(s => s.id === selectedSensorId)) {
        setSelectedSensorId('');
        setAppliedSensorId('');
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

  const fetchAdvisories = () => {
    const filters = initialNodeId ? { node_id: initialNodeId } : undefined;
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
    fetchAdvisories();
    const alertFilters = initialNodeId ? { node_id: initialNodeId } : undefined;
    api.alerts.list(alertFilters)
      .then(setAlerts)
      .catch((err) => console.error('Failed to load alerts:', err));
  }, [initialNodeId]);

  useEffect(() => {
    api.hierarchy.list(true)
      .then((res) => setFlatNodes(res))
      .catch(() => setFlatNodes([]))
      .finally(() => setHierarchyLoading(false));
  }, []);

  const getAdvisoryTimeWindow = (adv: any) => {
    const detectedTime = new Date(adv.first_detected).getTime();
    const now = Date.now();
    
    let startTime: number;
    let endTime: number;
    
    const fourHoursMs = 4 * 60 * 60 * 1000;
    const eightHoursMs = 8 * 60 * 60 * 1000;
    
    if (detectedTime + fourHoursMs > now) {
      endTime = now;
      startTime = now - eightHoursMs;
    } else {
      startTime = detectedTime - fourHoursMs;
      endTime = detectedTime + fourHoursMs;
    }
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

    return {
      from: new Date(startTime).toISOString(),
      to: new Date(endTime).toISOString(),
      fromLocal: formatLocalIST(startTime),
      toLocal: formatLocalIST(endTime)
    };
  };

  useEffect(() => {
    if (activeAdvisory) {
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
      setAppliedSensorIds([]);
      setAppliedSensorId(selectedSensorId);
      return;
    }

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
      setAppliedSensorIds([]);
      setAppliedSensorId(selectedSensorId);
      return;
    }

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
        setAppliedSensorIds(sensorIds);
        setAppliedSensorId(selectedSensorId);
        setAppliedTimeRange(timeRange);
        setAppliedFromDate(fromDate);
        setAppliedToDate(toDate);
      })
      .catch(() => {
        setTelemetryPoints([]);
        setAppliedSensors([]);
        setAppliedSensorIds([]);
        setAppliedSensorId(selectedSensorId);
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
            setAppliedSensorIds(sensorIds);
            if (incomingSensorId) {
              setAppliedSensorId(incomingSensorId);
            }
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
            setAppliedSensorIds([]);
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

    const alarmLimit = sensor.sensor_metadata?.alarm_limit ?? 0;
    const tripLimit = sensor.sensor_metadata?.trip_limit ?? 0;

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
      const pTime = new Date(p.timestamp).getTime();
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

  const handleDropdownSelectChange = (event: any) => {
    const value = event.target.value;
    const arrayValue = typeof value === 'string' ? value.split(',') : value;
    if (arrayValue.includes('__clear_all__')) {
      setSelectedSensorIds([]);
    } else {
      setSelectedSensorIds(arrayValue);
    }
  };

  const getAdvisoryTimestampStr = (adv: any) => {
    if (!adv) return null;
    const tDate = new Date(adv.first_detected);
    return tDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getAdvisoryMatchingPoint = (data: any[], adv: any) => {
    if (!adv || data.length === 0) return null;
    const advMs = new Date(adv.first_detected).getTime();
    
    // Check if the advisory time is within the bounds of the current chart X-axis range
    const startMs = data[0].timestampMs || 0;
    const endMs = data[data.length - 1].timestampMs || 0;
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

  const renderLineChart = (data: any[], sensor: HierarchyNode, height: number) => {
    const unit = sensor.sensor_metadata?.unit || '';
    const isMatchingAdvisory = activeAdvisory && (
      activeAdvisory.node_id === sensor.id || 
      activeAdvisory.sensor_id === sensor.sensor_metadata?.sensor_id
    );
    const advPoint = isMatchingAdvisory ? getAdvisoryMatchingPoint(data, activeAdvisory) : null;

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

  const severityPriority: Record<string, number> = { critical: 1, warning: 2, info: 3 };
  const openAdvisories = advisories
    .filter(a => a.status === 'open')
    .sort((a, b) => (severityPriority[a.severity] || 99) - (severityPriority[b.severity] || 99));

  const handleAcknowledge = async (advisoryId: number) => {
    try {
      await api.advisories.update(advisoryId, { status: 'acknowledged' });
      const nodeParam = selectedNode ? `&nodeId=${selectedNode.id}` : '';
      navigate(`/advisories?siteId=${selectedSiteId}${nodeParam}`);
    }
    catch (error) { console.error('Failed to acknowledge advisory:', error); }
  };

  const handleInitiateRca = (advisory: any) =>
    navigate('/root-cause', { state: { advisoryId: advisory.id, selectedNodeName: advisory.asset } });

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
        subtitle="Anomalous tags are shown by default, stacked one below the other. Use the dropdown to browse any other parameter on this asset — anomaly or not."
      />

      {breadcrumbs.length > 0 && (
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.secondary' }} />} sx={{ mb: 2 }}>
          {breadcrumbs.map((name, index, arr) => (
            <Typography
              key={name}
              color={index === arr.length - 1 ? 'text.primary' : 'text.secondary'}
              sx={{ fontWeight: index === arr.length - 1 ? 700 : 500, fontSize: '0.85rem' }}
            >
              {name}
            </Typography>
          ))}
        </Breadcrumbs>
      )}

      <Box sx={{ mb: 4 }}>
        <Paper sx={{ px: 2, py: 2.5, borderRadius: 2, border: '1px solid #ccc' }}>
          <Grid container spacing={3} sx={{ alignItems: 'center' }}>
            <Grid size={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
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
                  label="From" type="datetime-local" size="small" value={fromDate}
                  disabled={timeRange !== 'custom'}
                  onChange={(e) => { setFromDate(e.target.value); setIsTimeOverridden(true); }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  label="To" type="datetime-local" size="small" value={toDate}
                  disabled={timeRange !== 'custom'}
                  onChange={(e) => { setToDate(e.target.value); setIsTimeOverridden(true); }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 200 }}
                />

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



                <Box sx={{ flex: 1 }} />
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleViewClick}
                  sx={{ fontWeight: 700, px: 3, py: 1, ml: 1 }}
                >
                  View
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {hierarchyLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress size={40} color="secondary" />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Left Side: Telemetry Charts list */}
          <Grid size={activeAdvisory ? 8 : 12}>
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
                    const aAdvisory = openAdvisories.find(adv => adv.sensor_id === aSid);
                    const bAdvisory = openAdvisories.find(adv => adv.sensor_id === bSid);

                    const aPriority = aAdvisory ? (severityPriority[aAdvisory.severity] || 99) : 99;
                    const bPriority = bAdvisory ? (severityPriority[bAdvisory.severity] || 99) : 99;

                    return aPriority - bPriority;
                  })
                  .map(sensor => {
                    const sid = sensor.sensor_metadata?.sensor_id || '';
                    const data = getSensorDataPoints(sensor);
                    const unit = sensor.sensor_metadata?.unit || '';
                    const matchingAdvisory = openAdvisories.find(a => a.sensor_id === sid);

                    return (
                      <Grid size={12} key={sensor.id}>
                        <Grid container spacing={3} alignItems="stretch">
                          {/* Chart Area */}
                          <Grid size={12}>
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
                                {renderLineChart(data, sensor, 270)}
                              </Box>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Grid>
                    );
                  })
              )}
            </Grid>
          </Grid>

          {/* Right Side: Sticky Detailed Advisory Panel */}
          {activeAdvisory && (
            <Grid size={4}>
              <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid #ccc', position: 'sticky', top: 90, display: 'flex', flexDirection: 'column', height: 364 }}>
                {/* Scrollable Content Area */}
                <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, display: 'flex', flexDirection: 'column', gap: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: 'secondary.main', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                        ADVISORY INFO
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, mt: 0.5 }}>{activeAdvisory.asset || 'Equipment Advisory'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                      <Chip
                        label={getSeverityLevelFull(activeAdvisory.severity)}
                        size="small"
                        sx={{ backgroundColor: getSeverityBgColor(activeAdvisory.severity), color: getSeverityColor(activeAdvisory.severity), fontWeight: 700, borderRadius: '4px' }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textAlign: 'right' }}>
                        {new Date(activeAdvisory.first_detected).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>ADVISORY MESSAGE</Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.5, mt: 0.5 }}>{activeAdvisory.description}</Typography>
                  </Box>
                </Box>

                {/* Sticked Action Buttons Box */}
                <Box sx={{ display: 'flex', gap: 2, pt: 1.5, borderTop: '1px solid #eee' }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    size="small"
                    disabled={activeAdvisory.status === 'acknowledged'}
                    onClick={async () => {
                      try {
                        await api.advisories.update(activeAdvisory.id, { status: 'acknowledged' });
                        setAdvisories(prev => prev.map(a => a.id === activeAdvisory.id ? { ...a, status: 'acknowledged' } : a));
                      } catch (err) {
                        console.error("Failed to acknowledge advisory:", err);
                      }
                    }}
                    sx={{ fontWeight: 700, py: 1 }}
                  >
                    {activeAdvisory.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    color="secondary"
                    size="small"
                    onClick={() => {
                      navigate('/root-cause', { state: { advisoryId: activeAdvisory.id, selectedNodeName: activeAdvisory.asset || '' } });
                    }}
                    sx={{ fontWeight: 700, py: 1 }}
                  >
                    Initiate RCA
                  </Button>
                </Box>
              </Paper>
            </Grid>
          )}
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
            const sid = expandedSensor.sensor_metadata?.sensor_id || '';
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
