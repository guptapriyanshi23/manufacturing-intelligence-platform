import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../auth/login';
import Alerts from '../pages/alerts';
import OrgTree from '../pages/org-tree';
import AdvisorySummary from '../pages/advisory-summary';
import ProcessAnalysis from '../pages/process-analysis';
import ReportingAnalysis from '../pages/reporting-analysis';
import MainLayout from '../shared/layout/MainLayout';
import Admin from '../pages/admin';

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* All pages below share the Header via MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/org-tree" element={<OrgTree />} />
          <Route path="/advisory-summary" element={<AdvisorySummary />} />
          <Route path="/twin-dashboard" element={<ProcessAnalysis />} />
          <Route path="/twin-dashboard/:sensorId" element={<ProcessAnalysis />} />
          <Route path="/reports" element={<ReportingAnalysis />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
