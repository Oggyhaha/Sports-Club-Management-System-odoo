import React from 'react';

/**
 * Loading skeleton for Owner Dashboard.
 * Matches KPI card layout to eliminate visual layout shifts.
 */
export const DashboardSkeleton = () => {
  return (
    <div className="space-y-8 animate-pulse" role="status" aria-label="Loading dashboard analytics">
      {/* Skeleton Toolbar */}
      <div className="h-28 bg-slate-200/60 rounded-xl" />

      {/* Financial Section Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-56 bg-slate-200/70 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200/60 rounded-xl p-4 space-y-3">
              <div className="h-3 w-28 bg-slate-300/60 rounded" />
              <div className="h-7 w-36 bg-slate-300/80 rounded" />
              <div className="h-2.5 w-20 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Memberships & Bookings Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-56 bg-slate-200/70 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200/60 rounded-xl p-3 space-y-2">
              <div className="h-3 w-20 bg-slate-300/60 rounded" />
              <div className="h-6 w-16 bg-slate-300/80 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 bg-slate-200/60 rounded-xl" />
          <div className="h-64 bg-slate-200/60 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
