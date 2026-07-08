export const SEVERITY_COLORS: Record<string, string> = {
  S1: '#B91C1C',
  S2: '#EA580C',
  S3: '#D97706',
  S4: '#2563EB',
  S5: '#26ace1',
};

export const SEVERITY_BG_COLORS: Record<string, string> = {
  S1: 'rgba(185,28,28,0.12)',
  S2: 'rgba(234,88,12,0.12)',
  S3: 'rgba(217,119,6,0.12)',
  S4: 'rgba(37,99,235,0.12)',
  S5: 'rgba(38,172,225,0.12)',
};

export const SEVERITY_LEVEL_MAP: Record<string, string> = {
  critical: 'S1',
  high: 'S2',
  // medium: 'S3',
  warning: 'S3',
  low: 'S4',
  info: 'S5',
};

export const SEVERITY_LEVEL_FULL_MAP: Record<string, string> = {
  critical: 'S1 - Critical',
  high: 'S2 - High',
  warning: 'S3 - Warning',
  low: 'S4 - Low',
  info: 'S5 - Info',
};

export const getSeverityLevel = (severity: string): string =>
  SEVERITY_LEVEL_MAP[severity?.toLowerCase()] ?? 'S5';

export const getSeverityLevelFull = (severity: string): string =>
  SEVERITY_LEVEL_FULL_MAP[severity?.toLowerCase()] ?? 'S5 - Info';

export const getSeverityColor = (severity: string): string =>
  SEVERITY_COLORS[getSeverityLevel(severity)];

export const getSeverityBgColor = (severity: string): string =>
  SEVERITY_BG_COLORS[getSeverityLevel(severity)];

export const severityOptions = Object.keys(SEVERITY_LEVEL_MAP) as string[];
