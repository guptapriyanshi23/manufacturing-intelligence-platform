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
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Step,
  Stepper,
  StepLabel,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Checkbox,
  IconButton,
} from '@mui/material';
import { Save as SaveIcon, AddCircle as AddIcon, Delete as DeleteIcon, ChevronRight as ChevronRightIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { api } from '../../api/client';
import type { HierarchyNode, NodeType } from '../../types/hierarchy';
import { getSeverityColor, getSeverityBgColor, getSeverityLevelFull } from '../../constants/severity';
import { SeverityLevel, AlertStatus } from '../../types/enums';

// ─── Hierarchy constants ────────────────────────────────────────────────────
const LEVELS: NodeType[] = ['enterprise','site','area','line','station','asset','component','sensor'];
const LEVEL_LABELS: Record<NodeType, string> = {
  enterprise: 'Enterprise', site: 'Site / Plant', area: 'Area / Shop / Department',
  line: 'Line / Unit / Cell', station: 'Station / Subsystem', asset: 'Asset / Equipment',
  component: 'Component', sensor: 'Sensor / Tag',
};

const schema = z.object({
  parent_id: z.number().nullable().optional(),
  node_type: z.enum(['enterprise','site','area','line','station','asset','component','sensor']),
  name: z.string().min(2).regex(/^[a-z0-9_]+$/),
  display_name: z.string().min(2),
  description: z.string().optional(),
  sort_order: z.number().default(0),
  plant_metadata: z.object({ use_case: z.string().optional(), location: z.string().optional(), description: z.string().optional() }).optional(),
  asset_metadata: z.object({ asset_id: z.string().optional(), manufacturer: z.string().optional(), model: z.string().optional() }).optional(),
  sensor_metadata: z.object({ sensor_id: z.string().optional(), unit: z.string().optional(), sampling_rate: z.number().optional() }).optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── Alert wizard types ──────────────────────────────────────────────────────
const ALERT_STEPS = ['Description', 'Condition', 'Action'];
const CONDITION_TYPES = ['Basic', 'Advanced'];
const ALERT_TYPES = ['Greater than', 'Less than', 'Greater than or equal', 'Less than or equal', 'Equal to'];
const PENDING_PERIODS = ['None', '1m', '2m', '3m', '4m', '5m'];
const KEEP_FIRING = ['None', '1m', '2m', '3m', '4m', '5m'];

interface AlertForm {
  name: string; description: string; severity: string;
  assetId: string;
  conditionType: string; trigger: string; alertType: string; value: string; delay: string;
  pendingPeriod: string; keepFiring: string; notifyEmail: string;
}

const defaultAlertForm: AlertForm = {
  name: '', description: '', severity: 'warning', assetId: '',
  conditionType: 'Basic', trigger: '', alertType: 'Greater than', value: '', delay: '',
  pendingPeriod: '1m', keepFiring: 'None', notifyEmail: '',
};

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
    module: 'Reports',
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
        <Typography variant="body2" sx={{ fontWeight: depth === 0 ? 600 : 400, whiteSpace: 'nowrap',
          overflow: 'visible', textOverflow: 'clip' }}>
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

  // Alert wizard state
  const [alertStep, setAlertStep] = useState(0);
  const [alertForm, setAlertForm] = useState<AlertForm>(defaultAlertForm);
  const [alertSaved, setAlertSaved] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<number, boolean>>({});
  const [selectedRuleDetails, setSelectedRuleDetails] = useState<any | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);


  const DEMO_RULES = [
    { id: 1, name: 'High Temperature Alert', asset: 'Compressor A', trigger: 'temp_sensor_01', condition: 'Greater than 85°C', severity: 'critical', pendingPeriod: '2m', status: 'Active' },
    { id: 2, name: 'Low Pressure Warning', asset: 'Pump Station B', trigger: 'pressure_sensor_02', condition: 'Less than 2.5 bar', severity: 'warning', pendingPeriod: '1m', status: 'Active' },
    { id: 3, name: 'Vibration Spike', asset: 'Motor Unit C', trigger: 'vibration_sensor_03', condition: 'Greater than 12 mm/s', severity: 'critical', pendingPeriod: '3m', status: 'Inactive' },
    { id: 4, name: 'Flow Rate Drop', asset: 'Line 2 Feed', trigger: 'flow_sensor_04', condition: 'Less than 50 L/min', severity: 'warning', pendingPeriod: 'None', status: 'Active' },
    { id: 5, name: 'Power Consumption High', asset: 'Assembly Station 1', trigger: 'power_meter_01', condition: 'Greater than 200 kW', severity: 'info', pendingPeriod: '5m', status: 'Active' },
  ];
  const [alertRules, setAlertRules] = useState<any[]>(DEMO_RULES);

  // User permissions management state
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userPermissionsOpen, setUserPermissionsOpen] = useState(false);
  const [userPermissionsSelected, setUserPermissionsSelected] = useState<string[]>([]);
  const [userHierarchySelected, setUserHierarchySelected] = useState<number[]>([]);


  const { control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      parent_id: null, node_type: 'site', name: '', display_name: '', description: '', sort_order: 0,
      plant_metadata: { use_case: '', location: '', description: '' },
      asset_metadata: { asset_id: '', manufacturer: '', model: '' },
      sensor_metadata: { sensor_id: '', unit: '', sampling_rate: 1 },
    },
  });
  const nodeType = watch('node_type');

  const loadFlatNodes = () => {
    api.hierarchy.list(true).then(setFlatNodes).catch(() => setFlatNodes([]));
  };

  const loadAlertRules = () => {
    api.alerts.listRules().then(setAlertRules).catch(() => setAlertRules([]));
  };

  useEffect(() => {
    loadFlatNodes();
    loadAlertRules();
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
          sensor_metadata: node.sensor_metadata || { sensor_id: '', unit: '', sampling_rate: 1 },
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
    if (activeTab === 1) {
      loadAlertRules();
    } else if (activeTab === 2) {
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
    reset({ parent_id: null, node_type: 'site', name: '', display_name: '', description: '', sort_order: 0,
      plant_metadata: { use_case: '', location: '', description: '' },
      asset_metadata: { asset_id: '', manufacturer: '', model: '' },
      sensor_metadata: { sensor_id: '', unit: '', sampling_rate: 1 },
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

  // ─── Alert wizard helpers ──────────────────────────────────────────────────
  const af = (field: keyof AlertForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setAlertForm(prev => ({ ...prev, [field]: e.target.value }));


  const getSensorsForAsset = (assetId: string | number): HierarchyNode[] => {
    if (!assetId) return [];
    const targetId = Number(assetId);
    const sensors: HierarchyNode[] = [];
    const queue = [targetId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      flatNodes.filter(n => n.parent_id === currentId).forEach(child => {
        if (child.node_type === 'sensor') {
          sensors.push(child);
        } else {
          queue.push(child.id);
        }
      });
    }
    return sensors;
  };

  const getTreeOrderedNodes = (nodes: HierarchyNode[]): { node: HierarchyNode; depth: number }[] => {
    const result: { node: HierarchyNode; depth: number }[] = [];
    
    // Roots are nodes of type 'site'
    let roots = nodes.filter(n => n.node_type === 'site');
    if (roots.length === 0) {
      roots = nodes.filter(n => !n.parent_id && n.node_type !== 'sensor');
    }
    
    const traverse = (node: HierarchyNode, depth: number) => {
      result.push({ node, depth });
      if (expandedNodeIds[node.id]) {
        const children = nodes.filter(n => n.parent_id === node.id && n.node_type !== 'sensor');
        children.sort((a, b) => a.sort_order - b.sort_order);
        children.forEach(child => traverse(child, depth + 1));
      }
    };
    
    roots.sort((a, b) => a.sort_order - b.sort_order);
    roots.forEach(r => traverse(r, 0));
    return result;
  };

  const toggleNodeExpand = (nodeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodeIds(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleAssetSelect = (assetId: string) => {
    const assetNode = flatNodes.find(n => String(n.id) === assetId);
    const assetName = assetNode ? assetNode.display_name : '';
    setAlertForm(prev => ({
      ...prev,
      assetId,
      name: assetName ? `${assetName} Alert` : '',
      description: assetName ? `Alert rule for monitoring ${assetName}` : '',
    }));
  };

  const handleSensorSelect = (sensorId: string) => {
    const sensorNode = flatNodes.find(n => String(n.id) === sensorId);
    const sensorName = sensorNode ? sensorNode.display_name : '';
    const assetNode = flatNodes.find(n => String(n.id) === alertForm.assetId);
    const assetName = assetNode ? assetNode.display_name : '';
    setAlertForm(prev => ({
      ...prev,
      trigger: sensorId,
      name: assetName && sensorName ? `${assetName} ${sensorName} Alert` : prev.name,
    }));
  };

  const handleAlertSubmit = () => {
    const SEVERITY_LEVEL_MAP_TO_NUM: Record<string, number> = {
      critical: 1,
      high: 2,
      warning: 3,
      low: 4,
      info: 5,
    };

    const payload = {
      name: alertForm.name,
      description: alertForm.description || null,
      severity: (SEVERITY_LEVEL_MAP_TO_NUM[alertForm.severity] || Number(alertForm.severity) || 5) as SeverityLevel,
      node_id: Number(alertForm.assetId),
      condition_type: alertForm.conditionType || null,
      sensor_id: alertForm.trigger || null,
      alert_type: alertForm.alertType || null,
      threshold: alertForm.value ? Number(alertForm.value) : null,
      delay: alertForm.delay ? Number(alertForm.delay) : null,
      pending_period: alertForm.pendingPeriod || null,
      keep_firing: alertForm.keepFiring || null,
      notify_email: alertForm.notifyEmail || null,
      status: AlertStatus.ACTIVE,
    };

    const action = editingRuleId 
      ? api.alerts.updateRule(editingRuleId, payload)
      : api.alerts.createRule(payload);

    action
      .then(() => {
        loadAlertRules();
        setAlertSaved(true);
        setAlertForm(defaultAlertForm);
        setAlertStep(0);
        setEditingRuleId(null);
        setDrawerOpen(false);
      })
      .catch((err) => {
        console.error('Failed to save alert rule:', err);
        alert('Failed to save alert rule: ' + err.message);
      });
  };

  const handleEditRuleClick = (rule: any) => {
    setSelectedRuleDetails(null);
    setEditingRuleId(rule.id);
    setAlertForm({
      name: rule.name,
      description: rule.description || '',
      severity: rule.severity,
      assetId: String(rule.node_id),
      conditionType: rule.condition_type || 'Threshold',
      trigger: rule.sensor_id || '',
      alertType: rule.alert_type || 'Greater than',
      value: rule.value !== null && rule.value !== undefined ? String(rule.value) : '',
      delay: rule.delay !== null && rule.delay !== undefined ? String(rule.delay) : '0',
      pendingPeriod: rule.pending_period || 'None',
      keepFiring: rule.keep_firing || 'Yes',
      notifyEmail: rule.notify_email || '',
    });
    setAlertStep(0);
    setDrawerOpen(true);
  };

  const handleDeleteRuleClick = (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;
    api.alerts.deleteRule(ruleId)
      .then(() => {
        loadAlertRules();
        setSelectedRuleDetails(null);
      })
      .catch((err) => {
        console.error('Failed to delete rule:', err);
        alert('Failed to delete rule: ' + err.message);
      });
  };

  const openDrawer = () => {
    setAlertForm(defaultAlertForm);
    setAlertStep(0);
    setEditingRuleId(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setAlertForm(defaultAlertForm);
    setAlertStep(0);
    setEditingRuleId(null);
    setDrawerOpen(false);
  };

  const renderAlertStep = () => {
    const treeOrderedNodes = getTreeOrderedNodes(flatNodes);
    const assetSensors = getSensorsForAsset(alertForm.assetId);

    switch (alertStep) {
      case 0:
        return (
          <Stack spacing={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Provide a name and description for this alert rule, and select the target asset and severity.
            </Typography>

            <TextField select label="Asset" size="small" fullWidth value={alertForm.assetId}
              onChange={(e) => handleAssetSelect(e.target.value)}
              slotProps={{ select: { renderValue: (val: any) => {
                if (!val) return <em>Select Asset</em>;
                const found = flatNodes.find(n => String(n.id) === val);
                return found ? found.display_name : String(val);
              }} }}
            >
              {treeOrderedNodes.map(({ node, depth }) => {
                const isAsset = node.node_type === 'asset';
                const hasChildren = flatNodes.some(n => n.parent_id === node.id && n.node_type !== 'sensor');
                const isExpanded = !!expandedNodeIds[node.id];

                if (!isAsset) {
                  return (
                    <Box
                      key={node.id}
                      onClick={(e) => toggleNodeExpand(node.id, e)}
                      sx={{
                        pl: depth * 2.5 + 2,
                        pr: 2,
                        py: 0.75,
                        fontWeight: 500,
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {depth > 0 && <Typography component="span" color="text.disabled" sx={{ fontSize: 12, mr: 0.5 }}>└</Typography>}
                        {node.display_name} <Typography component="span" sx={{ fontSize: 11, ml: 0.5, opacity: 0.7 }}>({node.node_type})</Typography>
                      </Box>
                      {hasChildren && (
                        <IconButton
                          size="small"
                          onClick={(e) => toggleNodeExpand(node.id, e)}
                          sx={{ p: 0.25, color: 'text.secondary' }}
                        >
                          {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                        </IconButton>
                      )}
                    </Box>
                  );
                }

                return (
                  <MenuItem 
                    key={node.id} 
                    value={String(node.id)}
                    sx={{
                      pl: depth * 2.5 + 2,
                      fontWeight: 600,
                      color: 'text.primary',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {depth > 0 && <Typography component="span" color="text.disabled" sx={{ fontSize: 12, mr: 0.5 }}>└</Typography>}
                      {node.display_name}
                    </Box>
                  </MenuItem>
                );
              })}
            </TextField>

            <TextField select label="Severity" size="small" fullWidth value={alertForm.severity}
              onChange={(e) => setAlertForm(p => ({ ...p, severity: e.target.value }))}
            >
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
              <MenuItem value="info">Info</MenuItem>
            </TextField>

            <TextField label="Alert Name" size="small" fullWidth value={alertForm.name} onChange={af('name')} />
            <TextField label="Description" size="small" fullWidth multiline rows={3} value={alertForm.description} onChange={af('description')} />
          </Stack>
        );
      case 1:
        return (
          <Stack spacing={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Define the condition that triggers this alert.
            </Typography>
            <TextField select label="Condition Type" size="small" fullWidth value={alertForm.conditionType}
              onChange={(e) => setAlertForm(p => ({ ...p, conditionType: e.target.value }))}
            >
              {CONDITION_TYPES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField select label="Trigger (Sensor / Tag)" size="small" fullWidth value={alertForm.trigger}
              onChange={(e) => handleSensorSelect(e.target.value)}
              disabled={!alertForm.assetId}
            >
              <MenuItem value=""><em>Select Sensor</em></MenuItem>
              {assetSensors.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.display_name}</MenuItem>)}
              {alertForm.assetId && assetSensors.length === 0 && (
                <MenuItem disabled value=""><em>No sensors found under this asset</em></MenuItem>
              )}
            </TextField>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Alert Type" size="small" fullWidth value={alertForm.alertType}
                  onChange={(e) => setAlertForm(p => ({ ...p, alertType: e.target.value }))}
                >
                  {ALERT_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Value" size="small" fullWidth type="number" value={alertForm.value} onChange={af('value')} />
              </Grid>
            </Grid>
            <TextField label="Delay (min)" size="small" sx={{ maxWidth: 200 }} type="number" value={alertForm.delay} onChange={af('delay')} />
          </Stack>
        );
      case 2:
        return (
          <Stack spacing={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Configure evaluation behavior and notification actions.
            </Typography>

            {/* Pending period */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Pending Period</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Period during which the threshold condition must be met to trigger an alert. "None" triggers immediately.
              </Typography>
              <ToggleButtonGroup
                value={alertForm.pendingPeriod}
                exclusive
                onChange={(_, val) => val && setAlertForm(p => ({ ...p, pendingPeriod: val }))}
                size="small"
              >
                {PENDING_PERIODS.map(p => (
                  <ToggleButton key={p} value={p} sx={{ fontWeight: 600, px: 2, textTransform: 'none',
                    '&.Mui-selected': { backgroundColor: 'primary.main', color: 'white', '&:hover': { backgroundColor: 'primary.dark' } }
                  }}>{p}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Divider />

            {/* Keep firing */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Keep Firing For</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Period during which the alert continues firing even after the condition is no longer breached. "None" resets immediately.
              </Typography>
              <ToggleButtonGroup
                value={alertForm.keepFiring}
                exclusive
                onChange={(_, val) => val && setAlertForm(p => ({ ...p, keepFiring: val }))}
                size="small"
              >
                {KEEP_FIRING.map(p => (
                  <ToggleButton key={p} value={p} sx={{ fontWeight: 600, px: 2, textTransform: 'none',
                    '&.Mui-selected': { backgroundColor: 'primary.main', color: 'white', '&:hover': { backgroundColor: 'primary.dark' } }
                  }}>{p}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          </Stack>
        );
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Administration"
        subtitle="Manage hierarchy nodes, configure alert rules and user permissions."
      />

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: '1px solid #ccc' }}>
        <Tab label="Hierarchy" />
        <Tab label="Alert Rule" />
        <Tab label="Permissions" />
      </Tabs>

      {/* ── Tab 0: Hierarchy ── */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {selectedNodeId ? `Edit Node: ${selectedNodeName || selectedNodeId}` : 'Create New Hierarchy Node'}
              </Typography>
              {selectedNodeId && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>Delete Node</Button>
                  <Button variant="outlined" color="primary" startIcon={<AddIcon />} onClick={handleCreateNew}>Add New Node</Button>
                </Box>
              )}
            </Box>
            <Divider sx={{ mb: 3 }} />

            {saveSuccess && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSaveSuccess(false)}>Node saved successfully.</Alert>}
            {deleteSuccess && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setDeleteSuccess(false)}>Node deleted.</Alert>}
            {apiError && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setApiError(null)}>{apiError}</Alert>}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={30} /></Box>
            ) : (
              <form onSubmit={handleSubmit(onSubmit as any)}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller name="node_type" control={control} render={({ field }) => (
                      <TextField {...field} select fullWidth label="Level" size="small" error={!!errors.node_type} helperText={errors.node_type?.message}>
                        {LEVELS.filter(l => l !== 'enterprise').map(l => <MenuItem key={l} value={l}>{LEVEL_LABELS[l]}</MenuItem>)}
                      </TextField>
                    )} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller name="sort_order" control={control} render={({ field }) => (
                      <TextField {...field} type="number" fullWidth label="Sort Order" size="small"
                        value={field.value} onChange={(e) => field.onChange(Number(e.target.value))}
                        error={!!errors.sort_order} helperText={errors.sort_order?.message} />
                    )} />
                  </Grid>

                  {renderParentDropdowns()}

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller name="name" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth label="Name (snake_case)" size="small" error={!!errors.name} helperText={errors.name?.message} />
                    )} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 12 }}>
                    <Controller name="display_name" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth label="Display Name" size="small" error={!!errors.display_name} helperText={errors.display_name?.message} />
                    )} />
                  </Grid>
                  <Grid size={12}>
                    <Controller name="description" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth multiline rows={2} label="Description" size="small" />
                    )} />
                  </Grid>
                  <Grid size={12}>
                    <Button type="submit" variant="contained" color="primary" startIcon={<SaveIcon />}>
                      Save Node Configuration
                    </Button>
                  </Grid>
                </Grid>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab 1: Alert Rules Table ── */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Alert Rules</Typography>
              <Button variant="outlined" color="primary" startIcon={<AddIcon />} onClick={openDrawer}>
                Create Rule
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {alertSaved && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAlertSaved(false)}>
                Alert rule saved successfully.
              </Alert>
            )}

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, backgroundColor: 'grey.50' } }}>
                    <TableCell>#</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Asset</TableCell>
                    <TableCell>Trigger</TableCell>
                    <TableCell>Condition</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Pending</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alertRules.map(rule => {
                    const assetNode = flatNodes.find(n => n.id === rule.node_id);
                    const sensorNode = flatNodes.find(n => String(n.id) === rule.sensor_id);
                    const assetName = assetNode ? assetNode.display_name : (rule.asset || `Asset #${rule.node_id}`);
                    const triggerName = sensorNode ? sensorNode.display_name : (rule.trigger || rule.sensor_id || 'None');
                    const conditionText = rule.alert_type && rule.value !== null && rule.value !== undefined
                      ? `${rule.alert_type} ${rule.value}`
                      : (rule.condition || 'None');
                    const pendingText = rule.pending_period || rule.pendingPeriod || 'None';

                    return (
                      <TableRow 
                        key={rule.id} 
                        hover 
                        onClick={() => setSelectedRuleDetails(rule)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{rule.id}</TableCell>
                        <TableCell>{rule.name}</TableCell>
                        <TableCell>{assetName}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{triggerName}</TableCell>
                        <TableCell>{conditionText}</TableCell>
                        <TableCell>
                          <Chip label={getSeverityLevelFull(rule.severity).toUpperCase()} size="small"
                            sx={{ backgroundColor: getSeverityBgColor(rule.severity), color: getSeverityColor(rule.severity), fontWeight: 600, fontSize: 11, borderRadius: '4px' }}
                          />
                        </TableCell>
                        <TableCell>{pendingText}</TableCell>
                        <TableCell>
                          <Chip label={rule.status} size="small"
                            sx={{ backgroundColor: rule.status === 'Active' ? '#e8f5e9' : '#f5f5f5', color: rule.status === 'Active' ? '#2e7d32' : '#757575', fontWeight: 600, fontSize: 11, borderRadius: '4px' }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Create Rule Dialog ── */}
      <Dialog open={drawerOpen} onClose={closeDrawer} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { border: '1px solid #ccc', borderRadius: 2 } } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', pb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Create Alert Rule</Typography>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Stepper activeStep={alertStep} sx={{ my: 3, '& .MuiStepConnector-line': { borderColor: 'secondary.main' } }}>
            {ALERT_STEPS.map((label, index) => (
              <Step key={label} completed={index < alertStep}>
                <StepLabel
                  // StepIconProps={{
                  //   sx: {
                  //     '&.Mui-completed': { color: 'secondary.main' },
                  //     '&.Mui-active': { color: 'secondary.main' },
                  //   }
                  // } as StepIconProps}
                >{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Box sx={{ minHeight: 280 }}>
            {renderAlertStep()}
          </Box>
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2 }}>
          {alertStep > 0 && (
            <Button variant="outlined" color="secondary" onClick={() => setAlertStep(s => s - 1)}>Previous</Button>
          )}
          <Button variant="outlined" color="inherit" onClick={closeDrawer}>Cancel</Button>
          {alertStep < ALERT_STEPS.length - 1 ? (
            <Button variant="contained" color="secondary" onClick={() => setAlertStep(s => s + 1)}>Next</Button>
          ) : (
            <Button variant="contained" color="primary" onClick={handleAlertSubmit}>Save Rule</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Tab 2: Users & Permissions ── */}
      {activeTab === 2 && (
        <Card sx={{ border: '1px solid #ccc' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, }}>
              Manage User Permissions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select a user to review and update their access permissions.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, backgroundColor: 'grey.50' } }}>
                    <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Email Address</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Active Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Assigned Permissions</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.id}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          color={user.is_active ? 'success' : 'default'}
                        />
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
                      <TableCell align="right">
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
            </TableContainer>
          </CardContent>
        </Card>
      )}

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

      {/* Alert Rule Details Dialog */}
      <Dialog open={!!selectedRuleDetails} onClose={() => setSelectedRuleDetails(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', pb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Alert Rule Details</Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedRuleDetails && (() => {
            const assetNode = flatNodes.find(n => n.id === selectedRuleDetails.node_id);
            const sensorNode = flatNodes.find(n => String(n.id) === selectedRuleDetails.sensor_id);
            const assetName = assetNode ? assetNode.display_name : (selectedRuleDetails.asset || `Asset #${selectedRuleDetails.node_id}`);
            const triggerName = sensorNode ? sensorNode.display_name : (selectedRuleDetails.trigger || selectedRuleDetails.sensor_id || 'None');
            
            return (
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Rule Name</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedRuleDetails.name}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Description</Typography>
                  <Typography variant="body2">{selectedRuleDetails.description || 'No description provided'}</Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Target Asset</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{assetName}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Trigger Sensor</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{triggerName}</Typography>
                  </Grid>
                  
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Condition Type</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedRuleDetails.condition_type || 'Threshold'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Condition Value</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {selectedRuleDetails.alert_type} {selectedRuleDetails.value}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Severity</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip label={getSeverityLevelFull(selectedRuleDetails.severity).toUpperCase()} size="small"
                        sx={{ backgroundColor: getSeverityBgColor(selectedRuleDetails.severity), color: getSeverityColor(selectedRuleDetails.severity), fontWeight: 600, fontSize: 11, borderRadius: '4px' }}
                      />
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Pending Period</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {selectedRuleDetails.pending_period || selectedRuleDetails.pendingPeriod || 'None'}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip label={selectedRuleDetails.status} size="small"
                        sx={{ backgroundColor: selectedRuleDetails.status === 'Active' ? '#e8f5e9' : '#f5f5f5', color: selectedRuleDetails.status === 'Active' ? '#2e7d32' : '#757575', fontWeight: 600, fontSize: 11 }}
                      />
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>Notification Email</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {selectedRuleDetails.notify_email || 'None'}
                    </Typography>
                  </Grid>
                </Grid>
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="error"
              onClick={() => handleDeleteRuleClick(selectedRuleDetails.id)}
            >
              Delete
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => handleEditRuleClick(selectedRuleDetails)}
            >
              Edit
            </Button>
          </Box>
          <Button variant="outlined" onClick={() => setSelectedRuleDetails(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default Admin;
