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
  Tooltip
} from '@mui/material';
import { api } from '../api/client';
import {
  Dashboard as DashboardIcon,
  Warning as AlertsIcon,
  Troubleshoot as RootCauseIcon,
  Lightbulb as AdvisoriesIcon,
  Assessment as ReportsIcon,
  Settings as AdminIcon
} from '@mui/icons-material';
import { TreeView } from '../components/Tree/TreeView';
import type { HierarchyNode } from '../types/hierarchy';

const drawerWidth = 280;

const navItems = [
  { path: '/', label: 'Alerts', icon: <AlertsIcon /> },
  { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/root-cause', label: 'Root Cause', icon: <RootCauseIcon /> },
  { path: '/advisories', label: 'Advisories', icon: <AdvisoriesIcon /> },
  { path: '/reports', label: 'Reports', icon: <ReportsIcon /> },
  { path: '/admin', label: 'Admin', icon: <AdminIcon /> },
];

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [nodes, setNodes] = useState<HierarchyNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(true);

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
  }, []); // Run only once on mount

  const handleSelectNode = (node: HierarchyNode) => {
    setSelectedNode(node);
    if (location.pathname === '/admin') {
      navigate(`/admin?selectedNodeId=${node.id}&selectedNodeName=${encodeURIComponent(node.display_name)}`);
    } else {
      navigate(`/dashboard?selectedNodeId=${node.id}`);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top Header */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, border: '1px solid #ccc' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box component="img" src="/deloitte_logo_black.svg" alt="Deloitte Logo" sx={{ height: 20, width: 'auto' }} />
              <Typography variant="h4" sx={{ color: '#ccc', fontWeight: 100 }}>
                |
              </Typography>
              <Typography variant="h4" color="text.primary" sx={{ fontWeight: 500, letterSpacing: '0.5px' }}>
                AssetWize
              </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', }}>
            <List sx={{ px: 1, display: 'flex', }}>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const handleNavClick = () => {
                  // Preserve query params for Dashboard navigation
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

                    <Tooltip title={item.label} placement="bottom" arrow >
                      <ListItemIcon sx={{ color: 'inherit', minWidth: 0 }}>{item.icon}</ListItemIcon>
                    </Tooltip>
                  </ListItemButton>
                );
              })}
            </List>
            {/* <IconButton color="inherit" size="small">
              <RefreshIcon fontSize="small" />
            </IconButton> */}
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
        <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%', }}>
          {/* Main Navigation links */}
          {/* <List sx={{ px: 1 }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const handleNavClick = () => {
                // Preserve query params for Dashboard navigation
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
                    mb: 0.5,
                    color: isActive ? 'primary.main' : 'text.secondary',
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(6, 182, 212, 0.08)',
                      color: 'primary.main',
                      fontWeight: 600,
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={<Typography sx={{ fontWeight: isActive ? 600 : 400 }}>{item.label}</Typography>} />
                </ListItemButton>
              );
            })}
          </List> */}

          {/* <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.05)' }} /> */}

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
              pr: 0, // No right padding so scrollbar is flush against the edge
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#bdbdbd', // thin gray line
                borderRadius: '0px', // rectangular scrollbar
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
