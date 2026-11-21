import React from 'react';
import { ShoppingBag, Package, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';

export const ShopDashboardPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pro Shop Counter & Inventory"
        description="Sports gear sales, shared stock ledger, and inventory audits"
        badge="Shop Staff"
      />

      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900 leading-relaxed">
          <p className="font-semibold">Shop Counter Shell Established</p>
          <p className="mt-0.5 text-sky-700">
            Real-time counter POS interface, inventory audits, and low-stock alerts are defined in backend Milestone D contracts and will be connected in future UI implementation phases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Shop Responsibilities" subtitle="Shared Inventory System">
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Counter Point-of-Sale (POS)</span>
              <StatusBadge status="active" label="Ready" />
            </li>
            <li className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Shared Stock Control</span>
              <StatusBadge status="active" label="Ready" />
            </li>
            <li className="flex items-center justify-between py-1">
              <span>Inventory Adjustments & Tracking</span>
              <StatusBadge status="active" label="Ready" />
            </li>
          </ul>
        </Card>

        <Card title="Inventory Architecture Rule" subtitle="Zero-Negative Stock Policy">
          <p className="text-xs text-slate-600 leading-relaxed">
            All shop counter sales, online orders, and cafeteria consumables share an immutable inventory transactions log. Items cannot be sold if stock is zero, preventing negative balances.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default ShopDashboardPage;
