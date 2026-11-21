import React from 'react';
import { Briefcase, Receipt, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';

export const CorporateDashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Corporate Client Portal`}
        description="Commercial account ledger, bulk corporate court reservations, and consolidated tax invoices"
        badge="Corporate Account"
      />

      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900 leading-relaxed">
          <p className="font-semibold">Corporate Client Shell Active</p>
          <p className="mt-0.5 text-sky-700">
            Corporate monthly consolidated invoices, GST billing statements, and allocation receipts will be connected in future UI implementation phases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Corporate Account Overview" subtitle="Client Identity">
          <div className="text-xs space-y-2 text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Contact Person:</span>
              <span className="font-semibold text-slate-900">{user?.full_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Registered Email:</span>
              <span className="font-medium text-slate-800">{user?.email}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Account Status:</span>
              <StatusBadge status="active" label="Commercial Active" />
            </div>
          </div>
        </Card>

        <Card title="Corporate Privileges" subtitle="Milestone E Financial Integration">
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>B2B Invoices with GST Breakdown</span>
              <StatusBadge status="issued" label="Configured" />
            </li>
            <li className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Multi-Invoice Payment Allocation</span>
              <StatusBadge status="issued" label="Configured" />
            </li>
            <li className="flex items-center justify-between py-1">
              <span>Corporate Event & Facility Booking</span>
              <StatusBadge status="issued" label="Configured" />
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default CorporateDashboardPage;
