import React from 'react';
import { CircleDollarSign, ArrowUpRight, ArrowDownRight, Wallet, Receipt, Scale } from 'lucide-react';
import DashboardSection from './DashboardSection';
import MetricCard from './MetricCard';
import DashboardDisclaimer from './DashboardDisclaimer';
import { formatCurrency } from '../../utils/formatters';

export const FinancialOverview = ({ financials }) => {
  if (!financials) return null;

  const {
    invoices_issued_count,
    invoices_issued_value,
    outstanding_receivables,
    payments_received_count,
    gross_customer_collections,
    customer_refunds_count,
    customer_refunds_value,
    net_customer_collections,
    net_allocated_value,
    unallocated_customer_balance,
    payroll_disbursements_count,
    recorded_operating_expenses,
    estimated_operating_surplus,
    surplus_disclaimer,
  } = financials;

  return (
    <DashboardSection
      icon={CircleDollarSign}
      title="Financial & Cash Flow Analytics"
      subtitle="Audited receivables, collections, allocations, and operating disbursements"
      badge="Double-Entry Verified"
    >
      {/* 7 Core Executive Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Invoices Issued */}
        <MetricCard
          title="Invoices Issued Value"
          value={formatCurrency(invoices_issued_value)}
          subtitle={`${invoices_issued_count ?? 0} invoices issued`}
          typeBadge="Period"
          icon={Receipt}
        />

        {/* 2. Outstanding Receivables */}
        <MetricCard
          title="Outstanding Receivables"
          value={formatCurrency(outstanding_receivables)}
          subtitle="Open eligible invoices balance"
          typeBadge="Current Snapshot"
          icon={Wallet}
          alert={Number(outstanding_receivables) > 0}
        />

        {/* 3. Gross Collections */}
        <MetricCard
          title="Gross Customer Collections"
          value={formatCurrency(gross_customer_collections)}
          subtitle={`${payments_received_count ?? 0} successful payments`}
          typeBadge="Period"
          icon={ArrowUpRight}
        />

        {/* 4. Customer Refunds */}
        <MetricCard
          title="Customer Refunds"
          value={formatCurrency(customer_refunds_value)}
          subtitle={`${customer_refunds_count ?? 0} refunds processed`}
          typeBadge="Period"
          icon={ArrowDownRight}
        />

        {/* 5. Net Customer Collections */}
        <MetricCard
          title="Net Customer Collections"
          value={formatCurrency(net_customer_collections)}
          subtitle="Gross collections less refunds"
          typeBadge="Period"
          icon={Wallet}
        />

        {/* 6. Operating Expenses (Staff Payroll) */}
        <MetricCard
          title="Recorded Operating Expenses"
          value={formatCurrency(recorded_operating_expenses)}
          subtitle={`${payroll_disbursements_count ?? 0} payroll disbursements`}
          typeBadge="Period"
          icon={ArrowDownRight}
        />

        {/* 7. Estimated Operating Surplus */}
        <MetricCard
          title="Estimated Operating Surplus"
          value={formatCurrency(estimated_operating_surplus)}
          subtitle="Net collections less staff payroll"
          typeBadge="Period"
          icon={Scale}
          className="border-sky-300 bg-sky-50/30"
        />

        {/* Unallocated Balance & Net Allocated */}
        <MetricCard
          title="Unallocated Customer Balance"
          value={formatCurrency(unallocated_customer_balance)}
          subtitle={`Allocated: ${formatCurrency(net_allocated_value)}`}
          typeBadge="Current Snapshot"
          icon={Wallet}
        />
      </div>

      {/* Mandatory Statutory & Accounting Disclaimer */}
      <div className="mt-4">
        <DashboardDisclaimer
          title="Financial Methodology Disclaimer"
          message={
            surplus_disclaimer ||
            "Estimated operating surplus based on recorded customer collections less staff payroll disbursements. Excludes unrecorded facility rent, utilities, equipment depreciation, and statutory tax obligations."
          }
          variant="info"
        />
      </div>
    </DashboardSection>
  );
};

export default FinancialOverview;
