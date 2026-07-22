import { AdvisoryStatus, AlertStatus } from '../types/enums';

export const STATUS_COLORS: Record<string | number, string> = {
  open:         '#e53a27', // red
  acknowledged: '#14a6db', // blue
  in_progress:  '#b45309', // yellow 
  resolved:     '#357a23', // green
  [AdvisoryStatus.OPEN]:         '#e53a27',
  [AdvisoryStatus.ACKNOWLEDGED]: '#14a6db',
  [AdvisoryStatus.IN_PROGRESS]:  '#b45309',
  [AdvisoryStatus.RESOLVED]:     '#357a23',
  [AlertStatus.ACTIVE]:          '#e53a27',
  [AlertStatus.CLOSED]:          '#357a23',
};

export const STATUS_BG_COLORS: Record<string | number, string> = {
  open:         'rgba(235, 86, 37, 0.12)',
  acknowledged: 'rgba(6, 119, 217, 0.12)',
  in_progress:  'rgba(239, 223, 53, 0.12)',
  resolved:     'rgba(22,163,74,0.12)',
  [AdvisoryStatus.OPEN]:         'rgba(235, 86, 37, 0.12)',
  [AdvisoryStatus.ACKNOWLEDGED]: 'rgba(6, 119, 217, 0.12)',
  [AdvisoryStatus.IN_PROGRESS]:  'rgba(239, 223, 53, 0.12)',
  [AdvisoryStatus.RESOLVED]:     'rgba(22,163,74,0.12)',
  [AlertStatus.ACTIVE]:          'rgba(235, 86, 37, 0.12)',
  [AlertStatus.CLOSED]:          'rgba(22,163,74,0.12)',
};

export const statusClassMap: Record<string, string> = {
  All: 'all',
  Open: 'high',
  'In Progress': 'in_progress',
  Acknowledged: 'acknowledged',
  Resolved: 'resolved',
};

export const getStatusColor = (status: string | number): string => {
  if (typeof status === 'number') {
    return STATUS_COLORS[status] ?? '#00A3E0';
  }
  return STATUS_COLORS[status?.toLowerCase()] ?? '#00A3E0';
};

export const getStatusBgColor = (status: string | number): string => {
  if (typeof status === 'number') {
    return STATUS_BG_COLORS[status] ?? 'rgba(6, 119, 217, 0.12)';
  }
  return STATUS_BG_COLORS[status?.toLowerCase()] ?? 'rgba(6, 119, 217, 0.12)';
};

export const statusOptions = ['open', 'acknowledged', 'in_progress', 'resolved', '1', '2', '3', '4'];

export const getStatusClassName = (status: string | number) => {
  if (status === 'resolved' || status === AdvisoryStatus.RESOLVED) return 'advisory-chip advisory-chip--resolved';
  if (status === 'acknowledged' || status === AdvisoryStatus.ACKNOWLEDGED) return 'advisory-chip advisory-chip--acknowledged';
  if (status === 'in_progress' || status === AdvisoryStatus.IN_PROGRESS) return 'advisory-chip advisory-chip--in_progress';
  return 'advisory-chip advisory-chip--open';
};

export const getStatusText = (status: string | number) => {
  switch (status) {
    case 'in_progress':
    case AdvisoryStatus.IN_PROGRESS:
      return 'In Progress';
    case 'open':
    case AdvisoryStatus.OPEN:
      return 'Open';
    case 'acknowledged':
    case AdvisoryStatus.ACKNOWLEDGED:
      return 'Acknowledged';
    case 'resolved':
    case AdvisoryStatus.RESOLVED:
      return 'Resolved';
    default:
      return String(status);
  }
};

export const statusLabelMap: Record<string | number, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
  in_progress: 'In Progress',
  [AdvisoryStatus.OPEN]: 'Open',
  [AdvisoryStatus.ACKNOWLEDGED]: 'Acknowledged',
  [AdvisoryStatus.RESOLVED]: 'Resolved',
  [AdvisoryStatus.IN_PROGRESS]: 'In Progress',
};
