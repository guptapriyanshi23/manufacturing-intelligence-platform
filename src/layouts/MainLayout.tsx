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
  ListItemText,
  Divider,
  Chip,
  IconButton,
  CircularProgress
} from '@mui/material';
import { api } from '../api/client';
import {
  Dashboard as DashboardIcon,
  Warning as AlertsIcon,
  Troubleshoot as RootCauseIcon,
  Lightbulb as AdvisoriesIcon,
  Assessment as ReportsIcon,
  Settings as AdminIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { TreeView } from '../components/Tree/TreeView';
import type { HierarchyNode } from '../types/hierarchy';

const drawerWidth = 280;

const navItems = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/alerts', label: 'Alerts', icon: <AlertsIcon /> },
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
    navigate(`/admin?selectedNodeId=${node.id}`);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top Header */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" color="primary" sx={{ letterSpacing: '0.5px', fontWeight: 700 }}>
              SM
            </Typography>
            <Typography variant="h6" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 500 }}>
              Smart Manufacturing
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* <Chip
              label="System status: Healthy"
              color="success"
              size="small"
              sx={{ fontWeight: 600 }}
            /> */}
            <IconButton color="inherit" size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
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
        <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%', py: 2 }}>
          {/* Main Navigation links */}
          <List sx={{ px: 1 }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItemButton
                  key={item.path}
                  onClick={() => navigate(item.path)}
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
          </List>

          <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.05)' }} />

          {/* Hierarchy section */}
          <Box sx={{ px: 2, mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
              Plant Hierarchy (ISA-95)
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1 }}>
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
