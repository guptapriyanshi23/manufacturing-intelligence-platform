import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  Typography,
  CircularProgress,
} from '@mui/material';
import { api } from '../api/client';
import { TreeView } from '../components/Tree/TreeView';
import type { HierarchyNode } from '../types/hierarchy';
import Header from '../components/Header';

const drawerWidth = 280;

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
      } catch (e) { }
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
    const { alertId, originalSensorNodeId, ...restState } = location.state || {};
    navigate(location.pathname, { state: { ...restState, selectedNodeId: node.id } });
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

  const showHierarchy = profile && (
    profile.permissions.includes('dashboard:view') ||
    profile.permissions.includes('alerts:view') ||
    profile.permissions.includes('advisories:rca') ||
    profile.permissions.includes('advisories:view') ||
    profile.permissions.includes('admin:view')
  );

  return (
    <>
    <Header />
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
    
      {/* Sidebar Navigation */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, border: '1px solid #e2e8f0' },
          zIndex: 1
        }}
      >
        <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%',
          background: '#fff', paddingTop: '3.5rem', border: '1px solid #e2e8f0'
         }}>
          {showHierarchy && (
            <>
              {/* Hierarchy section */}
              <Box sx={{ px: 2, py: 1,  borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700,
                  color: 'var(--color-ternary) !important'
                 }}>
                  Plant Hierarchy
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
    </>
  );
};

export default MainLayout;
