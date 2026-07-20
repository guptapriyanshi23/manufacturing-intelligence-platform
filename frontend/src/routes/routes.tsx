import React, { useEffect, useState } from 'react';
import { createBrowserRouter, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../pages/Dashboard/Dashboard';
import Alerts from '../pages/Alerts/Alerts';
import RootCause from '../pages/RootCause/RootCause';
import Advisories from '../pages/Advisories/Advisories';
import Reports from '../pages/Reports/Reports';
import Admin from '../pages/Admin/Admin';
import Login from '../pages/Login/Login';
import { api } from '../api/client';

// ProtectedRoute checks authentication and permission level
const ProtectedRoute: React.FC<{ requiredPermission?: string }> = ({ requiredPermission }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }

    setAuthenticated(true);

    const cachedProfile = localStorage.getItem('user_profile');
    if (cachedProfile) {
      try {
        const profile = JSON.parse(cachedProfile);
        if (!requiredPermission || profile.permissions.includes(requiredPermission)) {
          setHasPermission(true);
        } else {
          setHasPermission(false);
        }
        setLoading(false);
        return;
      } catch (e) {
        // Fallback
      }
    }

    api.auth.getMe()
      .then((profile) => {
        localStorage.setItem('user_profile', JSON.stringify(profile));
        if (!requiredPermission || profile.permissions.includes(requiredPermission)) {
          setHasPermission(true);
        } else {
          setHasPermission(false);
        }
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_profile');
        setAuthenticated(false);
        setLoading(false);
      });
  }, [requiredPermission]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const handleBack = () => {
    const cachedProfile = localStorage.getItem('user_profile');
    if (cachedProfile) {
      try {
        const profile = JSON.parse(cachedProfile);
        if (profile.permissions.includes('dashboard:view')) {
          navigate('/dashboard');
          return;
        } else if (profile.permissions.includes('alerts:view')) {
          navigate('/');
          return;
        }
      } catch {}
    }
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 2 }}>
      <Typography variant="h4" color="error" sx={{ fontWeight: 700 }}>Access Denied</Typography>
      <Typography variant="body1">You do not have the required permissions to view this page.</Typography>
      <Button variant="contained" onClick={handleBack}>Go to Allowed Tab</Button>
    </Box>
  );
};


export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />, // Outer auth guard
    children: [
      {
        path: '',
        element: <MainLayout />, // Navigation Shell
        children: [
          {
            element: <ProtectedRoute requiredPermission="alerts:view" />,
            children: [{ path: '', element: <Alerts /> }],
          },
          {
            element: <ProtectedRoute requiredPermission="dashboard:view" />,
            children: [{ path: 'dashboard', element: <Dashboard /> }],
          },
          {
            element: <ProtectedRoute requiredPermission="advisories:rca" />,
            children: [{ path: 'root-cause', element: <RootCause /> }],
          },
          {
            element: <ProtectedRoute requiredPermission="advisories:view" />,
            children: [{ path: 'advisories', element: <Advisories /> }],
          },
          {
            element: <ProtectedRoute requiredPermission="reports:view" />,
            children: [{ path: 'analytics', element: <Reports /> }],
          },
          {
            element: <ProtectedRoute requiredPermission="admin:view" />,
            children: [{ path: 'admin', element: <Admin /> }],
          },
        ],
      },
    ],
  },
]);

export default router;
