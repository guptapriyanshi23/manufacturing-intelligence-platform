export const STATUS_COLORS: Record<string, string> = {
  open:         '#2563EB', // blue
  acknowledged: '#D97706', // yellow/amber
  in_progress:  '#cfbf0c', // green 
  resolved:     '#16A34A', // green
};

export const STATUS_BG_COLORS: Record<string, string> = {
  open:         'rgba(37,99,235,0.12)',
  acknowledged: 'rgba(217,119,6,0.12)',
  in_progress:  'rgba(207,191,12,0.12)',
  resolved:     'rgba(22,163,74,0.12)',
};

export const getStatusColor = (status: string): string =>
  STATUS_COLORS[status?.toLowerCase()] ?? '#2563EB';

export const getStatusBgColor = (status: string): string =>
  STATUS_BG_COLORS[status?.toLowerCase()] ?? 'rgba(37,99,235,0.12)';

export const statusOptions = Object.keys(STATUS_COLORS) as string[];
