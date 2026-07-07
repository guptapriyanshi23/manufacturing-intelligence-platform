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
} from '@mui/material';
import { Save as SaveIcon, AddCircle as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { StepIconProps } from '@mui/material/StepIcon';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { api } from '../../api/client';
import type { HierarchyNode, NodeType } from '../../types/hierarchy';
import { severityOptions, getSeverityColor, getSeverityBgColor } from '../../constants/severity';

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

// ─── Component ───────────────────────────────────────────────────────────────
export const Admin: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedNodeId = searchParams.get('selectedNodeId');
  const selectedNodeName = searchParams.get('selectedNodeName');
  const [activeTab, setActiveTab] = useState(0);
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

  const DEMO_RULES = [
    { id: 1, name: 'High Temperature Alert', asset: 'Compressor A', trigger: 'temp_sensor_01', condition: 'Greater than 85°C', severity: 'critical', pendingPeriod: '2m', status: 'Active' },
    { id: 2, name: 'Low Pressure Warning', asset: 'Pump Station B', trigger: 'pressure_sensor_02', condition: 'Less than 2.5 bar', severity: 'warning', pendingPeriod: '1m', status: 'Active' },
    { id: 3, name: 'Vibration Spike', asset: 'Motor Unit C', trigger: 'vibration_sensor_03', condition: 'Greater than 12 mm/s', severity: 'critical', pendingPeriod: '3m', status: 'Inactive' },
    { id: 4, name: 'Flow Rate Drop', asset: 'Line 2 Feed', trigger: 'flow_sensor_04', condition: 'Less than 50 L/min', severity: 'warning', pendingPeriod: 'None', status: 'Active' },
    { id: 5, name: 'Power Consumption High', asset: 'Assembly Station 1', trigger: 'power_meter_01', condition: 'Greater than 200 kW', severity: 'info', pendingPeriod: '5m', status: 'Active' },
  ];

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

  useEffect(() => { loadFlatNodes(); }, [saveSuccess, deleteSuccess]);

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

  const sensorOptions = flatNodes.filter(n => n.node_type === 'sensor');
  const assetNodes = flatNodes.filter(n => n.node_type !== 'sensor');

  const getAssetDepth = (node: HierarchyNode): number => {
    let depth = 0; let cur = node;
    while (cur.parent_id) {
      const p = flatNodes.find(n => n.id === cur.parent_id);
      if (!p) break; depth++; cur = p;
    }
    return depth;
  };

  const handleAlertSubmit = () => {
    console.log('Alert rule saved:', alertForm);
    setAlertSaved(true);
    setAlertForm(defaultAlertForm);
    setAlertStep(0);
    setDrawerOpen(false);
  };

  const openDrawer = () => { setAlertForm(defaultAlertForm); setAlertStep(0); setDrawerOpen(true); };
  const closeDrawer = () => { setAlertForm(defaultAlertForm); setAlertStep(0); setDrawerOpen(false); };

  const renderAlertStep = () => {
    switch (alertStep) {
      case 0:
        return (
          <Stack spacing={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Provide a name and description for this alert rule, and select the target asset and severity.
            </Typography>
            <TextField label="Alert Name" size="small" fullWidth value={alertForm.name} onChange={af('name')} />
            <TextField label="Description" size="small" fullWidth multiline rows={3} value={alertForm.description} onChange={af('description')} />
            <TextField select label="Asset" size="small" fullWidth value={alertForm.assetId}
              onChange={(e) => setAlertForm(p => ({ ...p, assetId: e.target.value }))}
              slotProps={{ select: { renderValue: (val: any) => {
                if (!val) return <em>Select Asset</em>;
                const found = flatNodes.find(n => String(n.id) === val);
                return found ? found.display_name : String(val);
              }} }}
            >
              <MenuItem value=""><em>Select Asset</em></MenuItem>
              {assetNodes.sort((a,b) => a.sort_order - b.sort_order).map(n => (
                <MenuItem key={n.id} value={String(n.id)}>
                  <Box sx={{ pl: getAssetDepth(n) * 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getAssetDepth(n) > 0 && <Typography component="span" color="text.disabled" sx={{ fontSize: 12 }}>└</Typography>}
                    {n.display_name}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
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
              onChange={(e) => setAlertForm(p => ({ ...p, trigger: e.target.value }))}
            >
              <MenuItem value=""><em>Select Sensor</em></MenuItem>
              {sensorOptions.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.display_name}</MenuItem>)}
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
        subtitle="Manage hierarchy nodes and configure alert rules."
      />

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: '1px solid #ccc' }}>
        <Tab label="Hierarchy" />
        <Tab label="Alert Rule" />
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
                  {DEMO_RULES.map(rule => (
                    <TableRow key={rule.id} hover>
                      <TableCell>{rule.id}</TableCell>
                      <TableCell>{rule.name}</TableCell>
                      <TableCell>{rule.asset}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{rule.trigger}</TableCell>
                      <TableCell>{rule.condition}</TableCell>
                      <TableCell>
                        <Chip label={rule.severity.toUpperCase()} size="small"
                          sx={{ backgroundColor: getSeverityBgColor(rule.severity), color: getSeverityColor(rule.severity), fontWeight: 600, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell>{rule.pendingPeriod}</TableCell>
                      <TableCell>
                        <Chip label={rule.status} size="small"
                          sx={{ backgroundColor: rule.status === 'Active' ? '#e8f5e9' : '#f5f5f5', color: rule.status === 'Active' ? '#2e7d32' : '#757575', fontWeight: 600, fontSize: 11 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Create Rule Dialog ── */}
      <Dialog open={drawerOpen} onClose={closeDrawer} maxWidth="sm" fullWidth
        PaperProps={{ sx: { border: '1px solid #ccc', borderRadius: 2 } }}
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
    </PageContainer>
  );
};

export default Admin;
