import React from 'react';
import { Trophy, Calendar, Receipt, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';

export const MemberDashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.full_name || 'Member'}`}
        description="Manage your court reservations, active membership subscriptions, and club activity"
        badge="Club Member Portal"
      />

      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900 leading-relaxed">
          <p className="font-semibold">Member Portal Shell Active</p>
          <p className="mt-0.5 text-sky-700">
            Interactive court booking calendars, membership renewal checkout, and digital invoice receipts will be connected in future milestone phases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="My Account Overview" subtitle="Profile Information">
          <div className="text-xs space-y-2 text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Name:</span>
              <span className="font-semibold text-slate-900">{user?.full_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Email:</span>
              <span className="font-medium text-slate-800">{user?.email}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Membership Status:</span>
              <StatusBadge status="active" label="Standard Member" />
            </div>
          </div>
        </Card>

        <Card title="Club Services Available" subtitle="Self-Service Privileges">
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>View Court Availability Schedule</span>
              <StatusBadge status="confirmed" label="Available" />
            </li>
            <li className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Friday Evening Social Play Sessions</span>
              <StatusBadge status="confirmed" label="Available" />
            </li>
            <li className="flex items-center justify-between py-1">
              <span>Digital Billing & Payment Receipts</span>
              <StatusBadge status="confirmed" label="Available" />
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default MemberDashboardPage;
