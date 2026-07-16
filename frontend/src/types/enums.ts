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
