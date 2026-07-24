import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Checkbox,
} from '@mui/material';
import { Save as SaveIcon, AddCircle as AddIcon, Delete as DeleteIcon, } from '@mui/icons-material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { api } from '../../api/client';
import type { HierarchyNode, NodeType } from '../../types/hierarchy';
import { NodeType as NodeTypeEnum } from '../../types/enums';
import './Admin.scss'

// ─── Hierarchy constants ────────────────────────────────────────────────────
const LEVELS: NodeType[] = [
  NodeTypeEnum.SITE,
  NodeTypeEnum.AREA,
  NodeTypeEnum.LINE,
  NodeTypeEnum.ASSET,
  NodeTypeEnum.SENSOR,
];
const LEVEL_LABELS: Record<NodeType, string> = {
  [NodeTypeEnum.ENTERPRISE]: 'Enterprise',
  [NodeTypeEnum.SITE]: 'Site',
  [NodeTypeEnum.AREA]: 'Area',
  [NodeTypeEnum.LINE]: 'Line',
  [NodeTypeEnum.STATION]: 'Station',
  [NodeTypeEnum.ASSET]: 'Asset',
  [NodeTypeEnum.COMPONENT]: 'Component',
  [NodeTypeEnum.SENSOR]: 'Sensor',
};

interface SeverityThreshold {
  severity: number;
  label: string;
  minDeviation: number;
  maxDeviation: number | null;
}

const SEVERITY_THRESHOLDS: SeverityThreshold[] = [
  { severity: 1, label: 'Critical', minDeviation: 60, maxDeviation: null },
  { severity: 2, label: 'High', minDeviation: 35, maxDeviation: 60 },
  { severity: 3, label: 'Medium', minDeviation: 20, maxDeviation: 35 },
  { severity: 4, label: 'Low', minDeviation: 10, maxDeviation: 20 },
  { severity: 5, label: 'Informational', minDeviation: 3, maxDeviation: 10 },
];

const schema = z.object({
  parent_id: z.number().nullable().optional(),
  node_type: z.enum([NodeTypeEnum.SITE, NodeTypeEnum.AREA, NodeTypeEnum.LINE, NodeTypeEnum.ASSET, NodeTypeEnum.SENSOR]),
  name: z.string().min(2).regex(/^[a-z0-9_]+$/),
  display_name: z.string().min(2),
  description: z.string().optional(),
  sort_order: z.number().default(0),
  plant_metadata: z.object({ use_case: z.string().optional(), location: z.string().optional(), description: z.string().optional() }).optional(),
  asset_metadata: z.object({ asset_id: z.string().optional(), manufacturer: z.string().optional(), model: z.string().optional() }).optional(),
  sensor_metadata: z.object({ sensor_id: z.string().optional(), unit: z.string().optional(), sampling_rate: z.number().optional(), alarm_limit: z.number().default(0), trip_limit: z.number().default(0), }).optional(),
});
type FormValues = z.infer<typeof schema>;

const permissionGroups = [
  {
    module: 'Alerts',
    actions: [
      { name: 'View', value: 'alerts:view', description: 'Access the Alerts page' }
    ]
  },
  {
    module: 'Dashboard',
    actions: [
      { name: 'View', value: 'dashboard:view', description: 'Access the Dashboard summary & charts' }
    ]
  },
  {
    module: 'Advisories',
    actions: [
      { name: 'View', value: 'advisories:view', description: 'Access the Advisories page' },
      { name: 'Acknowledge', value: 'advisories:acknowledge', description: 'Acknowledge active advisories' },
      { name: 'RCA / Resolve', value: 'advisories:rca', description: 'Upload evidence and resolve advisories' }
    ]
  },
  {
    module: 'Aanalytics',
    actions: [
      { name: 'View', value: 'reports:view', description: 'Access report generation page' }
    ]
  },
  {
    module: 'Administration',
    actions: [
      { name: 'View', value: 'admin:view', description: 'Access settings and permission console' }
    ]
  }
];

const buildTreeFromFlat = (nodes: any[]) => {
  const nodeMap: Record<number, any> = {};
  nodes.forEach(n => {
    nodeMap[n.id] = { ...n, children: [] };
  });

  const roots: any[] = [];
  nodes.forEach(n => {
    const mapped = nodeMap[n.id];
    if (n.parent_id === null || !nodeMap[n.parent_id]) {
      roots.push(mapped);
    } else {
      if (nodeMap[n.parent_id]) {
        nodeMap[n.parent_id].children.push(mapped);
      } else {
        roots.push(mapped);
      }
    }
  });

  roots.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  Object.values(nodeMap).forEach((mapped: any) => {
    mapped.children.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
  });

  return roots;
};

