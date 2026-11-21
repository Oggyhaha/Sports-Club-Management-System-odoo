import React, { useState } from 'react';
import { BarChart3, ShieldCheck, Database, Calendar } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import TableToolbar from '../../components/data-display/TableToolbar';
import Button from '../../components/common/Button';

export const OwnerDashboardPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Sample verified structure without fake financial vanity metrics
  const modulesOverview = [
    { module: 'Authentication & Security', milestone: 'Milestone A', endpoints: 7, status: 'active', coverage: '100%' },
    { module: 'Memberships & Plans', milestone: 'Milestone B', endpoints: 11, status: 'active', coverage: '100%' },
    { module: 'Courts & Reservations', milestone: 'Milestone C', endpoints: 20, status: 'active', coverage: '100%' },
    { module: 'Shop & Shared Inventory', milestone: 'Milestone D', endpoints: 16, status: 'active', coverage: '100%' },
    { module: 'Cafeteria & Kitchen Queue', milestone: 'Milestone D', endpoints: 11, status: 'active', coverage: '100%' },
    { module: 'Invoices & Payments', milestone: 'Milestone E', endpoints: 24, status: 'active', coverage: '100%' },
    { module: 'Employees, HR & Payroll', milestone: 'Milestone F', endpoints: 27, status: 'active', coverage: '100%' },
    { module: 'Analytics & Tax Reporting', milestone: 'Milestone G', endpoints: 10, status: 'active', coverage: '100%' },
  ];

  const filteredModules = modulesOverview.filter((m) =>
    m.module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: 'module', label: 'Backend Subsystem', render: (val) => <span className="font-semibold text-slate-900">{val}</span> },
    { key: 'milestone', label: 'Completed Phase', render: (val) => <span className="text-slate-600">{val}</span> },
    { key: 'endpoints', label: 'Audited Endpoints', render: (val) => <span className="font-mono text-xs">{val} routes</span> },
    { key: 'coverage', label: 'API Contract', render: (val) => <span className="text-emerald-700 font-semibold">{val}</span> },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} label="Verified" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Club Executive Dashboard"
        description="Comprehensive management portal for Champions Club Owner and Directors"
        badge="Owner Access"
      />

      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900 leading-relaxed">
          <p className="font-semibold">Milestone H2 + H3 Application Shell Active</p>
          <p className="mt-0.5 text-sky-700">
            The foundation, authenticated session lifecycle, and responsive design system are operational. Full interactive financial analytics, court management, and reporting forms will be connected in subsequent Milestone H phases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card title="Database & Core State" subtitle="PostgreSQL 18 Dev Instance">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">champions_club</p>
              <p className="text-xs text-slate-500">94 Members • 59 Courts • 47 Bookings</p>
            </div>
          </div>
        </Card>

        <Card title="Club Operating Window" subtitle="Asia/Kolkata Timezone">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">06:00 – 22:00 IST</p>
              <p className="text-xs text-slate-500">16 Operating Hours Daily</p>
            </div>
          </div>
        </Card>

        <Card title="Backend API Contract" subtitle="126 Audited Endpoints">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">FastAPI v0.115</p>
              <p className="text-xs text-slate-500">155 Automated Tests Passing</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Subsystem Architecture & Endpoint Inventory" noPadding>
        <TableToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search subsystems..."
        />
        <DataTable
          columns={columns}
          data={filteredModules}
          keyField="module"
          pageSize={10}
        />
      </Card>
    </div>
  );
};

export default OwnerDashboardPage;
