import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';

export const DashboardLayout = ({ title }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full max-w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors">
      <Sidebar isMobileOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <Topbar
          title={title}
          isMobileOpen={isMobileOpen}
          onMenuClick={() => setIsMobileOpen((prev) => !prev)}
        />
        <main className="flex-1 p-3.5 sm:p-6 pb-20 md:pb-6 overflow-y-auto">
          <Outlet />
        </main>
        <MobileBottomNav onMenuClick={() => setIsMobileOpen(true)} />
      </div>
    </div>
  );
};


export default DashboardLayout;
