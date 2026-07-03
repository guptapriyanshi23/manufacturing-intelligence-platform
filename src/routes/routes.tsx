import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../pages/Dashboard/Dashboard';
import Alerts from '../pages/Alerts/Alerts';
import RootCause from '../pages/RootCause/RootCause';
import Advisories from '../pages/Advisories/Advisories';
import Reports from '../pages/Reports/Reports';
import Admin from '../pages/Admin/Admin';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '',
        element: <Dashboard />,
      },
      {
        path: 'alerts',
        element: <Alerts />,
      },
      {
        path: 'root-cause',
        element: <RootCause />,
      },
      {
        path: 'advisories',
        element: <Advisories />,
      },
      {
        path: 'reports',
        element: <Reports />,
      },
      {
        path: 'admin',
        element: <Admin />,
      },
    ],
  },
]);

export default router;
