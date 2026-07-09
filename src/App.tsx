import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import AppRoutes from './routes';

const theme = createTheme({
  typography: {
    fontFamily: "'Open Sans', sans-serif",
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
 
      <AppRoutes />
    </ThemeProvider>
  );
}

export default App
