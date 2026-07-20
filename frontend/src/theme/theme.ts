import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#459734', // Deloitte Green
      light: '#6aa558',
      dark: '#316e28',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#1a1a1a',
      light: '#63666a',
      dark: '#0f172a',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    info: {
      main: '#00a1de',
      light: '#33b4e5',
      dark: '#00709b',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5', // Pure White
      paper: '#ffffff',   // Pure White
    },
    text: {
      primary: '#000000', // Pure Black
      secondary: '#000000', // Pure Black
    },
    divider: '#000000', // Pure Black Divider
  },
  typography: {
    fontFamily: "'Open Sans', sans-serif",
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.57,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#ffffff', // Pure White
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#ffffff',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#000000', // Pure Black Scrollbar
            borderRadius: '3px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 6,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(69, 151, 52, 0.25)', // Deloitte Green glow
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #ccc', // Pure Black Border
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#000000', // Pure Black Sidebar
          borderRight: '1px solid #ccc',
          color: '#ffffff',
          '& .MuiTypography-root': {
            color: '#ffffff',
          },
          '& .MuiListItemIcon-root': {
            color: '#ffffff', // Pure White Icons
          },
          '& .MuiListItemButton-root': {
            borderRadius: 6,
            margin: '2px 8px',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
            '&.Mui-selected': {
              backgroundColor: 'rgba(146, 212, 0, 0.15)',
              '& .MuiListItemIcon-root': {
                color: '#92d400',
              },
              '& .MuiTypography-root': {
                color: '#92d400',
                fontWeight: 600,
              },
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff', // Pure White App Bar
          borderBottom: '1px solid #ccc', // Pure Black Border
          boxShadow: 'none',
          color: '#000000',
        },
      },
    },
  },
});

export default theme;
