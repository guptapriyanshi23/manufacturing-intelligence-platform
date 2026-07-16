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
  IconButton,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import { api } from '../api/client';
import {
  Dashboard as DashboardIcon,
  Warning as AlertsIcon,
  Troubleshoot as RootCauseIcon,
  Lightbulb as AdvisoriesIcon,
  Assessment as ReportsIcon,
  Settings as AdminIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

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
    
    // Sync node selection to pages via state instead of query string to keep URLs clean!
    navigate(location.pathname, { state: { ...location.state, selectedNodeId: node.id } });
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryNodeId = location.state?.selectedNodeId || (searchParams.get('selectedNodeId') ? Number(searchParams.get('selectedNodeId')) : null);
    if (nodes.length > 0 && queryNodeId && (!selectedNode || selectedNode.id !== queryNodeId)) {
      const findNodeInTree = (list: HierarchyNode[], id: number): HierarchyNode | null => {
        for (const n of list) {
          if (n.id === id) return n;
          if (n.children && n.children.length > 0) {
            const found = findNodeInTree(n.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      let node = findNodeInTree(nodes, queryNodeId);
      if (node) {
        const getParent = (childId: number): HierarchyNode | null => {
          const findParent = (list: HierarchyNode[]): HierarchyNode | null => {
            for (const n of list) {
              if (n.children && n.children.some(c => c.id === childId)) return n;
              if (n.children && n.children.length > 0) {
                const p = findParent(n.children);
                if (p) return p;
              }
            }
            return null;
          };
          return findParent(nodes);
        };

        while (node && (node.node_type === 'sensor' || node.node_type === 'component')) {
          const parent = getParent(node.id);
          if (!parent) break;
          node = parent;
        }

        if (node) {
          setSelectedNode(node);
          if (node.id !== queryNodeId) {
            navigate(location.pathname, { state: { ...location.state, selectedNodeId: node.id, originalSensorNodeId: queryNodeId }, replace: true });
          }
        }
      }
    }
  }, [nodes, location.search, location.state, selectedNode, navigate, location.pathname]);

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
                  navigate(item.path, { state: { selectedNodeId: selectedNode?.id } });
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
              <Box sx={{ display: 'flex', alignItems: 'center', borderLeft: '1px solid #e0e0e0', pl: 2 }}>
                <IconButton
                  onClick={handleProfileClick}
                  size="small"
                  sx={{ color: 'text.secondary' }}
                  aria-controls={openMenu ? 'profile-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={openMenu ? 'true' : undefined}
                >
                  <AccountCircleIcon fontSize="large" />
                </IconButton>
                <Menu
                  id="profile-menu"
                  anchorEl={anchorEl}
                  open={openMenu}
                  onClose={handleProfileClose}
                  onClick={handleProfileClose}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  slotProps={{
                    paper: {
                      elevation: 3,
                      sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
                        mt: 1.5,
                        minWidth: 220,
                        border: '1px solid #ccc',
                      },
                    }
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block' }}>
                      Logged in as
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', wordBreak: 'break-all', mt: 0.5 }}>
                      {profile.email}
                    </Typography>
                  </Box>
                  <Divider />
                  
                  {profile.permissions.includes('admin:view') && (
                    <MenuItem
                      onClick={() => {
                        handleProfileClose();
                        navigate('/admin?tab=permissions');
                      }}
                      sx={{ py: 1 }}
                    >
                      <ListItemIcon>
                        <AdminIcon fontSize="small" />
                      </ListItemIcon>
                      <Typography variant="body2">Permissions</Typography>
                    </MenuItem>
                  )}
                  
                  <MenuItem
                    onClick={() => {
                      handleProfileClose();
                      handleLogout();
                    }}
                    sx={{ color: 'error.main', py: 1 }}
                  >
                    <ListItemIcon sx={{ color: 'error.main' }}>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Logout</Typography>
                  </MenuItem>
                </Menu>
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
        <Outlet context={{ selectedNodeId: selectedNode?.id }} />
      </Box>
    </Box>
  );
};

export default MainLayout;
