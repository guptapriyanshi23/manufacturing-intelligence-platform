import React from 'react';
import { Card, CardContent, Typography, Box, Divider, Grid } from '@mui/material';

interface InfoItem {
  label: string;
  value: React.ReactNode;
}

interface InfoCardProps {
  title: string;
  subtitle?: string;
  items: InfoItem[];
  action?: React.ReactNode;
}

export const InfoCard: React.FC<InfoCardProps> = ({ title, subtitle, items, action }) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action && <Box>{action}</Box>}
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          {items.map((item, index) => (
            <Grid size={{ xs: 12, sm: 6 }} key={index}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {item.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {item.value || 'N/A'}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};
