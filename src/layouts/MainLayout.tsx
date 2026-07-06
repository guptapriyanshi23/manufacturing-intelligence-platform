import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
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
  const activeTabIndex = navItems.findIndex((item) => item.path === location.pathname);
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
      {/* Top Header & Navigation */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: 'rgba(12, 15, 29, 0.88)' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
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
        <Box sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', px: 2, py: 0.5, display: 'flex', justifyContent: 'center' }}>
          <Tabs
            value={activeTabIndex >= 0 ? activeTabIndex : false}
            onChange={(_, newIndex) => {
              const item = navItems[newIndex];
              if (item) navigate(item.path);
            }}
            textColor="inherit"
            TabIndicatorProps={{ style: { height: 4, borderRadius: 4, backgroundColor: '#06b6d4' } }}
            aria-label="main navigation tabs"
            sx={{
              minHeight: 48,
              '& .MuiTabs-flexContainer': {
                justifyContent: 'center',
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 48,
                minWidth: 120,
                px: 2,
              },
            }}
          >
            {navItems.map((item) => (
              <Tab key={item.path} label={item.label} icon={item.icon} iconPosition="start" />
            ))}
          </Tabs>
        </Box>
      </AppBar>

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

      <Box component="main" sx={{ flexGrow: 1, p: 3, pt: 14 }}>
        <Outlet />
      </Box>
    </Box>
  );
};
export default MainLayout;
