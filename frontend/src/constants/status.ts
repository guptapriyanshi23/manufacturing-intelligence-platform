export const STATUS_COLORS: Record<string, string> = {
  open:         '#e53a27', // red
  acknowledged: '#14a6db', // blue
  in_progress:  '#ecd800', // yellow 
  resolved:     '#357a23', // green
};

export const STATUS_BG_COLORS: Record<string, string> = {
  open:         'rgba(235, 86, 37, 0.12)',
  acknowledged: 'rgba(6, 119, 217, 0.12)',
  in_progress:  'rgba(239, 223, 53, 0.12)',
  resolved:     'rgba(22,163,74,0.12)',
};

export const statusClassMap: Record<string, string> = {
  All: 'all',
  Open: 'high',
  "In Progress": 'in_progress',
  Acknowledged: 'acknowledged',
  Resolved: 'resolved',
};

export const getStatusColor = (status: string): string =>
  STATUS_COLORS[status?.toLowerCase()] ?? '#00A3E0';

export const getStatusBgColor = (status: string): string =>
  STATUS_BG_COLORS[status?.toLowerCase()] ?? 'rgba(6, 119, 217, 0.12)';

export const statusOptions = Object.keys(STATUS_COLORS) as string[];

export const getStatusClassName = (status: string) => {
  if (status === 'resolved') return 'advisory-chip advisory-chip--resolved';
  if (status === 'acknowledged') return 'advisory-chip advisory-chip--acknowledged';
  if (status === 'in_progress') return 'advisory-chip advisory-chip--in_progress';
  return 'advisory-chip advisory-chip--open';
};

export const getStatusText = (status: string) => {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'open':
      return 'Open';
    case 'acknowledged':
      return 'Acknowledged';
    case 'resolved':
      return 'Resolved';
    default:
      return status;
  }
};

export const statusLabelMap: Record<string, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
  in_progress: 'In Progress',
};