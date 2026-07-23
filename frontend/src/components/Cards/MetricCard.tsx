import React from 'react';

const TotalAdvIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
);
const OpenIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
);
const AcknowledgedIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 5C5 5 1 12 1 12s4 7 11 7 11-7 11-7-4-7-11-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-2.5A2.5 2.5 0 1012 9a2.5 2.5 0 000 5z" /></svg>
);
const InProgressIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M22.7 19.3l-6.4-6.4c.5-1.4.2-3-.9-4.1-1.3-1.3-3.2-1.6-4.8-.8l2.8 2.8-2.1 2.1-2.8-2.8c-.8 1.6-.5 3.5.8 4.8 1.1 1.1 2.7 1.4 4.1.9l6.4 6.4 2.9-2.9z" /></svg>
);
const ResolvedIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
);

interface MetricCardProps {
  label: string;
  stats: any;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, stats }) => {
  const total = stats?.total || 0;
  const openCount = stats?.status_counts.open || 0;
  const ackCount = stats?.status_counts.acknowledged || 0;
  const inProgressCount = stats?.status_counts.in_progress || 0;
  const resolvedCount = stats?.status_counts.resolved || 0;

  const getIconByLabel = (label: string) => {
    switch (label) {
      case 'Open':
        return <OpenIcon />;
      case 'Acknowledged':
        return <AcknowledgedIcon />;
      case 'In Progress':
        return <InProgressIcon />;
      case 'Resolved':
        return <ResolvedIcon />;
      default:
        return <TotalAdvIcon />;
    }
  };
  
  const getValueByLabel = (label: string) => {
    switch (label) {
      case 'Open':
        return openCount;
      case 'Acknowledged':
        return ackCount;
      case 'In Progress':
        return inProgressCount;
      case 'Resolved':
        return resolvedCount;
      default:
        return total;
    }
  };

  const getClassName = (label: string) => {
    switch (label) {
      case 'Open':
        return 'counter-card--unresolved';
      case 'Acknowledged':
        return 'counter-card--acknowledged';
      case 'In Progress':
        return 'counter-card--in_progress';
      case 'Resolved':
        return 'counter-card--resolved';
      default:
        return 'counter-card--total';
    }
  };

  const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';

  return (
    <div className={`counter-card ${getClassName(label)}`}>
      <div className="counter-card__icon">{getIconByLabel(label)}</div>
      <div className="counter-card__body">
        <span className="counter-card__value">{getValueByLabel(label)}
          {label !== 'Total Advisory' && <span style={{ fontSize: '0.8rem', paddingLeft: '0.2rem' }}>{`(${pct(getValueByLabel(label))})`}</span>}
        </span>
        <span className="counter-card__label">{label}</span>
      </div>
    </div>

  );
};
