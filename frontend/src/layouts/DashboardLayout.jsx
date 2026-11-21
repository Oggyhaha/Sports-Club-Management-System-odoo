import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TopNavigation from '../components/layout/TopNavigation';
import Breadcrumb from '../components/layout/Breadcrumb';

/**
 * Champions Club - SaaS Dashboard Shell Layout
 * 
 * Provides:
 * - Responsive dark navy sidebar (collapsible on mobile)
 * - Clean top navigation bar with user profile & logout
 * - Contextual breadcrumbs
 * - High-contrast, clean neutral workspace
 */
export const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top App Bar */}
        <TopNavigation
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Breadcrumbs Sub-bar */}
        <div className="bg-white border-b border-slate-200/60 px-4 sm:px-6 lg:px-8 py-2.5">
          <Breadcrumb />
        </div>

        {/* Workspace Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
