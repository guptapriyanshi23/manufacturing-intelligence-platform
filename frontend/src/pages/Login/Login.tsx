import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  PersonOutlined as PersonIcon,
  LockOutlined as LockIcon,
  VpnKeyOutlined as KeysIcon,
} from '@mui/icons-material';
import { api } from '../../api/client';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [authConfig, setAuthConfig] = useState({ jwt_enabled: true, sso_enabled: true });

  useEffect(() => {
    // Fetch auth configuration
    api.auth.getConfig()
      .then(setAuthConfig)
      .catch(err => console.error("Failed to load auth config:", err));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both username/email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.login(email, password);
      localStorage.setItem('auth_token', res.access_token);

      // Fetch user profile and permissions immediately to cache
      const profile = await api.auth.getMe();
      localStorage.setItem('user_profile', JSON.stringify(profile));

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSsoLogin = () => {
    setError('SSO authentication is not fully integrated yet. Please use JWT credentials.');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Left Panel: Deloitte/AssetWize Glowing Illustration */}
      <Box
        sx={{
          flex: 2,
          backgroundColor: '#000000',
          color: 'white',
          p: 4,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          backgroundImage: 'radial-gradient(circle at 40% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 60%)',
        }}
      >
        {/* Brand Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'white', letterSpacing: '0.5px' }}>
            Deloitte<span style={{ color: '#84CC16' }}>.</span>
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 300, opacity: 0.5 }}>
            |
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 400, color: '#f3f4f6', letterSpacing: '0.5px' }}>
            AssetWize
          </Typography>
        </Box>

        {/* Central Illustration - Circular glowing gear/hand */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexGrow: 1,
          }}
        >
          <Box
            sx={{
              width: 320,
              height: 320,
              borderRadius: '50%',
              border: '2px solid rgba(132, 204, 22, 0.2)',
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 0 40px rgba(132, 204, 22, 0.1)',
            }}
          >
            {/* Nested tech circles */}
            <Box
              sx={{
                width: 250,
                height: 250,
                borderRadius: '50%',
                border: '1px dashed rgba(132, 204, 22, 0.4)',
                position: 'absolute',
              }}
            />
            <Box
              sx={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                border: '2px solid rgba(132, 204, 22, 0.6)',
                position: 'absolute',
                boxShadow: '0 0 25px rgba(132, 204, 22, 0.15)',
              }}
            />
            {/* Core hand/gear image wrapper */}
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                backgroundColor: 'rgba(132, 204, 22, 0.15)',
                position: 'absolute',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 0 30px rgba(132, 204, 22, 0.3)',
              }}
            >
              <Box
                component="img"
                src="/deloitte_logo_black.svg"
                alt="Deloitte Core"
                sx={{
                  width: '60%',
                  filter: 'brightness(0) invert(1)',
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Typography variant="caption" sx={{ opacity: 0.5, fontSize: '0.7rem' }}>
          Copyright ©2026 Deloitte Touche Tohmatsu India LLP. Member of Deloitte Touche Tohmatsu Limited. | Disclaimer
        </Typography>
      </Box>

      {/* Right Panel: Clean Login Form */}
      <Box
        sx={{
          flex: 1,
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 4, sm: 8 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 360 }}>
          <Typography variant="h4" sx={{ fontWeight: 500, mb: 4, color: '#333333', textAlign: 'center' }}>
            Login
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            {authConfig.jwt_enabled && (
              <>
                {/* Username Input */}
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="User name"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#ffffff',
                      borderRadius: 1,
                    },
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: '#999999' }} />
                        </InputAdornment>
                      ),
                    }
                  }}
                />

                {/* Password Input */}
                <TextField
                  fullWidth
                  variant="outlined"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#ffffff',
                      borderRadius: 1,
                    },
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: '#999999' }} />
                        </InputAdornment>
                      ),
                    }
                  }}
                />

                {/* Submit button */}
                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  disabled={loading}
                  sx={{
                    backgroundColor: '#1a7f18',
                    color: 'white',
                    py: 1.5,
                    fontSize: '1rem',
                    textTransform: 'none',
                    borderRadius: 1,
                    fontWeight: 600,
                    boxShadow: 'none',
                    '&:hover': {
                      backgroundColor: '#146312',
                    },
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                </Button>
              </>
            )}

            {/* SSO Integration Provision */}
            {authConfig.sso_enabled && (
              <Button
                fullWidth
                variant="outlined"
                onClick={handleSsoLogin}
                sx={{
                  mt: authConfig.jwt_enabled ? 2 : 0,
                  py: 1.5,
                  color: '#1a7f18',
                  borderColor: '#1a7f18',
                  textTransform: 'none',
                  borderRadius: 1,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  '&:hover': {
                    borderColor: '#146312',
                    backgroundColor: 'rgba(26, 127, 24, 0.04)',
                  },
                }}
              >
                <KeysIcon fontSize="small" />
                Login with SSO
              </Button>
            )}

            {/* Forgot password */}
            <Box sx={{ mt: 3, textAlign: 'left' }}>
              <Typography
                variant="body2"
                sx={{
                  color: '#1a7f18',
                  cursor: 'pointer',
                  fontWeight: 500,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Forgot Password ?
              </Typography>
            </Box>
          </form>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
