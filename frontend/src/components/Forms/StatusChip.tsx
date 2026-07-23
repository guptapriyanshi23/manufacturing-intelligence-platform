import React from 'react';
import { Chip } from '@mui/material';
import { getStatusColor, getStatusBgColor, getStatusText } from '../../constants/status';

interface StatusChipProps {
  status: string | number;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status }) => (
  <Chip
    label={getStatusText(status)}
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
