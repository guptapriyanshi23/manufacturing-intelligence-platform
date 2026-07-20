import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import './Header.scss';
import { api } from '../../api/client';

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

const navItems = [
  { path: '/', label: 'Alerts', permission: 'alerts:view' },
  // { path: '/dashboard', label: 'Dashboard', permission: 'dashboard:view' },
  { path: '/advisories', label: 'Advisory Summary', permission: 'advisories:view' },
  // { path: '/root-cause', label: 'Root Cause', permission: 'advisories:rca' },
  { path: '/analytics', label: 'Analytics', permission: 'reports:view' },
  { path: '/admin', label: 'Admin', permission: 'admin:view' },
];

const Header: React.FC<HeaderProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedNodeId = location.state?.selectedNodeId;

  const [activeAlerts, setActiveAlerts] = useState(0);
  const [activeAdvisories, setActiveAdvisories] = useState(0);
  const [profile, setProfile] = useState<{ email: string; permissions: string[] } | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('user_profile');
    if (cached) {
      try {
        setProfile(JSON.parse(cached));
      } catch (e) { }
    } else {
      api.auth.getMe()
        .then((res) => {
          setProfile(res);
          localStorage.setItem('user_profile', JSON.stringify(res));
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_profile');
          navigate('/login');
        });
    }
  }, [navigate]);

  useEffect(() => {
    if(selectedNodeId){
      //Fetching active alerts
      api.alerts.list({ status: 'active', node_id: selectedNodeId })
      .then((res) => {
        setActiveAlerts(res?.length)
      })
      .catch(() => setActiveAlerts(0))

      //Fetching active advisories
      api.advisories.list({ node_id: selectedNodeId })
      .then((res) => {
        if(res?.length){
          const openAdvisories = res.filter((ad) => ad.status !== 'resolved')
          setActiveAdvisories(openAdvisories?.length)
        }
      })
      .catch(() => setActiveAdvisories(0))
    }
  }, [selectedNodeId]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_profile');
    navigate('/login');
  };

  const allowedNavItems = navItems.filter((item) =>
    profile ? profile.permissions.includes(item.permission) : false
  );

  return (
    <>
      <header className="app-header">
        {/* Left — logo */}
        <Box className="header-left">
          <img src="/deloitteLogoWhite.png" alt="Deloitte" className="header-logo" />
          <span className="header-left__divider" aria-hidden="true" />
          <span className="header-left__project">AssetWize</span>
        </Box>

        {/* Right — navigation, user info + logout */}
        <Box className="header-right">
          <Box className="header-nav">
            {allowedNavItems?.map((item) => (
              <button
                key={item.path}
                className={`header-nav__item${location.pathname === item.path ? ' header-nav__item--active' : ''}`}
                type="button"
                onClick={() => navigate(item.path)}
              >
                {item.label}
                {item.path === '/' && activeAlerts > 0 && (
                  <span className="header-nav__badge">{activeAlerts}</span>
                )}
                {item.path === '/advisories' && activeAdvisories > 0 && (
                  <span className="header-nav__badge">{activeAdvisories}</span>
                )}
              </button>
            ))}
          </Box>

          <Box className="user-profile">
            <Box className="user-info">
              <span className="user-name">{profile?.email?.split("@")[0]}</span>
              <span className="user-role">{profile?.email}</span>
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
      {/* <div className="header-spacer" /> */}
    </>
  );
};

export default Header;
