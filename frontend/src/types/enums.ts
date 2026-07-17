export const SeverityLevel = {
  CRITICAL: 1,
  HIGH: 2,
  WARNING: 3,
  LOW: 4,
  INFO: 5,
} as const;
export type SeverityLevel = typeof SeverityLevel[keyof typeof SeverityLevel];

export const AlertStatus = {
  ACTIVE: 'active',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
} as const;
export type AlertStatus = typeof AlertStatus[keyof typeof AlertStatus];

export const AdvisoryStatus = {
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
} as const;
export type AdvisoryStatus = typeof AdvisoryStatus[keyof typeof AdvisoryStatus];

export const RcaStatus = {
  INITIATED: 'initiated',
  COMPLETED: 'completed',
} as const;
export type RcaStatus = typeof RcaStatus[keyof typeof RcaStatus];

export const TimeRange = {
  LAST_1H: 'last_1h',
  LAST_8H: 'last_8h',
  LAST_24H: 'last_24h',
  LAST_7D: 'last_7d',
  LAST_30D: 'last_30d',
  CUSTOM: 'custom',
} as const;
export type TimeRange = typeof TimeRange[keyof typeof TimeRange];

export const TimeRangeLabel = {
  [TimeRange.LAST_1H]: 'Last 1 Hour',
  [TimeRange.LAST_8H]: 'Last 8 Hours',
  [TimeRange.LAST_24H]: 'Last 24 Hours',
  [TimeRange.LAST_7D]: 'Last Week',
  [TimeRange.LAST_30D]: 'Last 30 Days',
  [TimeRange.CUSTOM]: 'Custom',
} as const;
export type TimeRangeLabel = typeof TimeRangeLabel[keyof typeof TimeRangeLabel];

export const TIME_RANGE_OPTIONS = Object.values(TimeRange).map(value => ({
  value,
  label: TimeRangeLabel[value],
}));

export const NodeType = {
  ENTERPRISE: 'enterprise',
  SITE: 'site',
  AREA: 'area',
  LINE: 'line',
  STATION: 'station',
  ASSET: 'asset',
  COMPONENT: 'component',
  SENSOR: 'sensor',
} as const;
export type NodeType = typeof NodeType[keyof typeof NodeType];
