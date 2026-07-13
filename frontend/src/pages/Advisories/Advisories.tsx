import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { StatusChip } from '../../components/Forms/StatusChip';
import { api } from '../../api/client';
import { getSeverityColor, getSeverityBgColor, severityOptions } from '../../constants/severity';
import { statusOptions } from '../../constants/status';
import type { HierarchyNode } from '../../types/hierarchy';
import { HierarchySelector } from '../../components/Filters/HierarchySelector';

export const Advisories: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState<number | ''>('');

  const sites = useMemo(() => {
    return flatNodes.filter(n => n.node_type === 'site');
  }, [flatNodes]);

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const qSiteId = queryParams.get('siteId') ? Number(queryParams.get('siteId')) : '';
  const qNodeId = queryParams.get('nodeId') ? Number(queryParams.get('nodeId')) : null;
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dropdown states (selection state, not applied immediately)
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);

  // Applied states (updates only when 'View' button is clicked)
  const [appliedStatus, setAppliedStatus] = useState<string>('');
  const [appliedSeverity, setAppliedSeverity] = useState<string>('');
  const [appliedNode, setAppliedNode] = useState<HierarchyNode | null>(null);
  useEffect(() => {
    if (flatNodes.length === 0) return;

    let siteIdVal = qSiteId;
    let nodeIdVal = qNodeId;
    let statusVal = '';
    let severityVal = '';

    const saved = localStorage.getItem('advisories_applied_filters');
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        if (!siteIdVal && filters.siteId) siteIdVal = filters.siteId;
        if (!nodeIdVal && filters.nodeId) nodeIdVal = filters.nodeId;
        if (filters.status) statusVal = filters.status;
        if (filters.severity) severityVal = filters.severity;
      } catch (e) { }
    }

    if (siteIdVal) {
      setSelectedSiteId(siteIdVal);
    } else {
      const sitesList = flatNodes.filter(n => n.node_type === 'site');
      setSelectedSiteId(sitesList[0]?.id || '');
    }

    if (nodeIdVal) {
      const matchingNode = flatNodes.find(n => n.id === nodeIdVal);
      if (matchingNode) {
        setSelectedNode(matchingNode);
        setAppliedNode(matchingNode);
      }
    }

    setStatusFilter(statusVal);
    setAppliedStatus(statusVal);
    setSeverityFilter(severityVal);
    setAppliedSeverity(severityVal);
  }, [flatNodes, qSiteId, qNodeId]);

  const [selectedAdvisory, setSelectedAdvisory] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [profile, setProfile] = useState<{ email: string; permissions: string[] } | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('user_profile');
    if (cached) {
      try {
        setProfile(JSON.parse(cached));
      } catch (e) { }
    }
  }, []);

  const canAcknowledge = profile?.permissions.includes('advisories:acknowledge') ?? false;
  const canRca = profile?.permissions.includes('advisories:rca') ?? false;

  useEffect(() => {
    api.hierarchy.list(true)
      .then(setFlatNodes)
      .catch(() => setFlatNodes([]))
      .finally(() => setHierarchyLoading(false));
  }, []);

  // Reactive effect to fetch advisories from server whenever applied filters change
  useEffect(() => {
    if (appliedNode === null) {
      setAdvisories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    api.advisories.list({
      node_id: appliedNode.id,
      status: appliedStatus,
      severity: appliedSeverity,
    })
      .then((res) => { setAdvisories(res); setLoading(false); })
      .catch((err) => { console.error('Failed to fetch advisories:', err); setLoading(false); });
  }, [appliedNode, appliedStatus, appliedSeverity]);

  const filteredRows = advisories;

  const isAllActive = !statusFilter && !severityFilter && !selectedNode && !appliedStatus && !appliedSeverity && !appliedNode;

  const handleApplyFilters = () => {
    setAppliedStatus(statusFilter);
    setAppliedSeverity(severityFilter);
    setAppliedNode(selectedNode);

    localStorage.setItem('advisories_applied_filters', JSON.stringify({
      siteId: selectedSiteId,
      status: statusFilter,
      severity: severityFilter,
      nodeId: selectedNode ? selectedNode.id : null
    }));
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setSeverityFilter('');
    setSelectedNode(null);
    setAppliedStatus('');
    setAppliedSeverity('');
    setAppliedNode(null);
    localStorage.removeItem('advisories_applied_filters');
    navigate('/advisories'); // Reset the query params
  };

  const handleRowClick = (advisory: any) => { setSelectedAdvisory(advisory); setDetailsOpen(true); };
  const handleCloseDetails = () => { setDetailsOpen(false); setSelectedAdvisory(null); };

  const handleAcknowledgeFromDetails = async (advisoryId: number) => {
    try {
      await api.advisories.update(advisoryId, { status: 'acknowledged' });
      if (appliedNode) {
        api.advisories.list({
          node_id: appliedNode.id,
          status: appliedStatus,
          severity: appliedSeverity
        })
          .then(setAdvisories)
          .catch((err) => console.error('Failed to refresh advisories:', err));
      }
      handleCloseDetails();
    } catch (error) {
      console.error('Failed to acknowledge advisory:', error);
    }
  };

  const handleInitiateRcaFromDetails = (advisory: any) => {
    handleCloseDetails();
    navigate(`/root-cause?advisoryId=${advisory.id}&selectedNodeName=${encodeURIComponent(advisory.asset)}`);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Advisories"
        subtitle="Active system advisories for equipment health, severity tracking, and remediation actions. Click any row to view full details."
        actions={
          <FormControl size="small" sx={{ minWidth: 350, bgcolor: 'white', }}>
            <InputLabel id="site-select-label" shrink>Site</InputLabel>
            <Select
              labelId="site-select-label"
              value={selectedSiteId}
              label="Site"
              onChange={(e) => setSelectedSiteId(e.target.value as number)}
              disabled={hierarchyLoading}
              displayEmpty
              renderValue={selectedSiteId === '' ? () => <span style={{ color: '#9e9e9e' }}>Select</span> : undefined}
            >
              <MenuItem value="" style={{ color: '#9e9e9e' }}>Select</MenuItem>
              {sites.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.display_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        }
      />

      <Paper sx={{ px: 2, py: 2.5, mb: 3, border: '1px solid #ccc' }}>
        <Box sx={{ mb: 3 }}>
          <HierarchySelector
            flatNodes={flatNodes}
            onSelectionChange={(node) => setSelectedNode(node)}
            initialNodeId={qNodeId}
            loading={hierarchyLoading}
            selectedSiteId={selectedSiteId}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>

          <FormControl sx={{ flex: 1, minWidth: 0 }} size="small">
            <InputLabel id="status-filter-label" shrink>Status</InputLabel>
            <Select
              labelId="status-filter-label"
              value={statusFilter}
              label="Status"
              onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
              displayEmpty
              renderValue={(selected) =>
                selected ? (selected === 'in_progress' ? 'In Progress' : selected.charAt(0).toUpperCase() + selected.slice(1)) : <span style={{ color: '#9e9e9e' }}>Select</span>
              }
            >
              <MenuItem value="" style={{ color: '#9e9e9e' }}>Select</MenuItem>
              {statusOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option === 'in_progress' ? 'In Progress' : option.charAt(0).toUpperCase() + option.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ flex: 1, minWidth: 0 }} size="small">
            <InputLabel id="severity-filter-label" shrink>Severity</InputLabel>
            <Select
              labelId="severity-filter-label"
              value={severityFilter}
              label="Severity"
              onChange={(e: SelectChangeEvent) => setSeverityFilter(e.target.value)}
              displayEmpty
              renderValue={(selected) =>
                selected ? selected.charAt(0).toUpperCase() + selected.slice(1) : <span style={{ color: '#9e9e9e' }}>Select</span>
              }
            >
              <MenuItem value="" style={{ color: '#9e9e9e' }}>Select</MenuItem>
              {severityOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            variant="contained"
            color="secondary"
            onClick={handleApplyFilters}
            sx={{ minWidth: 100, fontWeight: 700 }}
          >
            View
          </Button>

        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress color="secondary" />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{ backgroundColor: '#ffffff', boxShadow: 'none', border: '1px solid #ccc' }}
        >
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                {['Sensor Name', 'Asset', 'Severity', 'Status', 'Action taken'].map(col => (
                  <TableCell key={col} sx={{ color: 'text.secondary', fontWeight: 700, borderBottom: '1px solid #ccc' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {appliedNode === null ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    Please select a hierarchy node and click the <strong>View</strong> button to display advisories.
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    No advisories match the current filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => handleRowClick(row)}
                    sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                  >
                    <TableCell sx={{ color: 'text.primary', fontWeight: 600, borderBottom: '1px solid #ccc' }}>
                      {row.sensor_name || '—'}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid #ccc' }}>
                      {row.asset}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #ccc' }}>
                      <Chip
                        label={row.severity.toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: getSeverityBgColor(row.severity),
                          color: getSeverityColor(row.severity),
                          fontWeight: 700,
                          minWidth: 32,
                          justifyContent: 'center',
                          borderRadius: '4px',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #ccc' }}>
                      <StatusChip label={row.status.toUpperCase()} status={row.status} />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', borderBottom: '1px solid #ccc' }}>
                      {row.action_taken || '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Advisory Details Modal */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { border: '1px solid #ccc', borderRadius: 2 } } }}
      >
        {selectedAdvisory && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', pb: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{selectedAdvisory.asset}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={selectedAdvisory.severity.toUpperCase()}
                  size="small"
                  sx={{
                    backgroundColor: getSeverityBgColor(selectedAdvisory.severity),
                    color: getSeverityColor(selectedAdvisory.severity),
                    fontWeight: 700,
                    borderRadius: '4px',
                  }}
                />
                <StatusChip label={selectedAdvisory.status.toUpperCase()} status={selectedAdvisory.status} />
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3, mt: 2 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Sensor Name</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedAdvisory.sensor_name || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Anomaly Description</Typography>
                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>{selectedAdvisory.description}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>First Detected</Typography>
                  <Typography variant="body1">{new Date(selectedAdvisory.first_detected).toLocaleString()}</Typography>
                </Box>
                {selectedAdvisory.root_cause_description && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Root Cause Description</Typography>
                    <Typography variant="body1" sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1 }}>
                      {selectedAdvisory.root_cause_description}
                    </Typography>
                  </Box>
                )}
                {selectedAdvisory.action_taken && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Action Taken</Typography>
                    <Typography variant="body1" sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1 }}>
                      {selectedAdvisory.action_taken}
                    </Typography>
                  </Box>
                )}
                {selectedAdvisory.image_path && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>RCA Evidence / Image</Typography>
                    <Box
                      component="img"
                      src={
                        selectedAdvisory.image_path.startsWith('http')
                          ? selectedAdvisory.image_path
                          : `http://127.0.0.1:8000${selectedAdvisory.image_path}`
                      }
                      alt="RCA Evidence"
                      sx={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 1, border: '1px solid #e2e8f0', mt: 1 }}
                    />
                  </Box>
                )}
              </Stack>
            </DialogContent>

            <DialogActions sx={{ borderTop: '1px solid #e2e8f0', px: 3, py: 2 }}>
              {selectedAdvisory.status === 'open' && (
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!canAcknowledge}
                  onClick={() => handleAcknowledgeFromDetails(selectedAdvisory.id)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    '&.Mui-disabled': {
                      backgroundColor: '#e2e8f0',
                      color: '#94a3b8',
                    }
                  }}
                >
                  Acknowledge
                </Button>
              )}
              {selectedAdvisory.status !== 'resolved' && (
                <Button
                  variant="contained"
                  color="secondary"
                  disabled={!canRca}
                  sx={{
                    fontWeight: 600,
                    textTransform: 'none',
                    '&.Mui-disabled': {
                      backgroundColor: '#e2e8f0',
                      color: '#94a3b8',
                    }
                  }}
                  onClick={() => handleInitiateRcaFromDetails(selectedAdvisory)}
                >
                  Initiate RCA
                </Button>
              )}
              <Button variant="outlined" color='secondary' sx={{ textTransform: 'none', fontWeight: 600 }} onClick={handleCloseDetails} >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </PageContainer>
  );
};

export default Advisories;
