import React from 'react';
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';

interface MetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  unit?: string;
  trend?: number;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, subValue, unit, trend, icon }) => {
  const theme = useTheme();
  const isPositive = trend ? trend >= 0 : true;

  return (
    <Card
      sx={{
        height: '100%',
        minWidth: 200,
        position: 'relative',
        overflow: 'hidden',
        background: theme.palette.background.paper,
        borderColor: '#ccc',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          backgroundColor: trend ? (isPositive ? theme.palette.secondary.main : theme.palette.error.main) : theme.palette.primary.main,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {icon && <Box sx={{ opacity: 0.8, color: theme.palette.primary.main }}>{icon}</Box>}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography variant="h2" component="div" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
          {subValue && (
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 400 }}>
              {subValue}
            </Typography>
          )}
          {unit && (
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
              {unit}
            </Typography>
          )}
        </Box>

        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            {isPositive ? (
              <ArrowUpward fontSize="small" sx={{ color: theme.palette.secondary.main, mr: 0.5 }} />
            ) : (
              <ArrowDownward fontSize="small" sx={{ color: theme.palette.error.main, mr: 0.5 }} />
            )}
            <Typography
              variant="body2"
              sx={{ color: isPositive ? theme.palette.secondary.main : theme.palette.error.main, fontWeight: 600 }}
            >
              {Math.abs(trend)}%
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              vs last week
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
