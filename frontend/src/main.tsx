import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import router from './routes/routes';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <RouterProvider router={router} />
  </ThemeProvider>
);
