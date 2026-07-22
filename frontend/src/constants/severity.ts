export const Severity = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
  INFO: 5,
  1: 'CRITICAL',
  2: 'HIGH',
  3: 'MEDIUM',
  4: 'LOW',
  5: 'INFO',
} as const;
export type Severity = typeof Severity[keyof typeof Severity];

export const SEVERITY_COLORS: Record<string, string> = {
  S1: '#7f1d1d',
  S2: '#9f1239',
  S3: '#b45309',
  S4: '#854d0e',
  S5: '#475569',
};

export const SEVERITY_BG_COLORS: Record<string, string> = {
  S1: 'rgba(185,28,28,0.12)',
  S2: 'rgba(234,88,12,0.12)',
  S3: 'rgba(217,119,6,0.12)',
  S4: 'rgba(37,99,235,0.12)',
  S5: 'rgba(38,172,225,0.12)',
};

export const SEVERITY_BAR_COLORS: Record<string, string> = {
  S1: '#f05252',
  S2: '#e9878d',
  S3: '#f0d66b',
  S4: '#ebe491',
  S5: '#c0d4ed',
};

export const SEVERITY_LEVEL_MAP: Record<string | number, string> = {
  1: 'S1',
  2: 'S2',
  3: 'S3',
  4: 'S4',
  5: 'S5',
  critical: 'S1',
  high: 'S2',
  medium: 'S3',
  // medium: 'S3',
  low: 'S4',
  info: 'S5',
  informational: 'S5',
};

export const SEVERITY_LEVEL_FULL_MAP: Record<string | number, string> = {
  1: 'S1 - Critical',
  2: 'S2 - High',
  3: 'S3 - Medium',
  4: 'S4 - Low',
  5: 'S5 - Informational',
  critical: 'S1 - Critical',
  high: 'S2 - High',
  medium: 'S3 - Medium',
  // medium: 'S3 - Medium',
  low: 'S4 - Low',
  info: 'S5 - Informational',
  informational: 'S5 - Informational',
};

export const severityClassMap: Record<string, string> = {
  All: 'all',
  S1: 'high',
  S2: 'high',
  S3: 'moderate',
  S4: 'low',
  S5: 'low',
};

export const getSeverityLevel = (severity: string | number): string => {
  if (severity === undefined || severity === null) return 'S5';
  const key = typeof severity === 'string' ? severity.toLowerCase() : severity;
  return SEVERITY_LEVEL_MAP[key] ?? 'S5';
};

export const getSeverityName = (severity: string | number): string => {
  if (severity === undefined || severity === null) return 'INFO';
  const val = typeof severity === 'string' ? parseInt(severity, 10) : severity;
  if (!isNaN(Number(val)) && Number(val) in Severity) {
    return Severity[Number(val) as keyof typeof Severity] as unknown as string;
  }
  const key = String(severity).toUpperCase();
  if (key === 'CRITICAL' || key === 'HIGH' || key === 'MEDIUM' || key === 'LOW' || key === 'INFO') {
    return key;
  }
  if (key === 'MEDIUM') return 'MEDIUM';
  if (key === 'INFORMATIONAL') return 'INFO';
  return 'INFO';
};

export const getSeverityLevelFull = (severity: string | number): string => {
  const level = getSeverityLevel(severity);
  const name = getSeverityName(severity);
  return `${level} - ${name.charAt(0) + name.slice(1).toLowerCase()}`;
};

export const getSeverityColor = (severity: string | number): string =>
  SEVERITY_COLORS[getSeverityLevel(severity)];

export const getSeverityBgColor = (severity: string | number): string =>
  SEVERITY_BG_COLORS[getSeverityLevel(severity)];

export const getSeverityBarColor = (severity: string | number): string =>
  SEVERITY_BAR_COLORS[getSeverityLevel(severity)];

export const severityOptions = ['critical', 'high', 'medium', 'low', 'info'];

