import React from 'react';
import { Chip, useTheme } from '@mui/material';

interface StatusChipProps {
  label: string;
  status: string; // 'critical', 'warning', 'info', 'active', 'acknowledged', 'resolved'
}

export const StatusChip: React.FC<StatusChipProps> = ({ label, status }) => {
  const theme = useTheme();

  const getColors = () => {
    switch (status.toLowerCase()) {
      case 'critical':
      case 'active':
        return {
          bg: 'rgba(239, 68, 68, 0.1)',
          color: theme.palette.error.main,
          border: `1px solid rgba(239, 68, 68, 0.2)`,
        };
      case 'warning':
      case 'acknowledged':
        return {
          bg: 'rgba(245, 158, 11, 0.1)',
          color: theme.palette.warning.main,
          border: `1px solid rgba(245, 158, 11, 0.2)`,
        };
      case 'resolved':
      case 'success':
        return {
          bg: 'rgba(16, 185, 129, 0.1)',
          color: theme.palette.secondary.main,
          border: `1px solid rgba(16, 185, 129, 0.2)`,
        };
      case 'info':
      default:
        return {
          bg: 'rgba(59, 130, 246, 0.1)',
          color: theme.palette.info.main,
          border: `1px solid rgba(59, 130, 246, 0.2)`,
        };
    }
  };

  const colors = getColors();

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor: colors.bg,
        color: colors.color,
        border: colors.border,
        fontWeight: 600,
        fontSize: '0.75rem',
        borderRadius: '4px',
      }}
    />
  );
};
