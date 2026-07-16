import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  CircularProgress,
  Link,
  SvgIcon,
  Alert,
  FormControlLabel,
  Checkbox,
  IconButton,
} from '@mui/material';
import { api } from '../../api/client';
import Footer from '../../components/Footer';
import './Login.scss';

/* ── Inline SVG icons (avoids @mui/icons-material dependency) ── */
const PersonIcon = () => (
  <SvgIcon fontSize="small">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </SvgIcon>
);
const LockIcon = () => (
  <SvgIcon fontSize="small">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
  </SvgIcon>
);
const VisibilityIcon = () => (
  <SvgIcon fontSize="small">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
  </SvgIcon>
);
const VisibilityOffIcon = () => (
  <SvgIcon fontSize="small">
    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75C21.27 7.61 17 4.5 12 4.5c-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zm7.53 5.53 1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
  </SvgIcon>
);

const APP_VERSION = '1.0.0';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <Box className="login">

      <Box className="login-container">
          {/* Left Side - Background Image */}
        <Box className="login-left">
          <Box className="login-left__overlay">
            <img
              src="/deloitteLogoWhite.png"
              alt="Deloitte"
              className="login-left__logo"
            />
            <span className="login-left__divider" aria-hidden="true" />
            <Typography className="login-left__project-name">
              Asset Digital Twin
            </Typography>
          </Box>
        </Box>

         {/* Right Side - Login Form */}
        <Box className="login-right">
          <Box className="login-panel">
            {/* Login title */}
            <h5 className="login-title" >
              Login
            </h5>

            {/* Form */}
            <Box component="form" onSubmit={handleLogin} noValidate className="login-form">
              {authConfig.jwt_enabled && ( <>
              <Box className="field-group">
                <TextField
                  fullWidth
                  label="Username"
                  variant="outlined"
                  size="small"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Box>

              <Box className="field-group">
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  variant="outlined"
                  size="small"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowPassword((prev) => !prev)}
                            edge="end"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Box>

              {/* Remember me & forgot password */}
              <Box
                className="meta-row"
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="body2">Remember Me</Typography>
                  }
                />
                <Link href="#" className="forgot-btn" underline="hover">
                  Forgot Password?
                </Link>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                className="login-btn"
              >
                Login
              </Button>

              <Typography
                className="version-text"
                variant="caption"
                sx={{ display: 'block', textAlign: 'center' }}
              >
                v{APP_VERSION}
              </Typography>

              </>)}
            </Box>
          </Box>
        </Box>
      </Box>

      <Footer />
    </Box>
  );
};

export default Login;
