import React from 'react';
import { Chip } from '@mui/material';
import { getStatusColor, getStatusBgColor } from '../../constants/status';

interface StatusChipProps {
  label: string | number;
  status: string | number;
}

export const StatusChip: React.FC<StatusChipProps> = ({ label, status }) => {
  console.log('status', status);
  console.log(label);

  return (
  <Chip
    label={label}
    size="small"
    sx={{
      backgroundColor: getStatusBgColor(status),
      color: getStatusColor(status),
      border: `1px solid ${getStatusColor(status)}33`,
      fontWeight: 600,
      fontSize: '0.85rem',
      borderRadius: '4px',
    }}
  />
);
}
