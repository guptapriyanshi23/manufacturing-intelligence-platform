import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Stack,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Chip,
} from '@mui/material';
import { PhotoCameraOutlined } from '@mui/icons-material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { StatusChip } from '../../components/Forms/StatusChip';
import { api } from '../../api/client';
import { getSeverityLevelFull } from '../../constants/severity';
import type { Advisory } from '../../types/api_types';
import { AdvisoryStatus } from '../../types/enums';
import BreadCrumsBar from '../../components/BreadCrumsBar/BreadCrumsBar';

const getBreadcrumbsPath = (nodeId: number, flatNodes: any[]): string[] => {
  const path: string[] = [];
  let current = flatNodes.find(n => n.id === nodeId);
  while (current) {
    path.unshift(current.display_name);
    current = current.parent_id ? flatNodes.find(n => n.id === current.parent_id) : undefined;
  }
  return path;
};

export const RootCause: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [rcaStatus, setRcaStatus] = useState<AdvisoryStatus>(AdvisoryStatus.IN_PROGRESS);
  const [rootCauseDescription, setRootCauseDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [selectedAdvisoryId, setSelectedAdvisoryId] = useState<number | ''>('');
  const [flatNodes, setFlatNodes] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const searchParams = new URLSearchParams(location.search);

  useEffect(() => {
    setLoading(true)
    api.hierarchy.list(true)
      .then(setFlatNodes)
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const advId = location.state?.advisoryId || searchParams.get('advisoryId');
    if (advId) {
      setLoading(true)
      api.advisories.get(Number(advId))
        .then((res) => {
          setAdvisories([res]);
          setSelectedAdvisoryId(res.id);
          setRootCauseDescription(res.root_cause_description || '');
          setActionTaken(res.action_taken || '');
          setRcaStatus(res.status === AdvisoryStatus.RESOLVED ? AdvisoryStatus.RESOLVED : AdvisoryStatus.IN_PROGRESS);
        })
        .catch((err) => {
          console.error('Failed to load single advisory for RCA:', err);
        })
        .finally(() => setLoading(false));
    } else {
      setAdvisories([]);
      setSelectedAdvisoryId('');
    }
  }, [location.search, location.state]);

  const activeAdvisory = advisories.find((a) => a.id === selectedAdvisoryId);

  const matchingNode = activeAdvisory
    ? (flatNodes.find(n => n.sensor_metadata?.sensor_id === activeAdvisory.sensor_id)
      || flatNodes.find(n => n.display_name === activeAdvisory.asset)
      || flatNodes.find(n => n.id === activeAdvisory.node_id))
    : null;

  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  useEffect(() => {
    if (matchingNode && flatNodes.length > 0) {
      setBreadcrumbs(getBreadcrumbsPath(matchingNode.id, flatNodes));
    } else {
      setBreadcrumbs([]);
    }
  }, [matchingNode, flatNodes]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };



  const handleUploadSubmit = async () => {
    if (!selectedAdvisoryId || !activeAdvisory) {
      return;
    }

    if (!selectedFile && !rootCauseDescription && !actionTaken) {
      return;
    }

    setSubmitting(true);
    try {
      let imagePath = activeAdvisory?.image_path || null;
      if (selectedFile) {
        const uploadRes = await api.advisories.uploadImage(selectedFile);
        imagePath = uploadRes.url;
      }

      await api.advisories.update(Number(selectedAdvisoryId), {
        status: rcaStatus,
        root_cause_description: rootCauseDescription,
        action_taken: actionTaken,
        image_path: imagePath,
      });

      setSelectedFile(null);
      setRootCauseDescription('');
      setActionTaken('');
      setSelectedAdvisoryId('');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Prefill status, severity, and selectedNodeId for advisories page routing context!
      navigate('/advisories', {
        state: {
          selectedNodeId: location.state?.selectedNodeId || activeAdvisory.node_id,
          prefilledStatus: rcaStatus,
          prefilledSeverity: activeAdvisory.severity,
        }
      });
    } catch (err) {
      console.error('Failed to save RCA details:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Root Cause Analysis (RCA)"
        url='/root-cause'
      />

      <BreadCrumsBar breadcrumbsData={breadcrumbs} />


        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress color="secondary" />
          </Box>
        ) : (
        <Card className='advisory-summary__grid-card'>
          <CardContent >
            <Stack spacing={3}>
              {activeAdvisory ? (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }} sx={{display: 'flex', alignItems: 'end', gap: 1}}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Asset</Typography>
                      <Typography variant="body1">{activeAdvisory.asset}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }} sx={{display: 'flex', alignItems: 'end', gap: 1}}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Severity</Typography>
                      <Chip
                        label={getSeverityLevelFull(activeAdvisory.severity).toUpperCase()}
                        size="small"
                        className={`severity-badge severity-s${activeAdvisory.severity}`}
                        sx={{
                          fontWeight: 700,
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }} sx={{display: 'flex', alignItems: 'end', gap: 1}}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Status</Typography>
                      <StatusChip status={activeAdvisory.status} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }} sx={{display: 'flex', alignItems: 'end', gap: 1}}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>First Detected</Typography>
                      <Typography variant="body1">
                        {new Date(activeAdvisory.detected_at).toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Advisory Message</Typography>
                      <Typography variant="body2">{activeAdvisory.description}</Typography>
                    </Grid>
                  </Grid>
              ) : (

                  <Typography variant="body1" color="text.secondary">
                    No active advisory selected. Please navigate to the <strong>Advisories</strong> page and click <strong>Initiate RCA</strong> on an advisory.
                  </Typography>
              )}

              <Box
                onClick={() => activeAdvisory && fileInputRef.current?.click()}
                sx={{
                  width: '100%',
                  minHeight: 180,
                  border: '1px dashed #7b7a7a',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  p: 3,
                  cursor: activeAdvisory ? 'pointer' : 'default',
                  opacity: activeAdvisory ? 1 : 0.6,
                  pointerEvents: activeAdvisory ? 'auto' : 'none',
                  '&:hover': {
                    borderColor: 'rgb(21, 137, 8)',
                    backgroundColor: 'rgba(62, 248, 56, 0.04)',
                  },
                }}
              >
                <PhotoCameraOutlined sx={{ fontSize: 40, mb: 1, color: 'text.secondary' }} />
                <Typography variant="body1">
                  Click to upload a photo of the fault
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  (PNG, JPG or JPEG up to 5MB)
                </Typography>
                {selectedFile && (
                  <Typography variant="body2" sx={{ mt: 2, color: 'primary.main', fontWeight: 600 }}>
                    Selected: {selectedFile.name}
                  </Typography>
                )}
                {activeAdvisory?.image_path && !selectedFile && (
                  <Typography variant="body2" sx={{ mt: 2, color: 'success.main', fontWeight: 600 }}>
                    Current file: {activeAdvisory.image_path}
                  </Typography>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleFileChange}
                  hidden
                  disabled={!activeAdvisory}
                />
              </Box>

              <TextField
                label="Root cause description"
                placeholder="Describe the likely root cause here"
                multiline
                rows={5}
                fullWidth
                value={rootCauseDescription}
                onChange={(event) => setRootCauseDescription(event.target.value)}
                disabled={!activeAdvisory}
              />

              <TextField
                label="Action taken"
                placeholder="Enter action taken to resolve the issue"
                fullWidth
                multiline
                rows={3}
                value={actionTaken}
                onChange={(event) => setActionTaken(event.target.value)}
                disabled={!activeAdvisory}
              />

              <FormControlLabel
                  control={
                    <Checkbox
                      checked={rcaStatus === AdvisoryStatus.RESOLVED}
                      onChange={(e) => setRcaStatus(e.target.checked ? AdvisoryStatus.RESOLVED : AdvisoryStatus.IN_PROGRESS)}
                      color="primary"
                      disabled={!activeAdvisory}
                    />
                  }
                  label="Mark as Resolved"
                />

              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleUploadSubmit}
                  sx={{ minWidth: 180 }}
                  disabled={!activeAdvisory || submitting}
                >
                  {submitting ? <CircularProgress size={24} color="inherit" /> : 'Submit & Close'}
                </Button>
              </Box>
            </Stack>
          </CardContent>
          </Card>
        )}

    </PageContainer>
  );
};

export default RootCause;
