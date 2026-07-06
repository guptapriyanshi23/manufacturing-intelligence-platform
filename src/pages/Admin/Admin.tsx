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
  CircularProgress
} from '@mui/material';
import { Save as SaveIcon, AddCircle as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { api } from '../../api/client';
import type { HierarchyNode, NodeType } from '../../types/hierarchy';

// All 8 levels of hierarchy in order
const LEVELS: NodeType[] = [
  'enterprise',
  'site',
  'area',
  'line',
  'station',
  'asset',
  'component',
  'sensor'
];

const LEVEL_LABELS: Record<NodeType, string> = {
  enterprise: 'Enterprise',
  site: 'Site / Plant',
  area: 'Area / Shop / Department',
  line: 'Line / Unit / Cell',
  station: 'Station / Subsystem',
  asset: 'Asset / Equipment',
  component: 'Component',
  sensor: 'Sensor / Tag'
};

// Form validation schema
const schema = z.object({
  parent_id: z.number().nullable().optional(),
  node_type: z.enum(['enterprise', 'site', 'area', 'line', 'station', 'asset', 'component', 'sensor']),
  name: z.string().min(2, 'Name must be at least 2 characters').regex(/^[a-z0-9_]+$/, 'Must be snake_case (lowercase, numbers, underscores only)'),
  display_name: z.string().min(2, 'Display name must be at least 2 characters'),
  description: z.string().optional(),
  sort_order: z.number().default(0),
  // Metadata schemas
  plant_metadata: z.object({
    use_case: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
  asset_metadata: z.object({
    asset_id: z.string().optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
  }).optional(),
  sensor_metadata: z.object({
    sensor_id: z.string().optional(),
    unit: z.string().optional(),
    sampling_rate: z.number().optional(),
  }).optional(),
}).refine((data) => {
  if (data.node_type === 'asset' && !data.asset_metadata?.asset_id) {
    return false;
  }
  if (data.node_type === 'sensor' && !data.sensor_metadata?.sensor_id) {
    return false;
  }
  return true;
}, {
  message: "Metadata values are required for the selected node type.",
  path: ["node_type"]
});

type FormValues = z.infer<typeof schema>;

export const Admin: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedNodeId = searchParams.get('selectedNodeId');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Flat list of nodes from backend
  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);

  // Dynamic parent selections state
  const [parentSelections, setParentSelections] = useState<Record<string, number | ''>>({});

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      parent_id: null,
      node_type: 'site',
      name: '',
      display_name: '',
      description: '',
      sort_order: 0,
      plant_metadata: { use_case: '', location: '', description: '' },
      asset_metadata: { asset_id: '', manufacturer: '', model: '' },
      sensor_metadata: { sensor_id: '', unit: '', sampling_rate: 1 },
    }
  });

  const nodeType = watch('node_type');

  const loadFlatNodes = () => {
    api.hierarchy.list(true)
      .then((res) => setFlatNodes(res))
      .catch(() => setFlatNodes([]));
  };

  useEffect(() => {
    loadFlatNodes();
  }, [saveSuccess, deleteSuccess]);

  // Trace and populate cascade parent path on node select
  useEffect(() => {
    if (selectedNodeId && flatNodes.length > 0) {
      setLoading(true);
      api.hierarchy.get(Number(selectedNodeId))
        .then((node) => {
          reset({
            parent_id: node.parent_id || null,
            node_type: node.node_type,
            name: node.name,
            display_name: node.display_name,
            description: node.description || '',
            sort_order: node.sort_order,
            plant_metadata: node.plant_metadata || { use_case: '', location: '', description: '' },
            asset_metadata: node.asset_metadata || { asset_id: '', manufacturer: '', model: '' },
            sensor_metadata: node.sensor_metadata || { sensor_id: '', unit: '', sampling_rate: 1 },
          });

          // Reset all parent selections
          const initialSelections: Record<string, number | ''> = {};
          LEVELS.forEach(lvl => {
            initialSelections[lvl] = '';
          });

          // Walk up hierarchy to populate dropdowns
          if (node.parent_id) {
            let currentId: number | undefined = node.parent_id;
            while (currentId) {
              const matchedNode = flatNodes.find(n => n.id === currentId);
              if (matchedNode) {
                initialSelections[matchedNode.node_type] = matchedNode.id;
                currentId = matchedNode.parent_id;
              } else {
                break;
              }
            }
          }
          setParentSelections(initialSelections);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [selectedNodeId, flatNodes, reset]);

  // Handle parent changes dynamically
  const handleParentSelect = (level: NodeType, id: number | '') => {
    const levelIndex = LEVELS.indexOf(level);
    const updatedSelections = { ...parentSelections };

    // Set selection for target level
    updatedSelections[level] = id;

    // Reset all sub-levels selections
    for (let i = levelIndex + 1; i < LEVELS.length; i++) {
      updatedSelections[LEVELS[i]] = '';
    }

    setParentSelections(updatedSelections);

    // parent_id will be set to the lowest chosen parent ID in the chain
    if (id === '') {
      // Find parent of this level
      if (levelIndex > 0) {
        const prevLevel = LEVELS[levelIndex - 1];
        setValue('parent_id', updatedSelections[prevLevel] ? Number(updatedSelections[prevLevel]) : null);
      } else {
        setValue('parent_id', null);
      }
    } else {
      setValue('parent_id', Number(id));
    }
  };

  // Sync parent_id to form on node_type change
  useEffect(() => {
    const levelIndex = LEVELS.indexOf(nodeType);
    if (levelIndex === 0) {
      setValue('parent_id', null);
    } else {
      const parentLevel = LEVELS[levelIndex - 1];
      const selectedParentId = parentSelections[parentLevel];
      setValue('parent_id', selectedParentId ? Number(selectedParentId) : null);
    }
  }, [nodeType, parentSelections, setValue]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setSaveSuccess(false);
    setApiError(null);
    try {
      if (selectedNodeId) {
        await api.hierarchy.update(Number(selectedNodeId), data as any);
      } else {
        await api.hierarchy.create(data as any);
      }
      setSaveSuccess(true);
    } catch (err: any) {
      setApiError(err.message || 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNodeId) return;
    if (!confirm('Are you sure you want to delete this hierarchy node? All nested children and metadata will be permanently deleted.')) return;

    setLoading(true);
    setDeleteSuccess(false);
    setApiError(null);
    try {
      await api.hierarchy.delete(Number(selectedNodeId));
      setDeleteSuccess(true);
      handleCreateNew();
    } catch (err: any) {
      setApiError(err.message || 'Failed to delete node');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSearchParams({});
    reset({
      parent_id: null,
      node_type: 'site',
      name: '',
      display_name: '',
      description: '',
      sort_order: 0,
      plant_metadata: { use_case: '', location: '', description: '' },
      asset_metadata: { asset_id: '', manufacturer: '', model: '' },
      sensor_metadata: { sensor_id: '', unit: '', sampling_rate: 1 },
    });
    setParentSelections({});
    setSaveSuccess(false);
    setDeleteSuccess(false);
    setApiError(null);
  };

  // Render cascade parent dropdowns up to the selected level - 1
  const renderParentDropdowns = () => {
    const levelIndex = LEVELS.indexOf(nodeType);
    if (levelIndex <= 0) return null; // Enterprise has no parents

    const activeParentLevels = LEVELS.slice(0, levelIndex);

    return (
      <Box sx={{ p: 2, border: '1px solid rgba(255,255,255,0.05)', borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.01)', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}>
          Select Hierarchy Parent Path
        </Typography>
        <Grid container spacing={2}>
          {activeParentLevels.map((lvl, index) => {
            // Options are filtered by the selected parent of the previous level (if index > 0)
            let options = [];
            if (index === 0) {
              options = flatNodes.filter(n => n.node_type === lvl);
            } else {
              const prevLvl = activeParentLevels[index - 1];
              const prevSelectedId = parentSelections[prevLvl];
              options = flatNodes.filter(n => n.node_type === lvl && n.parent_id === prevSelectedId);
            }

            const isDropdownDisabled = index > 0 && !parentSelections[activeParentLevels[index - 1]];

            return (
              <Grid size={{ xs: 12, sm: activeParentLevels.length > 2 ? 4 : 6 }} key={lvl}>
                <TextField
                  select
                  fullWidth
                  label={LEVEL_LABELS[lvl]}
                  size="small"
                  disabled={isDropdownDisabled}
                  value={parentSelections[lvl] || ''}
                  onChange={(e) => handleParentSelect(lvl, e.target.value ? Number(e.target.value) : '')}
                >
                  <MenuItem value="">-- Select Parent --</MenuItem>
                  {options.map(o => (
                    <MenuItem key={o.id} value={o.id}>{o.display_name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Asset Administration"
        subtitle="Manage the ISA-95 hierarchical nodes and metadata parameters."
        actions={
          selectedNodeId ? (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>
                Delete Node
              </Button>
              <Button variant="outlined" color="primary" startIcon={<AddIcon />} onClick={handleCreateNew}>
                Add New Node
              </Button>
            </Box>
          ) : null
        }
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {selectedNodeId ? `Edit Node (ID: ${selectedNodeId})` : 'Create New Hierarchy Node'}
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {saveSuccess && (
                <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSaveSuccess(false)}>
                  Node configuration successfully saved.
                </Alert>
              )}

              {deleteSuccess && (
                <Alert severity="success" sx={{ mb: 3 }} onClose={() => setDeleteSuccess(false)}>
                  Node successfully deleted.
                </Alert>
              )}

              {apiError && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setApiError(null)}>
                  {apiError}
                </Alert>
              )}

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress size={30} />
                </Box>
              ) : (
                <form onSubmit={handleSubmit(onSubmit as any)}>
                  <Grid container spacing={2}>

                    {/* Level Selector */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Controller
                        name="node_type"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            select
                            fullWidth
                            label="Level"
                            size="small"
                            error={!!errors.node_type}
                            helperText={errors.node_type?.message}
                          >
                            {LEVELS.filter(lvl => lvl !== 'enterprise').map(lvl => (
                              <MenuItem key={lvl} value={lvl}>{LEVEL_LABELS[lvl]}</MenuItem>
                            ))}
                          </TextField>
                        )}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Controller
                        name="sort_order"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="number"
                            fullWidth
                            label="Sort Order"
                            size="small"
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            error={!!errors.sort_order}
                            helperText={errors.sort_order?.message}
                          />
                        )}
                      />
                    </Grid>

                    {/* Cascade Parent Dropdowns */}
                    {renderParentDropdowns()}

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="System Name (snake_case)"
                            size="small"
                            error={!!errors.name}
                            helperText={errors.name?.message}
                          />
                        )}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Controller
                        name="display_name"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Display Name"
                            size="small"
                            error={!!errors.display_name}
                            helperText={errors.display_name?.message}
                          />
                        )}
                      />
                    </Grid>

                    <Grid size={12}>
                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            multiline
                            rows={2}
                            label="Description"
                            size="small"
                            error={!!errors.description}
                            helperText={errors.description?.message}
                          />
                        )}
                      />
                    </Grid>

                    {/* Metadata Sub-forms */}
                    {nodeType === 'site' && (
                      <Grid size={12}>
                        <Box sx={{ mt: 2, p: 2, border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 1 }}>
                          <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 600 }}>
                            Site Specific Parameters
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Controller
                                name="plant_metadata.use_case"
                                control={control}
                                render={({ field }) => <TextField {...field} fullWidth size="small" label="Operations Use Case" />}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Controller
                                name="plant_metadata.location"
                                control={control}
                                render={({ field }) => <TextField {...field} fullWidth size="small" label="Geographical Location" />}
                              />
                            </Grid>
                            <Grid size={12}>
                              <Controller
                                name="plant_metadata.description"
                                control={control}
                                render={({ field }) => <TextField {...field} fullWidth size="small" multiline rows={2} label="Facility Description" />}
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      </Grid>
                    )}

                    {nodeType === 'asset' && (
                      <Grid size={12}>
                        <Box sx={{ mt: 2, p: 2, border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 1 }}>
                          <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 600 }}>
                            Asset Specific Parameters
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Controller
                                name="asset_metadata.asset_id"
                                control={control}
                                render={({ field }) => <TextField {...field} required fullWidth size="small" label="Unique Asset ID" />}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Controller
                                name="asset_metadata.manufacturer"
                                control={control}
                                render={({ field }) => <TextField {...field} fullWidth size="small" label="OEM Manufacturer" />}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Controller
                                name="asset_metadata.model"
                                control={control}
                                render={({ field }) => <TextField {...field} fullWidth size="small" label="Model Specification" />}
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      </Grid>
                    )}

                    {nodeType === 'sensor' && (
                      <Grid size={12}>
                        <Box sx={{ mt: 2, p: 2, border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 1 }}>
                          <Typography variant="subtitle2" color="primary" sx={{ mb: 2, fontWeight: 600 }}>
                            Sensor Specific Parameters
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Controller
                                name="sensor_metadata.sensor_id"
                                control={control}
                                render={({ field }) => <TextField {...field} required fullWidth size="small" label="Unique Sensor ID" />}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Controller
                                name="sensor_metadata.unit"
                                control={control}
                                render={({ field }) => <TextField {...field} fullWidth size="small" label="Measurement Unit" />}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <Controller
                                name="sensor_metadata.sampling_rate"
                                control={control}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    type="number"
                                    fullWidth
                                    size="small"
                                    label="Sampling Rate (Hz)"
                                    value={field.value || ''}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                )}
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      </Grid>
                    )}

                    <Grid size={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button type="submit" variant="contained" color="primary" startIcon={<SaveIcon />}>
                        Save Node Configuration
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Admin Operations
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select a level to configure. The system will dynamically show dropdowns up to the selected level - 1, letting you choose the exact hierarchical parent path for your new node.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
};
export default Admin;
