import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import { UNRESOLVED_ALERT_COUNT } from '../../pages/alerts';
import { OPEN_ADVISORY_COUNT } from '../../pages/advisory-summary';
import './Header.scss';

// Inline logout SVG icon
const LogoutIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ flexShrink: 0 }}
  >
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
  </svg>
);

interface HeaderProps {
  username?: string;
  role?: string;
}

const Header: React.FC<HeaderProps> = ({
  username = 'Siddhi Sadh',
  role = 'Admin',
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <>
      <header className="app-header">
        {/* Left — logo */}
        <Box className="header-left">
          <img src="/deloitteLogoWhite.png" alt="Deloitte" className="header-logo" />
          <span className="header-left__divider" aria-hidden="true" />
          <span className="header-left__project">Asset Digital Twin</span>
        </Box>

        {/* Right — navigation, user info + logout */}
        <Box className="header-right">
          <Box className="header-nav">
            <button
              className={`header-nav__item${location.pathname === '/alerts' ? ' header-nav__item--active' : ''}`}
              type="button"
              onClick={() => navigate('/alerts')}
            >
              Alerts
              {UNRESOLVED_ALERT_COUNT > 0 && (
                <span className="header-nav__badge">{UNRESOLVED_ALERT_COUNT}</span>
              )}
            </button>
            <button
              className={`header-nav__item${location.pathname === '/advisory-summary' ? ' header-nav__item--active' : ''}`}
              type="button"
              onClick={() => navigate('/advisory-summary')}
            >
              Advisory Summary
              {OPEN_ADVISORY_COUNT > 0 && (
                <span className="header-nav__badge">{OPEN_ADVISORY_COUNT}</span>
              )}
            </button>
            <button
              className={`header-nav__item${location.pathname === '/reports' ? ' header-nav__item--active' : ''}`}
              type="button"
              onClick={() => navigate('/reports')}
            >
              Reports
            </button>
                <button
              className={`header-nav__item${location.pathname === '/admin' ? ' header-nav__item--active' : ''}`}
              type="button"
              onClick={() => navigate('/admin')}
            >
              Admin
            </button>
          </Box>

          <Box className="user-profile">
            <Box className="user-info">
              <span className="user-name">{username}</span>
              <span className="user-role">{role}</span>
            </Box>
          </Box>

          <Button
            variant="outlined"
            className="logout-btn"
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
          >
            Logout
          </Button>
        </Box>
      </header>

      {/* Spacer to prevent content from hiding behind fixed header */}
      <div className="header-spacer" />
    </>
  );
};

export default Header;
