import React, { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Grid, Card, CardContent, Typography, Button, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { PhotoCameraOutlined } from '@mui/icons-material';
import { PageContainer } from '../../components/Cards/PageContainer';
import { PageHeader } from '../../components/Cards/PageHeader';
// import { api } from '../../api/client';

const demoRcaData = {
  event_id: '101',
  asset_name: 'Compressor 1',
  anomaly_type: 'Pressure Spike',
  detected_at: new Date().toISOString(),
  possible_causes: [
    { name: 'Valve Failure', category: 'mechanical', probability: 0.78, description: 'Pressure control valve may be sticking or leaking.' },
    { name: 'Sensor Drift', category: 'sensor', probability: 0.56, description: 'Pressure sensor output is trending outside expected range.' },
    { name: 'Fluid Contamination', category: 'fluid', probability: 0.38, description: 'Impurities in the fluid can cause pressure spikes.' },
  ],
  recommendation: 'Inspect the pressure control valve and test the sensor alignment before running the compressor again.',
};

export const RootCause: React.FC = () => {
  const location = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rootCauseDescription, setRootCauseDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [status, setStatus] = useState('open');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const selectedNodeName = searchParams.get('selectedNodeName') || 'ID Fan #2 (Calciner Draft)';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleUploadSubmit = () => {
    if (!selectedFile && !rootCauseDescription && !actionTaken) {
      alert('Complete at least one field before submitting.');
      return;
    }

    alert('Fault details captured locally.');
    setSelectedFile(null);
    setRootCauseDescription('');
    setActionTaken('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Uncomment and connect backend when ready
  // useEffect(() => {
  //   api.rootCause.get('101')
  //     .then((res) => {
  //       setRcaData(res);
  //       setLoading(false);
  //     })
  //     .catch((err) => {
  //       setError(err.message || 'Failed to fetch RCA diagnostics');
  //       setLoading(false);
  //     });
  // }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Root Cause Analysis (RCA)"
        subtitle="Reached from Dahboard - attach evidence, describe root cause and record the action taken."
      />

      <Grid container spacing={3}>
        {/* Fault photo upload and RCA submission */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ border: '1px solid #000000', backgroundColor: '#ffffff' }}>
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
                {selectedNodeName}
              </Typography>
            </Box>
            <CardContent>
              <Grid container spacing={3}>
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
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                    Click to upload a photo of the fault
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    PNG, JPG or JPEG up to 5MB
                  </Typography>
                  {selectedFile && (
                    <Typography variant="caption" sx={{ mt: 2, color: 'primary.main' }}>
                      {selectedFile.name}
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

                  {/* <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={status}
                      label="Status"
                      onChange={(event) => setStatus(event.target.value)}
                    >
                      <MenuItem value="open">Open</MenuItem>
                      <MenuItem value="acknowledge">Acknowledge</MenuItem>
                      <MenuItem value="resolved">Resolved</MenuItem>
                    </Select>
                  </FormControl> */}

                  <TextField
                    label="Action taken"
                    placeholder="Enter action taken to resolve the issue"
                    fullWidth
                    multiline
                    rows={3}
                    value={actionTaken}
                    onChange={(event) => setActionTaken(event.target.value)}
                  />

                  <Button variant="contained" color="primary"
                    size="large"
                    onClick={handleUploadSubmit}
                    sx={{ minWidth: 180 }}
                  >
                    Submit & close
                  </Button>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
};
export default RootCause;
