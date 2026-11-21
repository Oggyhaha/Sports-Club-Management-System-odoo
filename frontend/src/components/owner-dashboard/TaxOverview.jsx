import React from 'react';
import { Landmark, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import DashboardSection from './DashboardSection';
import MetricCard from './MetricCard';
import Card from '../common/Card';
import DashboardDisclaimer from './DashboardDisclaimer';
import { formatCurrency } from '../../utils/formatters';

export const TaxOverview = ({ tax }) => {
  if (!tax) return null;

  const {
    commerce_tax,
    direct_invoicing_tax,
    total_taxable_turnover,
    total_output_tax_collected,
    statutory_notice,
  } = tax;

  return (
    <DashboardSection
      icon={Landmark}
      title="Statutory Output Tax & GST Overview"
      subtitle="Audited output tax liability with order-invoice deduplication"
      badge="Owner Restricted"
    >
      {/* Core Tax Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Taxable Turnover"
          value={formatCurrency(total_taxable_turnover)}
          subtitle="Combined eligible turnover"
          typeBadge="Period"
          icon={Landmark}
        />
        <MetricCard
          title="Total Output Tax Collected"
          value={formatCurrency(total_output_tax_collected)}
          subtitle="Statutory GST liability"
          typeBadge="Period"
          icon={FileSpreadsheet}
          className="border-sky-300 bg-sky-50/20"
        />
        <MetricCard
          title="Commerce Orders Tax"
          value={formatCurrency(commerce_tax?.tax_collected)}
          subtitle={`Turnover: ${formatCurrency(commerce_tax?.taxable_turnover)}`}
          typeBadge="Period"
          icon={ShieldCheck}
        />
        <MetricCard
          title="Direct Invoices Tax"
          value={formatCurrency(direct_invoicing_tax?.tax_collected)}
          subtitle={`Turnover: ${formatCurrency(direct_invoicing_tax?.taxable_turnover)}`}
          typeBadge="Period"
          icon={ShieldCheck}
        />
      </div>

      {/* Tax Stream Breakdown */}
      <div className="mt-4">
        <Card
          title="Tax Source Deduplication Summary"
          subtitle="Strict non-overlapping calculation from Milestone G reporting backend"
          noPadding
        >
          <div className="divide-y divide-slate-100 text-xs">
            <div className="grid grid-cols-3 px-4 py-2 bg-slate-50 text-2xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Revenue Source</span>
              <span className="text-right">Taxable Turnover</span>
              <span className="text-right">Output GST Collected</span>
            </div>

            <div className="grid grid-cols-3 px-4 py-3 items-center">
              <div>
                <p className="font-semibold text-slate-900">Retail Commerce (Shop & Café)</p>
                <p className="text-2xs text-slate-500">Non-cancelled completed orders</p>
              </div>
              <div className="text-right font-mono text-slate-700">
                {formatCurrency(commerce_tax?.taxable_turnover)}
              </div>
              <div className="text-right font-mono font-semibold text-slate-900">
                {formatCurrency(commerce_tax?.tax_collected)}
              </div>
            </div>

            <div className="grid grid-cols-3 px-4 py-3 items-center">
              <div>
                <p className="font-semibold text-slate-900">Direct Club Invoices</p>
                <p className="text-2xs text-slate-500">Non-order invoices (invoice.order_id IS NULL)</p>
              </div>
              <div className="text-right font-mono text-slate-700">
                {formatCurrency(direct_invoicing_tax?.taxable_turnover)}
              </div>
              <div className="text-right font-mono font-semibold text-slate-900">
                {formatCurrency(direct_invoicing_tax?.tax_collected)}
              </div>
            </div>

            <div className="grid grid-cols-3 px-4 py-3 items-center bg-slate-50 font-bold text-slate-900">
              <div>Consolidated Total</div>
              <div className="text-right font-mono">
                {formatCurrency(total_taxable_turnover)}
              </div>
              <div className="text-right font-mono text-sky-700">
                {formatCurrency(total_output_tax_collected)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Statutory Notice */}
      <div className="mt-3">
        <DashboardDisclaimer
          title="Statutory Notice"
          message={
            statutory_notice ||
            "Summary represents calculated output GST liability from non-cancelled retail orders and direct non-order invoices. Does not constitute an audited GSTR-1 or GSTR-3B tax filing."
          }
          variant="warning"
        />
      </div>
    </DashboardSection>
  );
};

export default TaxOverview;
