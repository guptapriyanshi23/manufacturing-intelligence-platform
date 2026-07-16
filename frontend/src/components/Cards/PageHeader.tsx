import React from 'react';
import { Box } from '@mui/material';
import { BarChart } from '@mui/icons-material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

interface PageHeaderProps {
  title: string;
  url?: string;
  subtitle?: string;
  // actions?: React.ReactNode;
}

const BellIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="#0076A8"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>
);

const ReportIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="#0076A8"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
);


export const PageHeader: React.FC<PageHeaderProps> = ({ title, url = '', subtitle }) => {
  console.log(url);
  const getIcon = () => {
    if (url.includes('/admin')) {
      return <AdminPanelSettingsIcon sx={{ color: '#0076A8', fontSize: 22 }} />;
    }

    if (url.includes('/reports') || url.includes('/dashboard')) {
      return <BarChart sx={{ color: '#0076A8' }} />;
    }

    if (url === '/') {
      return <BellIcon />;
    }
    
    if (url.includes('/advisories')) {
      return <ReportIcon />;
    }

    return <BarChart sx={{ color: '#0076A8' }} />;
  };

  return (
    <Box sx={{pb: 2}}>
    <Box className="page-title">
      {getIcon()}
      <h1>{title}</h1>
    </Box>
      {subtitle && <Box className="chart-subtitle" sx={{pl: 2}}>{subtitle}</Box>}
    </Box>
  );
};