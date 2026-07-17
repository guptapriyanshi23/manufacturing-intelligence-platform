import React, { useState } from 'react';
import { Box, Drawer, IconButton, Link, SvgIcon, Typography } from '@mui/material';
import './Footer.scss';

/* ── Inline SVG icon ── */
const CloseIcon = () => (
  <SvgIcon fontSize="small">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </SvgIcon>
);

const Footer: React.FC = () => {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  const handleDisclaimerOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    setDisclaimerOpen(true);
  };

  const handleDisclaimerClose = () => {
    setDisclaimerOpen(false);
  };

  return (
    <>
      <Box className="app-footer">
        <Typography variant="body2" className="app-footer__text">
          Copyright ©2026 Deloitte Touche Tohmatsu India LLP. Member of Deloitte Touche Tohmatsu Limited. |{' '}
          <Link
            href="#"
            onClick={handleDisclaimerOpen}
            className="app-footer__disclaimer-link"
            underline="hover"
          >
            Disclaimer
          </Link>
        </Typography>
      </Box>

      <Drawer
        anchor="bottom"
        open={disclaimerOpen}
        onClose={handleDisclaimerClose}
        className="disclaimer-drawer"
        slotProps={{
          paper: {
            className: 'disclaimer-drawer__paper',
          },
        }}
      >
        <Box className="disclaimer-drawer__content">
          <Box className="disclaimer-drawer__header">
            <Typography variant="h6" className="disclaimer-drawer__title">
              Disclaimer
            </Typography>
            <IconButton
              onClick={handleDisclaimerClose}
              className="disclaimer-drawer__close"
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Box className="disclaimer-drawer__body">
            <Typography variant="body2" sx={{ mb: 2 }}>
              Deloitte refers to one or more of Deloitte Touche Tohmatsu Limited, a UK private company limited by guarantee ("DTTL"), its network of member firms, and their related entities. DTTL and each of its member firms are legally separate and independent entities. DTTL (also referred to as "Deloitte Global") does not provide services to user. Please see www.deloitte.com/about for a more detailed description of DTTL and its member firms.
            </Typography>

            <Typography variant="body2" sx={{ mb: 2 }}>
              This tool is a proprietary software/application based tool developed and exclusively owned by Deloitte Touche Tohmatsu India LLP (DTTILLP). The tool enables collecting, compiling or obtaining information. User shall not copy, reproduce, modify, distribute, disseminate the tool, nor will the user reverse engineer, decompile, dismantle or obtain access to the underlying formulae of the tool.
            </Typography>

            <Typography variant="body2">
              Unless specifically agreed with the Client, DTTILLP HAS NO OBLIGATION TO PROVIDE SUPPORT, UPDATES, UPGRADES, OR MODIFICATIONS TO THE TOOL.
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default Footer;