const HierarchyCheckItem: React.FC<{
  node: any;
  depth: number;
  selected: number[];
  onChange: (id: number, checked: boolean) => void;
}> = ({ node, depth, selected, onChange }) => {
  const isChecked = selected.includes(node.id);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <Box sx={{ pl: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', py: 0.25 }}>
        <Checkbox
          checked={isChecked}
          onChange={(e) => onChange(node.id, e.target.checked)}
          size="small"
          color="success"
          sx={{ p: 0.5 }}
        />
        <Typography variant="body2" sx={{
          fontWeight: depth === 0 ? 600 : 400, whiteSpace: 'nowrap',
          overflow: 'visible', textOverflow: 'clip'
        }}>
          {node.display_name} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({node.node_type})</span>
        </Typography>
      </Box>
      {hasChildren && node.children.map((child: any) => (
        <HierarchyCheckItem
          key={child.id}
          node={child}
          depth={depth + 1}
          selected={selected}
          onChange={onChange}
        />
      ))}
    </Box>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────
export const Admin: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedNodeId = searchParams.get('selectedNodeId');
  const selectedNodeName = searchParams.get('selectedNodeName');
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'permissions' ? 2 : (tabParam === 'alerts' ? 1 : 0);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'permissions') {
      setActiveTab(2);
    } else if (tab === 'alerts') {
      setActiveTab(1);
    } else if (tab === 'hierarchy') {
      setActiveTab(0);
    }
  }, [searchParams]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);
  const [parentSelections, setParentSelections] = useState<Record<string, number | ''>>({});

  // User permissions management state
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userPermissionsOpen, setUserPermissionsOpen] = useState(false);
  const [userPermissionsSelected, setUserPermissionsSelected] = useState<string[]>([]);
  const [userHierarchySelected, setUserHierarchySelected] = useState<number[]>([]);


  const { control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      parent_id: null, node_type: NodeTypeEnum.SITE, name: '', display_name: '', description: '', sort_order: 0,
      plant_metadata: { use_case: '', location: '', description: '' },
      asset_metadata: { asset_id: '', manufacturer: '', model: '' },
      sensor_metadata: { sensor_id: '', unit: '', sampling_rate: 1, alarm_limit: 0, trip_limit: 0 },
    },
  });
  const nodeType = watch('node_type');

  const loadFlatNodes = () => {
    api.hierarchy.list(true).then(setFlatNodes).catch(() => setFlatNodes([]));
  };

  useEffect(() => {
    loadFlatNodes();
  }, [saveSuccess, deleteSuccess]);

  useEffect(() => {
    if (selectedNodeId && flatNodes.length > 0) {
      setLoading(true);
      api.hierarchy.get(Number(selectedNodeId)).then((node) => {
        reset({
          parent_id: node.parent_id || null, node_type: node.node_type,
          name: node.name, display_name: node.display_name, description: node.description || '',
          sort_order: node.sort_order,
          plant_metadata: node.plant_metadata || { use_case: '', location: '', description: '' },
          asset_metadata: node.asset_metadata || { asset_id: '', manufacturer: '', model: '' },
          sensor_metadata: node.sensor_metadata || { sensor_id: '', unit: '', sampling_rate: 1, alarm_limit: 0, trip_limit: 0 },
        });
        const initialSelections: Record<string, number | ''> = {};
        LEVELS.forEach(lvl => { initialSelections[lvl] = ''; });
        if (node.parent_id) {
          let currentId: number | undefined = node.parent_id;
          while (currentId) {
            const matched = flatNodes.find(n => n.id === currentId);
            if (matched) { initialSelections[matched.node_type] = matched.id; currentId = matched.parent_id; }
            else break;
          }
        }
        setParentSelections(initialSelections);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [selectedNodeId, flatNodes, reset]);

  useEffect(() => {
    const levelIndex = LEVELS.indexOf(nodeType);
    if (levelIndex === 0) { setValue('parent_id', null); }
    else {
      const parentLevel = LEVELS[levelIndex - 1];
      const sel = parentSelections[parentLevel];
      setValue('parent_id', sel ? Number(sel) : null);
    }
  }, [nodeType, parentSelections, setValue]);

  const handleParentSelect = (level: NodeType, id: number | '') => {
    const levelIndex = LEVELS.indexOf(level);
    const updated = { ...parentSelections, [level]: id };
    for (let i = levelIndex + 1; i < LEVELS.length; i++) updated[LEVELS[i]] = '';
    setParentSelections(updated);
    setValue('parent_id', id ? Number(id) : null);
  };

  const loadUsersAndPermissions = () => {
    api.admin.listUsers()
      .then(setUsers)
      .catch((e) => console.error("Failed to load admin users:", e));
    api.hierarchy.list(true)
      .then(setFlatNodes)
      .catch((e) => console.error("Failed to load hierarchy nodes:", e));
  };

  useEffect(() => {
    if (activeTab === 2) {
      loadUsersAndPermissions();
    }
  }, [activeTab]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true); setSaveSuccess(false); setApiError(null);
    try {
      if (selectedNodeId) await api.hierarchy.update(Number(selectedNodeId), data as any);
      else await api.hierarchy.create(data as any);
      setSaveSuccess(true);
    } catch (err: any) { setApiError(err.message || 'Failed to save'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedNodeId) return;
    if (!confirm('Delete this node and all children?')) return;
    setLoading(true); setApiError(null);
    try {
      await api.hierarchy.delete(Number(selectedNodeId));
      setDeleteSuccess(true); handleCreateNew();
    } catch (err: any) { setApiError(err.message || 'Failed to delete'); }
    finally { setLoading(false); }
  };

  const handleCreateNew = () => {
    setSearchParams({});
    reset({
      parent_id: null, node_type: NodeTypeEnum.SITE, name: '', display_name: '', description: '', sort_order: 0,
      plant_metadata: { use_case: '', location: '', description: '' },
      asset_metadata: { asset_id: '', manufacturer: '', model: '' },
      sensor_metadata: { sensor_id: '', unit: '', sampling_rate: 1, alarm_limit: 0, trip_limit: 0, },
    });
    setParentSelections({}); setSaveSuccess(false); setDeleteSuccess(false); setApiError(null);
  };

  const renderParentDropdowns = () => {
    const levelIndex = LEVELS.indexOf(nodeType);
    if (levelIndex <= 0) return null;
    return LEVELS.slice(0, levelIndex).map((lvl, index) => {
      const prevLvl = index > 0 ? LEVELS[index - 1] : null;
      const options = index === 0
        ? flatNodes.filter(n => n.node_type === lvl)
        : flatNodes.filter(n => n.node_type === lvl && n.parent_id === parentSelections[prevLvl!]);
      const disabled = index > 0 && !parentSelections[LEVELS[index - 1]];
      return (
        <Grid size={{ xs: 12, sm: 6 }} key={lvl}>
          <TextField select fullWidth label={LEVEL_LABELS[lvl]} size="small" disabled={disabled}
            value={parentSelections[lvl] || ''}
            onChange={(e) => handleParentSelect(lvl, e.target.value ? Number(e.target.value) : '')}
          >
            <MenuItem value="">-- Select Parent --</MenuItem>
            {options.map(o => <MenuItem key={o.id} value={o.id}>{o.display_name}</MenuItem>)}
          </TextField>
        </Grid>
      );
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Asset Hierarchy & Severity Thresholds"
        url="/admin"
        subtitle='Defines the hierarchy and severity thresholds every operator screen relies on'
      />

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} className="admin-page__tabs">
        <Tab label="Asset Hierarchy" />
        <Tab label="Severity Thresholds" />
        <Tab label="Permissions" />
      </Tabs>

      <Card className="admin-card admin-card--form">
        {/* ── Tab 0: Hierarchy ── */}
        {activeTab === 0 && (
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box>
                <Typography className="admin-card__title">
                  {selectedNodeId ? `Edit: ${selectedNodeName || selectedNodeId}` : 'Create New Hierarchy'}
                </Typography>
                {!selectedNodeId &&
                  <div className="chart-subtitle">Onboard new equipment into the hierarchy structure</div>
                }
              </Box>
              {selectedNodeId && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>Delete Node</Button>
                  <Button variant="outlined" color="primary" startIcon={<AddIcon />} onClick={handleCreateNew}>Add New Node</Button>
                </Box>
              )}
            </Box>

            {saveSuccess && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setSaveSuccess(false)}>Node saved successfully.</Alert>}
            {deleteSuccess && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setDeleteSuccess(false)}>Node deleted.</Alert>}
            {apiError && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setApiError(null)}>{apiError}</Alert>}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={30} /></Box>
            ) : (
              <form onSubmit={handleSubmit(onSubmit as any)} >

                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>

                  <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column', gap: 2 }}>

                    <Controller name="node_type" control={control} render={({ field }) => (
                      <TextField {...field} select fullWidth label="Level" size="small" error={!!errors.node_type} helperText={errors.node_type?.message}>
                        {LEVELS.map(l => <MenuItem key={l} value={l}>{LEVEL_LABELS[l]}</MenuItem>)}
                      </TextField>
                    )} />

                    {/* <Controller name="sort_order" control={control} render={({ field }) => (
                      <TextField {...field} type="number" fullWidth label="Sort Order" size="small"
                        value={field.value} onChange={(e) => field.onChange(Number(e.target.value))}
                        error={!!errors.sort_order} helperText={errors.sort_order?.message} />
                    )} /> */}

                    {nodeType === NodeTypeEnum.SENSOR && (
                      <>
                        <Controller name="name" control={control} render={({ field }) => (
                          <TextField {...field} fullWidth label="Tag Name" size="small" error={!!errors.name} helperText={errors.name?.message} />
                        )} />
                      </>
                    )}

                    <Controller name="display_name" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth label="Name" size="small" error={!!errors.display_name} helperText={errors.display_name?.message} />
                    )} />

                    <Controller name="description" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth multiline rows={2} label="Description" size="small" />
                    )} />

                    {nodeType === NodeTypeEnum.SENSOR && (<>
                      <Controller name="sensor_metadata.alarm_limit" control={control} render={({ field }) => (
                        <TextField {...field} type="number" fullWidth label="Alarm Limit" size="small"
                          slotProps={{ htmlInput: { step: 'any' } }}
                          value={field.value} onChange={(e) => field.onChange(Number(e.target.value))}
                        // error={!!errors.sensor_metadata.alarm_limit} helperText={errors.sensor_metadata.alarm_limit?.message} 
                        />
                      )} />

                      <Controller name="sensor_metadata.trip_limit" control={control} render={({ field }) => (
                        <TextField {...field} type="number" fullWidth label="Trip Limit" size="small"
                          slotProps={{ htmlInput: { step: 'any' } }}
                          value={field.value} onChange={(e) => field.onChange(Number(e.target.value))}
                        // error={!!errors.sensor_metadata.trip_limit} helperText={errors.sensor_metadata.trip_limit?.message} 
                        />
                      )} />

                    </>)}

                  </Box>

                  <Box sx={{
                    width: '50%', minHeight: '45vh', display: 'flex', flexDirection: 'column', gap: 2,
                    borderLeft: '1px solid #e0e0e0', pl: 2, textAlign: 'center'
                  }}>
                    {nodeType === NodeTypeEnum?.SITE ?
                      <Typography className="chart-subtitle">
                        Site is a top-level node. No parent selection is required.</Typography>
                      : <>
                        {renderParentDropdowns()}
                      </>}
                  </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Button type="submit" variant="contained" color="primary" startIcon={<SaveIcon />}>
                    Save Configuration
                  </Button>
                </Box>
              </form>
            )}
          </CardContent>
        )}

        {/* ── Tab 1: Alert Rules Table ── */}
        {activeTab === 1 && (
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box>
                <Typography className="admin-card__title">
                  Severity Thresholds
                </Typography>
                <div className="chart-subtitle">Severity one is the highest priority, 5 is the lowest - defined on deviation between twin (reference) and actual value.</div>

              </Box>
            </Box>

            <Box className="admin-table-wrap">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Severity</TableCell>
                    <TableCell>Label</TableCell>
                    <TableCell>Min Deviation %</TableCell>
                    <TableCell>Max Deviation %</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {SEVERITY_THRESHOLDS.map((row) => (
                    <TableRow key={row.severity}>
                      <TableCell>
                        <span className={`severity-badge severity-s${row.severity}`}>S{row.severity}</span>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <span className={`severity-s${row.severity}`}>{row.label}</span>
                      </TableCell>
                      <TableCell >{row.minDeviation}</TableCell>
                      <TableCell >{row.maxDeviation !== null ? `${row.maxDeviation}` : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        )}

        {/* ── Tab 2: Users & Permissions ── */}
        {activeTab === 2 && (
          <CardContent>
            <Box sx={{ mb: 1 }}>
              <Typography className="admin-card__title">
                Manage User Permissions
              </Typography>
              <div className="chart-subtitle">Select a user to review and update their access permissions.</div>
            </Box>

            <Box className="admin-table-wrap">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Email Address</TableCell>
                    <TableCell>Active Status</TableCell>
                    <TableCell>Assigned Permissions</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell >{user.id}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{user.email}</TableCell>
                      <TableCell className={`${user.is_active ? 'active-user-cell' : 'inactive-user-cell'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {user.permissions.map((p: string) => (
                            <Chip key={p} label={p} size="small" variant="outlined" />
                          ))}
                          {user.permissions.length === 0 && (
                            <Typography variant="caption" color="text.secondary">None</Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setSelectedUser(user);
                            setUserPermissionsSelected(user.permissions);
                            setUserHierarchySelected([]);
                            api.admin.getUserHierarchy(user.id)
                              .then(setUserHierarchySelected)
                              .catch(err => console.error("Failed to load user hierarchy:", err));
                            setUserPermissionsOpen(true);
                          }}
                        >
                          Edit Permissions
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        )}
      </Card>

      {/* Edit Permissions Dialog */}
      <Dialog open={userPermissionsOpen} onClose={() => setUserPermissionsOpen(false)} fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', px: 3, py: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Edit Permissions</Typography>
          <Typography variant="body2" color="text.secondary">
            User: {selectedUser?.email}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3, }}>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {permissionGroups.map((group) => (
              <Box key={group.module} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2, }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'secondary.main', mb: 1.5 }}>
                  {group.module}
                </Typography>
                <Stack spacing={1.5}>
                  {group.actions.map((act) => {
                    const isChecked = userPermissionsSelected.includes(act.value);
                    const handleToggle = () => {
                      if (isChecked) {
                        setUserPermissionsSelected(userPermissionsSelected.filter(p => p !== act.value));
                      } else {
                        setUserPermissionsSelected([...userPermissionsSelected, act.value]);
                      }
                    };
                    return (
                      <Box
                        key={act.value}
                        onClick={handleToggle}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1.25,
                          border: isChecked ? '1px solid #1b7a1b' : '1px solid #e2e8f0',
                          borderRadius: 1,
                          cursor: 'pointer',
                          bgcolor: isChecked ? 'rgba(27, 122, 27, 0.04)' : '#ffffff',
                          '&:hover': {
                            bgcolor: isChecked ? 'rgba(27, 122, 27, 0.08)' : 'rgba(27, 122, 27, 0.04)',
                          }
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {act.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {act.description}
                          </Typography>
                        </Box>
                        <Checkbox
                          checked={isChecked}
                          onChange={handleToggle}
                          size="small"
                          color="success"
                          sx={{ p: 0.5 }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            ))}

            {/* Plant Hierarchy Access Control Box */}
            <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 2, }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'secondary.main', mb: 1 }}>
                Hierarchy Access Control
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Authorize sub-tree roots by checking nodes. Assumed full tree access if none is checked.
              </Typography>
              <Box sx={{ border: '1px solid #ccc', borderRadius: 1, p: 1.5, maxHeight: 250, overflowY: 'auto' }}>
                {buildTreeFromFlat(flatNodes).map((node) => (
                  <HierarchyCheckItem
                    key={node.id}
                    node={node}
                    depth={0}
                    selected={userHierarchySelected}
                    onChange={(id, checked) => {
                      if (checked) {
                        setUserHierarchySelected([...userHierarchySelected, id]);
                      } else {
                        setUserHierarchySelected(userHierarchySelected.filter(x => x !== id));
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2 }}>
          <Button variant="outlined" color="secondary" onClick={() => setUserPermissionsOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={async () => {
              if (selectedUser) {
                try {
                  await api.admin.updatePermissions(selectedUser.id, userPermissionsSelected);
                  await api.admin.updateUserHierarchy(selectedUser.id, userHierarchySelected);
                  setUserPermissionsOpen(false);
                  loadUsersAndPermissions();
                } catch (err) {
                  console.error("Failed to update user permissions:", err);
                }
              }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default Admin;
