import React from 'react';
import PageHeader from '../../components/layout/PageHeader';
import ErrorState from '../../components/feedback/ErrorState';
import { useOwnerDashboard } from '../../hooks/useOwnerDashboard';

// Subsystem Overview Components
import DashboardToolbar from '../../components/owner-dashboard/DashboardToolbar';
import DashboardSkeleton from '../../components/owner-dashboard/DashboardSkeleton';
import FinancialOverview from '../../components/owner-dashboard/FinancialOverview';
import MembershipOverview from '../../components/owner-dashboard/MembershipOverview';
import BookingOverview from '../../components/owner-dashboard/BookingOverview';
import CommerceOverview from '../../components/owner-dashboard/CommerceOverview';
import HROverview from '../../components/owner-dashboard/HROverview';
import TaxOverview from '../../components/owner-dashboard/TaxOverview';

export const OwnerDashboardPage = () => {
  const {
    filterType,
    startDate,
    endDate,
    customRangeError,
    data,
    loading,
    error,
    lastUpdated,
    isExporting,
    setPreset,
    applyCustomRange,
    refresh,
    exportCsv,
  } = useOwnerDashboard();

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Overview"
        subtitle="Executive overview of Champions Club operations."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Executive Overview' },
        ]}
      />

      {/* Date Filters & Actions Toolbar */}
      <DashboardToolbar
        filterType={filterType}
        period={data?.period}
        startDate={startDate}
        endDate={endDate}
        customRangeError={customRangeError}
        loading={loading}
        lastUpdated={lastUpdated}
        isExporting={isExporting}
        onSelectPreset={setPreset}
        onApplyCustomRange={applyCustomRange}
        onRefresh={refresh}
        onExportCsv={exportCsv}
      />

      {/* Loading State Skeleton */}
      {loading && !data && <DashboardSkeleton />}

      {/* Error State with Retry */}
      {error && !data && (
        <ErrorState
          title="Unable to load Executive Analytics"
          message={error}
          onRetry={refresh}
          retryText="Retry Analytics Sync"
        />
      )}

      {/* Live Data Subsystem Sections */}
      {data && (
        <div className="space-y-10">
          {/* 1. Executive Financial & Cash Flow Analytics */}
          <FinancialOverview financials={data.financials} />

          {/* 2. Membership Growth & Distribution */}
          <MembershipOverview memberships={data.memberships} />

          {/* 3. Court Operations & Utilization */}
          <BookingOverview bookings={data.bookings} />

          {/* 4. Commerce, Food & Inventory */}
          <CommerceOverview commerce={data.commerce} />

          {/* 5. Workforce, Attendance & Payroll */}
          <HROverview hr={data.hr} />

          {/* 6. Output Tax & Statutory Overview */}
          <TaxOverview tax={data.tax} />

          {/* System Footer & Audit Stamp */}
          <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/80 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              Authoritative Engine: <strong>FastAPI v0.115 + PostgreSQL 18</strong>
            </span>
            <span>
              Operating Hours: <strong>06:00 – 22:00 IST (16h/day)</strong> • Timezone: <strong>Asia/Kolkata</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboardPage;
