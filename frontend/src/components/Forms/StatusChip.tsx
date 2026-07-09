import React from 'react';
import { Chip } from '@mui/material';
import { getStatusColor, getStatusBgColor } from '../../constants/status';

interface StatusChipProps {
  label: string;
  status: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ label, status }) => (
  <Chip
    label={label}
    size="small"
    sx={{
      backgroundColor: getStatusBgColor(status),
      color: getStatusColor(status),
      border: `1px solid ${getStatusColor(status)}33`,
      fontWeight: 600,
      fontSize: '0.75rem',
      borderRadius: '4px',
    }}
  />
);
