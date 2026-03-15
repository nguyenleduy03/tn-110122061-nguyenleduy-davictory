import React from 'react';
import Navbar from './Navbar';
import '../../styles/dashboard.css';

export default function DashboardLayout({ children }) {
  return (
    <div className="db-root">
      <Navbar />
      <div className="db-layout db-layout-no-sidebar">
        <main className="db-main db-main-full">
          {children}
        </main>
      </div>
    </div>
  );
}
