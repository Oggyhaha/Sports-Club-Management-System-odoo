import React from 'react';
import { Coffee, Utensils, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';

export const CafeteriaDashboardPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cafeteria & Kitchen Orders Queue"
        description="F&B orders management, kitchen preparation queue, and order fulfillment"
        badge="Cafeteria Staff"
      />

      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900 leading-relaxed">
          <p className="font-semibold">Cafeteria Kitchen Queue Shell</p>
          <p className="mt-0.5 text-sky-700">
            Kitchen order display board and order lifecycle transitions (Pending &rarr; Preparing &rarr; Ready &rarr; Completed) will be connected in future frontend phases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card title="Order Lifecycle Stages" subtitle="Standard F&B Order States">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <span className="font-medium text-slate-800">Pending Order</span>
              <StatusBadge status="pending" />
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <span className="font-medium text-slate-800">Food in Preparation</span>
              <StatusBadge status="preparing" />
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <span className="font-medium text-slate-800">Ready for Counter Pickup</span>
              <StatusBadge status="ready" />
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="font-medium text-slate-800">Order Completed & Handed Over</span>
              <StatusBadge status="completed" />
            </div>
          </div>
        </Card>

        <Card title="Cafeteria Operations Policy" subtitle="Shared Ingredients & Pre-Packaged Items">
          <p className="text-xs text-slate-600 leading-relaxed">
            Consumable beverages and snacks consume product inventory upon order confirmation. Cancellation after food preparation begins is restricted to prevent inventory discrepancy.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default CafeteriaDashboardPage;
