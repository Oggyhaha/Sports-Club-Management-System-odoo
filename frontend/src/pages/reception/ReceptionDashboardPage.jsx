import React from 'react';
import { Calendar, Users, ShieldCheck, Clock } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';

export const ReceptionDashboardPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reception & Front Desk"
        description="Court booking reservations, walk-in check-in, member registration, and social play"
        badge="Reception Staff"
      />

      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900 leading-relaxed">
          <p className="font-semibold">Reception Workspace Shell</p>
          <p className="mt-0.5 text-sky-700">
            Interactive court scheduling grid, walk-in booking creation, and member intake workflows will be wired in future milestone phases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Front Desk Operational Scope" subtitle="Permitted RBAC Roles: receptionist, owner">
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Court Availability Queries</span>
              <StatusBadge status="active" label="Enabled" />
            </li>
            <li className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Member & Walk-in Reservations</span>
              <StatusBadge status="active" label="Enabled" />
            </li>
            <li className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Social Play Sessions Check-In</span>
              <StatusBadge status="active" label="Enabled" />
            </li>
            <li className="flex items-center justify-between py-1">
              <span>Immediate Invoice Payment Processing</span>
              <StatusBadge status="active" label="Enabled" />
            </li>
          </ul>
        </Card>

        <Card title="Shift Operational Notice" subtitle="Standard Working Guidelines">
          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <p>
              Front desk staff handle court reservations from 06:00 to 22:00 IST. Member bookings apply automatic membership discounts when valid.
            </p>
            <p className="text-slate-500">
              Cash, Card, and UPI collections must be confirmed at the counter and immediately marked against generated invoices.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReceptionDashboardPage;
