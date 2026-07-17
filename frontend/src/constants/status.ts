export const STATUS_COLORS: Record<string, string> = {
  open:         '#d84d3e', // red
  acknowledged: '#00A3E0', // blue
  in_progress:  '#ebda26', // yellow 
  resolved:     '#26890D', // green
};

export const STATUS_BG_COLORS: Record<string, string> = {
  open:         'rgba(235, 86, 37, 0.12)',
  acknowledged: 'rgba(6, 119, 217, 0.12)',
  in_progress:  'rgba(239, 223, 53, 0.12)',
  resolved:     'rgba(22,163,74,0.12)',
};

export const getStatusColor = (status: string): string =>
  STATUS_COLORS[status?.toLowerCase()] ?? '#00A3E0';

export const getStatusBgColor = (status: string): string =>
  STATUS_BG_COLORS[status?.toLowerCase()] ?? 'rgba(6, 119, 217, 0.12)';

export const statusOptions = Object.keys(STATUS_COLORS) as string[];
