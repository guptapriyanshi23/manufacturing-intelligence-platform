import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../header';

const MainLayout: React.FC = () => {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
};

export default MainLayout;
