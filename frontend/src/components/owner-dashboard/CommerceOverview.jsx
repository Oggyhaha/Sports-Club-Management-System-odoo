import React from 'react';
import { ShoppingBag, Coffee, AlertTriangle, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import DashboardSection from './DashboardSection';
import MetricCard from './MetricCard';
import Card from '../common/Card';
import EmptyState from '../feedback/EmptyState';
import { formatCurrency } from '../../utils/formatters';

export const CommerceOverview = ({ commerce }) => {
  if (!commerce) return null;

  const {
    total_orders_count,
    shop_orders_count,
    cafeteria_orders_count,
    cancelled_orders_count,
    completed_orders_value,
    cancelled_orders_value,
    top_selling_products = [],
    low_stock_alerts_count,
    low_stock_products = [],
  } = commerce;

  return (
    <DashboardSection
      icon={ShoppingBag}
      title="Commerce, Food & Inventory Analytics"
      subtitle="Pro shop sales, cafeteria kitchen throughput, and inventory threshold health"
      badge="Retail Operations"
    >
      {/* Commerce KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Total Orders"
          value={total_orders_count}
          subtitle={`Shop: ${shop_orders_count} • Cafe: ${cafeteria_orders_count}`}
          typeBadge="Period"
          icon={ShoppingBag}
        />
        <MetricCard
          title="Completed Sales Value"
          value={formatCurrency(completed_orders_value)}
          subtitle="Fulfilled orders revenue"
          typeBadge="Period"
          icon={CheckCircle}
        />
        <MetricCard
          title="Shop Orders"
          value={shop_orders_count}
          subtitle="Pro shop transactions"
          typeBadge="Period"
          icon={ShoppingBag}
        />
        <MetricCard
          title="Cafeteria Orders"
          value={cafeteria_orders_count}
          subtitle="Kitchen & café tickets"
          typeBadge="Period"
          icon={Coffee}
        />
        <MetricCard
          title="Cancelled Orders"
          value={cancelled_orders_count}
          subtitle={`Lost: ${formatCurrency(cancelled_orders_value)}`}
          typeBadge="Period"
          icon={XCircle}
          alert={cancelled_orders_count > 0}
        />
        <MetricCard
          title="Low Stock Alerts"
          value={low_stock_alerts_count}
          subtitle="Below reorder point"
          typeBadge="Current Snapshot"
          icon={AlertTriangle}
          alert={low_stock_alerts_count > 0}
        />
      </div>

      {/* Top Sellers & Low Stock Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Top Selling Products */}
        <Card
          title="Top Selling Products"
          subtitle="Highest volume items across shop and cafeteria"
          noPadding
        >
          {top_selling_products.length > 0 ? (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              <div className="grid grid-cols-4 px-4 py-2 bg-slate-50 text-2xs font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                <span className="col-span-2">Product</span>
                <span className="text-right">Units</span>
                <span className="text-right">Revenue</span>
              </div>
              {top_selling_products.map((item, idx) => (
                <div
                  key={item.product_id || idx}
                  className="grid grid-cols-4 px-4 py-2.5 text-xs items-center hover:bg-slate-50/70"
                >
                  <div className="col-span-2">
                    <p className="font-semibold text-slate-900">{item.product_name}</p>
                    <p className="text-2xs text-slate-500 capitalize">{item.module_type}</p>
                  </div>
                  <div className="text-right font-mono text-slate-700">
                    {item.total_units_sold}
                  </div>
                  <div className="text-right font-semibold font-mono text-slate-900">
                    {formatCurrency(item.total_sales_value)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={TrendingUp}
                title="No retail sales"
                description="No product sales recorded in the selected period."
              />
            </div>
          )}
        </Card>

        {/* Low Stock Alerts */}
        <Card
          title="Inventory Reorder Watchlist"
          subtitle="Items currently at or below minimum threshold"
          noPadding
        >
          {low_stock_products.length > 0 ? (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              <div className="grid grid-cols-4 px-4 py-2 bg-slate-50 text-2xs font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                <span className="col-span-2">Item & SKU</span>
                <span className="text-right">Stock</span>
                <span className="text-right">Threshold</span>
              </div>
              {low_stock_products.map((prod, idx) => (
                <div
                  key={prod.product_id || idx}
                  className="grid grid-cols-4 px-4 py-2.5 text-xs items-center hover:bg-slate-50/70"
                >
                  <div className="col-span-2">
                    <p className="font-semibold text-slate-900">{prod.product_name}</p>
                    <p className="text-2xs text-slate-500 font-mono">{prod.sku}</p>
                  </div>
                  <div className="text-right font-bold text-amber-700 font-mono">
                    {prod.current_stock}
                  </div>
                  <div className="text-right text-slate-500 font-mono">
                    {prod.reorder_threshold}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={CheckCircle}
                title="Inventory Healthy"
                description="All tracked shop and cafeteria inventory levels are above reorder thresholds."
              />
            </div>
          )}
        </Card>
      </div>
    </DashboardSection>
  );
};

export default CommerceOverview;
