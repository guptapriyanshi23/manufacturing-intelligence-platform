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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Stack,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { PhotoCameraOutlined } from '@mui/icons-material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
import { api } from '../../api/client';

export const RootCause: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rcaStatus, setRcaStatus] = useState<'in_progress' | 'resolved'>('in_progress');
  const [rootCauseDescription, setRootCauseDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [selectedAdvisoryId, setSelectedAdvisoryId] = useState<number | ''>('');
  const [flatNodes, setFlatNodes] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const searchParams = new URLSearchParams(location.search);

  useEffect(() => {
    api.hierarchy.list(true)
      .then(setFlatNodes)
      .catch(() => { });
  }, []);

  useEffect(() => {
    const advId = location.state?.advisoryId || searchParams.get('advisoryId');
    if (advId) {
      api.advisories.get(Number(advId))
        .then((res) => {
          setAdvisories([res]);
          setSelectedAdvisoryId(res.id);
          setRootCauseDescription(res.root_cause_description || '');
          setActionTaken(res.action_taken || '');
          setRcaStatus(res.status === 'resolved' ? 'resolved' : 'in_progress');
        })
        .catch((err) => {
          console.error('Failed to load single advisory for RCA:', err);
        });
    } else {
      api.advisories.list()
        .then((res) => {
          setAdvisories(res);
        })
        .catch((err) => {
          console.error('Failed to load advisories for RCA:', err);
        });
    }
  }, [location.search, location.state]);

  const activeAdvisory = advisories.find((a) => a.id === selectedAdvisoryId);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleAdvisorySelect = (event: any) => {
    const id = event.target.value;
    setSelectedAdvisoryId(id);
    const found = advisories.find((a) => a.id === id);
    if (found) {
      setRootCauseDescription(found.root_cause_description || '');
      setActionTaken(found.action_taken || '');
      setRcaStatus(found.status === 'resolved' ? 'resolved' : 'in_progress');
    } else {
      setRootCauseDescription('');
      setActionTaken('');
      setRcaStatus('in_progress');
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedAdvisoryId) {
      return;
    }

    if (!selectedFile && !rootCauseDescription && !actionTaken) {
      return;
    }

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

      let targetQuery = '';
      if (activeAdvisory) {
        const matchingNode = flatNodes.find(n => n.sensor_metadata?.sensor_id === activeAdvisory.sensor_id)
          || flatNodes.find(n => n.display_name === activeAdvisory.asset);
        if (matchingNode) {
          let siteId = '';
          let curr = matchingNode;
          while (curr) {
            if (curr.node_type === 'site') {
              siteId = curr.id.toString();
              break;
            }
            curr = curr.parent_id ? flatNodes.find(n => n.id === curr.parent_id) : null;
          }
          targetQuery = `?siteId=${siteId}&nodeId=${matchingNode.id}`;
        }
      }

      setSelectedFile(null);
      setRootCauseDescription('');
      setActionTaken('');
      setSelectedAdvisoryId('');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      navigate(`/advisories${targetQuery}`);
    } catch (err) {
      console.error('Failed to save RCA details:', err);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Root Cause Analysis (RCA)"
        subtitle="Attach evidence, describe root cause, and record the action taken to resolve system advisories."
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Card sx={{ border: '1px solid #ccc', backgroundColor: '#ffffff' }}>
            <Box
              sx={{
                backgroundColor: 'secondary.main',
                p: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                }}
              >
                {activeAdvisory ? `${activeAdvisory.asset}` : 'Select Advisory to Initiate RCA'}
              </Typography>
            </Box>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="advisory-select-label" shrink>Active Advisory Target</InputLabel>
                  <Select
                    labelId="advisory-select-label"
                    value={selectedAdvisoryId}
                    label="Active Advisory Target"
                    onChange={handleAdvisorySelect}
                    displayEmpty
                    renderValue={selectedAdvisoryId === '' ? () => <span style={{ color: '#9e9e9e' }}>Select</span> : undefined}
                  >
                    <MenuItem value="" style={{ color: '#9e9e9e' }}>Select</MenuItem>
                    {advisories
                      .filter((a) => a.status !== 'resolved' || a.id === selectedAdvisoryId)
                      .map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          [{a.status.toUpperCase()}] {a.asset} - {a.tag} ({a.severity})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                {activeAdvisory && (
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Advisory Details
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Description:</strong> {activeAdvisory.description}
                    </Typography>
                    <Typography variant="body2">
                      <strong>First Detected:</strong>{' '}
                      {new Date(activeAdvisory.first_detected).toLocaleString()}
                    </Typography>
                  </Paper>
                )}

                <Box
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    width: '100%',
                    minHeight: 180,
                    border: '1px dashed #7b7a7a',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 3,
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'rgb(21, 137, 8)',
                      backgroundColor: 'rgba(62, 248, 56, 0.04)',
                    },
                  }}
                >
                  <PhotoCameraOutlined sx={{ fontSize: 40, mb: 1, color: 'text.secondary' }} />
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    Click to upload a photo of the fault
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    PNG, JPG or JPEG up to 5MB
                  </Typography>
                  {selectedFile && (
                    <Typography variant="caption" sx={{ mt: 2, color: 'primary.main', fontWeight: 600 }}>
                      Selected: {selectedFile.name}
                    </Typography>
                  )}
                  {activeAdvisory?.image_path && !selectedFile && (
                    <Typography variant="caption" sx={{ mt: 2, color: 'success.main', fontWeight: 600 }}>
                      Current file: {activeAdvisory.image_path}
                    </Typography>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleFileChange}
                    hidden
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
                />

                <TextField
                  label="Action taken"
                  placeholder="Enter action taken to resolve the issue"
                  fullWidth
                  multiline
                  rows={3}
                  value={actionTaken}
                  onChange={(event) => setActionTaken(event.target.value)}
                />

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rcaStatus === 'resolved'}
                        onChange={(e) => setRcaStatus(e.target.checked ? 'resolved' : 'in_progress')}
                        color="primary"
                      />
                    }
                    label="Mark as Resolved"
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleUploadSubmit}
                    sx={{ minWidth: 180 }}
                    disabled={!selectedAdvisoryId}
                  >
                    Submit & Close
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default RootCause;
