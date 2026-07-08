import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

export const Advisories: React.FC = () => {
  const navigate = useNavigate();
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [assetFilter, setAssetFilter] = useState<string>('');
  const [flatNodes, setFlatNodes] = useState<HierarchyNode[]>([]);

  const [selectedAdvisory, setSelectedAdvisory] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchAdvisories = () => {
    setLoading(true);
    api.advisories.list()
      .then((res) => { setAdvisories(res); setLoading(false); })
      .catch((err) => { console.error('Failed to fetch advisories:', err); setLoading(false); });
  };

  const [profile, setProfile] = useState<{ email: string; permissions: string[] } | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('user_profile');
    if (cached) {
      try {
        setProfile(JSON.parse(cached));
      } catch (e) {}
    }
  }, []);

  const canAcknowledge = profile?.permissions.includes('advisories:acknowledge') ?? false;
  const canRca = profile?.permissions.includes('advisories:rca') ?? false;

  useEffect(() => {
    fetchAdvisories();
    api.hierarchy.list(true).then(setFlatNodes).catch(() => setFlatNodes([]));
  }, []);

  const getAssetDepth = (node: HierarchyNode): number => {
    let depth = 0; let cur = node;
    while (cur.parent_id) {
      const p = flatNodes.find(n => n.id === cur.parent_id);
      if (!p) break; depth++; cur = p;
    }
    return depth;
  };

  const assetOptions = flatNodes
    .filter(n => n.node_type !== 'sensor')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(n => ({ node: n, depth: getAssetDepth(n) }));

  const filteredRows = advisories.filter((row) => {
    const statusMatch = statusFilter ? row.status === statusFilter : true;
    const severityMatch = severityFilter ? row.severity === severityFilter : true;
    const assetMatch = assetFilter
      ? row.asset === flatNodes.find(n => String(n.id) === assetFilter)?.display_name
      : true;
    return statusMatch && severityMatch && assetMatch;
  });

  const isAllActive = !statusFilter && !severityFilter && !assetFilter;

  const handleResetFilters = () => {
    setStatusFilter('');
    setSeverityFilter('');
    setAssetFilter('');
  };

  const handleRowClick = (advisory: any) => { setSelectedAdvisory(advisory); setDetailsOpen(true); };
  const handleCloseDetails = () => { setDetailsOpen(false); setSelectedAdvisory(null); };

  const handleAcknowledgeFromDetails = async (advisoryId: number) => {
    try {
      await api.advisories.update(advisoryId, { status: 'acknowledged' });
      fetchAdvisories();
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
      />

      <Paper sx={{ p: 2, mb: 3, border: '1px solid #ccc' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2,  }}>
          <Button
            variant={isAllActive ? 'contained' : 'outlined'}
            color="primary"
            onClick={handleResetFilters}
            sx={{minWidth: 90, fontWeight: 600, flexShrink: 0}}
          >
            All
          </Button>

          <FormControl sx={{flex: 1}} size="small">
            <InputLabel id="asset-filter-label">Asset</InputLabel>
            <Select
              labelId="asset-filter-label"
              value={assetFilter}
              label="Asset"
              onChange={(e) => setAssetFilter(e.target.value)}
              renderValue={(val) => {
                if (!val) return 'All Assets';
                const found = flatNodes.find(n => String(n.id) === val);
                return found ? found.display_name : val;
              }}
            >
              <MenuItem value=""><em>All Assets</em></MenuItem>
              {assetOptions.map(({ node, depth }) => (
                <MenuItem key={node.id} value={String(node.id)}>
                  <Box sx={{ pl: depth * 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {depth > 0 && <Typography component="span" color="text.disabled" sx={{ fontSize: 12 }}>└</Typography>}
                    {node.display_name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ flex: 1 }} size="small">
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              value={statusFilter}
              label="Status"
              onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
              renderValue={(selected) =>
                selected ? selected.charAt(0).toUpperCase() + selected.slice(1) : 'Status'
              }
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {statusOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option === 'in_progress' ? 'In Progress' : option.charAt(0).toUpperCase() + option.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ flex: 1 }} size="small">
            <InputLabel id="severity-filter-label">Severity</InputLabel>
            <Select
              labelId="severity-filter-label"
              value={severityFilter}
              label="Severity"
              onChange={(e: SelectChangeEvent) => setSeverityFilter(e.target.value)}
              renderValue={(selected) =>
                selected ? selected.charAt(0).toUpperCase() + selected.slice(1) : 'Severity'
              }
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {severityOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
                {['Tag', 'Asset', 'Severity', 'Status', 'Action taken'].map(col => (
                  <TableCell key={col} sx={{ color: 'text.secondary', fontWeight: 700, borderBottom: '1px solid #ccc' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  onClick={() => handleRowClick(row)}
                  sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                >
                  <TableCell sx={{ color: 'text.primary', fontWeight: 600, borderBottom: '1px solid #ccc' }}>
                    {row.tag}
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
              ))}
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    No advisories match the current filter.
                  </TableCell>
                </TableRow>
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
                  }}
                />
                <StatusChip label={selectedAdvisory.status.toUpperCase()} status={selectedAdvisory.status} />
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3, mt: 2 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Parameter Tag</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedAdvisory.tag}</Typography>
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
                    <Typography variant="body1" sx={{ p: 2, bgcolor: 'rgba(34, 197, 94, 0.08)', border: '1px solid #bbf7d0', borderRadius: 1 }}>
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
              <Button variant="outlined" color='secondary' sx={{ textTransform: 'none', fontWeight: 600 }}  onClick={handleCloseDetails} >
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
