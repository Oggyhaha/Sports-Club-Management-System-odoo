import React from 'react';
import { Users, UserCheck, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';

export const HRDashboardPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Human Resources & Payroll Engine"
        description="Employee lifecycle, daily attendance audits, leave approvals, and monthly salary disbursement"
        badge="HR Staff Access"
      />

      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900 leading-relaxed">
          <p className="font-semibold">HR & Payroll Workspace Shell</p>
          <p className="mt-0.5 text-sky-700">
            Employee directory, attendance correction, leave review modals, and monthly payroll calculation forms will be connected in future milestone phases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="HR Subsystem Modules" subtitle="Backend Milestone F Verified">
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Employee Onboarding & Profiles</span>
              <StatusBadge status="active" label="Available" />
            </li>
            <li className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Biometric / Shift Attendance Logs</span>
              <StatusBadge status="active" label="Available" />
            </li>
            <li className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Leave Application Workflow</span>
              <StatusBadge status="active" label="Available" />
            </li>
            <li className="flex items-center justify-between py-1">
              <span>Salary Structures & Monthly Payroll Runs</span>
              <StatusBadge status="active" label="Available" />
            </li>
          </ul>
        </Card>

        <Card title="Financial Compliance & Immutability" subtitle="Audit Safeguards">
          <p className="text-xs text-slate-600 leading-relaxed">
            Historical payroll entries and approved payslips are strictly immutable once finalized. Partial disbursements cannot exceed net payable amounts.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default HRDashboardPage;
