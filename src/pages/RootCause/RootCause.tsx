import React, { useState, useEffect, useRef } from 'react';
import { Box, Grid, Card, CardContent, Typography, LinearProgress, CircularProgress, Paper, Button, TextField } from '@mui/material';
import { Troubleshoot as TroubleshootingIcon, CheckCircle as SolveIcon, PhotoCameraOutlined } from '@mui/icons-material';
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
  const [rcaData, setRcaData] = useState<any>(demoRcaData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rootCauseDescription, setRootCauseDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setSubmitMessage(null);
  };

  const handleUploadSubmit = () => {
    if (!selectedFile && !rootCauseDescription && !actionTaken) {
      setSubmitMessage('Complete at least one field before submitting.');
      return;
    }

    setSubmitMessage('Fault details captured locally.');
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !rcaData) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">{error || 'Error loading root cause analysis details.'}</Typography>
      </Box>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Root Cause Analysis (RCA)"
        subtitle="AI-driven diagnostics mapping anomalies to likely failure factors."
      />

      <Grid container spacing={3}>
        {/* Fault photo upload and RCA submission */}
        <Grid item xs={12}>
          <Card sx={{ border: '1px solid #000000', backgroundColor: '#ffffff' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Fault Evidence & RCA Submission
              </Typography>
              <Grid sx={{ minWidth: '70vw' }}>
                <Grid item xs={12} md={4} sx={{ display: 'flex', 
                  flexDirection: 'row', gap: 2, mb: 3 }}>
                  <Box
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      minHeight: 240,
                      border: '2px dashed #000000',
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      p: 3,
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'rgba(56, 189, 248, 0.8)',
                        backgroundColor: 'rgba(56, 189, 248, 0.04)',
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
                    rows={9}
                    fullWidth
                    value={rootCauseDescription}
                    onChange={(event) => setRootCauseDescription(event.target.value)}
                  />
                </Grid>

                <Grid item xs={12} md={8} sx={{ display: 'flex', 
                  flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <TextField
                    label="Action taken"
                    placeholder="Enter action taken to resolve the issue"
                    fullWidth
                    value={actionTaken}
                    onChange={(event) => setActionTaken(event.target.value)}
                  />

                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    onClick={handleUploadSubmit}
                    sx={{ minWidth: 180 }}
                  >
                    Submit & close
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
};
export default RootCause;
