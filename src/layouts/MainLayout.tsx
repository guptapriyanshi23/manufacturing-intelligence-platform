import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  CircularProgress,
  Tooltip,
  Button
} from '@mui/material';
import { api } from '../api/client';
import {
  Dashboard as DashboardIcon,
  Warning as AlertsIcon,
  Troubleshoot as RootCauseIcon,
  Lightbulb as AdvisoriesIcon,
  Assessment as ReportsIcon,
  Settings as AdminIcon,
  AccountCircle as AccountCircleIcon
} from '@mui/icons-material';
import { TreeView } from '../components/Tree/TreeView';
import type { HierarchyNode } from '../types/hierarchy';

const drawerWidth = 280;

const navItems = [
  { path: '/', label: 'Alerts', icon: <AlertsIcon />, permission: 'alerts:view' },
  { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, permission: 'dashboard:view' },
  { path: '/root-cause', label: 'Root Cause', icon: <RootCauseIcon />, permission: 'advisories:rca' },
  { path: '/advisories', label: 'Advisories', icon: <AdvisoriesIcon />, permission: 'advisories:view' },
  { path: '/reports', label: 'Reports', icon: <ReportsIcon />, permission: 'reports:view' },
  { path: '/admin', label: 'Admin', icon: <AdminIcon />, permission: 'admin:view' },
];

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [nodes, setNodes] = useState<HierarchyNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [profile, setProfile] = useState<{ email: string; permissions: string[] } | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('user_profile');
    if (cached) {
      try {
        setProfile(JSON.parse(cached));
      } catch (e) {}
    } else {
      api.auth.getMe()
        .then((res) => {
          setProfile(res);
          localStorage.setItem('user_profile', JSON.stringify(res));
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_profile');
          navigate('/login');
        });
    }
  }, [navigate]);

  const fetchNodes = () => {
    setLoadingNodes(true);
    api.hierarchy.list()
      .then((res) => {
        setNodes(res);
        setLoadingNodes(false);
      })
      .catch(() => {
        setNodes([]);
        setLoadingNodes(false);
      });
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const handleSelectNode = (node: HierarchyNode) => {
    setSelectedNode(node);
    
    // Sync node selection to dashboard via query params
    if (location.pathname === '/dashboard') {
      navigate(`/dashboard?selectedNodeId=${node.id}&selectedNodeName=${encodeURIComponent(node.display_name)}`);
    } else if (location.pathname === '/admin') {
      navigate(`/admin?selectedNodeId=${node.id}&selectedNodeName=${encodeURIComponent(node.display_name)}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_profile');
    navigate('/login');
  };

  const allowedNavItems = navItems.filter((item) =>
    profile ? profile.permissions.includes(item.permission) : false
  );

  const showHierarchy = profile && (
    profile.permissions.includes('dashboard:view') ||
    profile.permissions.includes('alerts:view') ||
    profile.permissions.includes('advisories:rca') ||
    profile.permissions.includes('advisories:view') ||
    profile.permissions.includes('admin:view')
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top Header */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, border: '1px solid #ccc' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box component="img" src="/deloitte_logo_black.svg" alt="Deloitte Logo" 
              sx={{ height: 20, width: 'auto',}} />
            <Box sx={{ borderLeft: '1px solid #e0e0e0', pl: 2 }}>
              <Typography variant="h4" color="text.primary" sx={{ fontWeight: 500, letterSpacing: '0.5px' }}>
              AssetWize
            </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Tabs switcher */}
            <List sx={{ px: 1, display: 'flex' }}>
              {allowedNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                const handleNavClick = () => {
                  if (item.path === '/dashboard') {
                    navigate(`${item.path}${location.search}`);
                  } else {
                    navigate(item.path);
                  }
                };
                return (
                  <ListItemButton
                    key={item.path}
                    onClick={handleNavClick}
                    selected={isActive}
                    sx={{
                      borderRadius: 1,
                      color: isActive ? 'primary.main' : 'secondary.light',
                      justifyContent: 'center',
                      '&.Mui-selected': {
                        color: 'primary.main',
                        fontWeight: 600,
                      },
                    }}
                  >
                    <Tooltip title={item.label} placement="bottom" arrow>
                      <ListItemIcon sx={{ color: 'inherit', minWidth: 0 }}>{item.icon}</ListItemIcon>
                    </Tooltip>
                  </ListItemButton>
                );
              })}
            </List>

            {/* Profile Info and Logout */}
            {profile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1,  borderLeft: '1px solid #e0e0e0', pl: 2 }}>
                <AccountCircleIcon fontSize="medium" sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {profile.email}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={handleLogout}
                  sx={{ ml: 2, textTransform: 'none', py: 0.5 }}
                >
                  Logout
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Navigation */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {showHierarchy && (
            <>
              {/* Hierarchy section */}
              <Box sx={{ px: 2, my: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                  Plant Hierarchy (ISA-95)
                </Typography>
              </Box>
              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  pl: 0,
                  pr: 0,
                  '&::-webkit-scrollbar': {
                    width: '4px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#bdbdbd',
                    borderRadius: '0px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: '#9e9e9e',
                  },
                }}
              >
                {loadingNodes ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <TreeView
                    nodes={nodes}
                    onSelectNode={handleSelectNode}
                    selectedNodeId={selectedNode?.id}
                  />
                )}
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, pt: 10 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
