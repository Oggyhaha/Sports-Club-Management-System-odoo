import React from 'react';
import { CalendarCheck, Clock, Percent, ShieldAlert, Activity, UserPlus } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import DashboardSection from './DashboardSection';
import MetricCard from './MetricCard';
import Card from '../common/Card';
import DashboardDisclaimer from './DashboardDisclaimer';
import EmptyState from '../feedback/EmptyState';

export const BookingOverview = ({ bookings }) => {
  if (!bookings) return null;

  const {
    total_bookings,
    confirmed_bookings,
    cancelled_bookings,
    cancellation_rate_percent,
    walk_in_bookings,
    walk_in_ratio_percent,
    social_play_sessions,
    social_play_participants,
    total_booked_hours,
    total_available_hours,
    overall_court_utilization_percent,
    court_details = [],
    peak_hours = [],
  } = bookings;

  const peakHourData = peak_hours.map((p) => ({
    hour: p.hour_slot,
    bookings: p.booking_count,
  }));

  return (
    <DashboardSection
      icon={CalendarCheck}
      title="Court Operations & Utilization Analytics"
      subtitle="Court occupancy, reservation velocity, walk-in demand, and peak hours"
      badge="06:00–22:00 IST Window"
    >
      {/* Booking KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard
          title="Total Bookings"
          value={total_bookings}
          subtitle="All reservations"
          typeBadge="Period"
          icon={CalendarCheck}
        />
        <MetricCard
          title="Confirmed"
          value={confirmed_bookings}
          subtitle="Fulfilled slots"
          typeBadge="Period"
          icon={Activity}
        />
        <MetricCard
          title="Cancelled"
          value={cancelled_bookings}
          subtitle="Voided slots"
          typeBadge="Period"
          icon={ShieldAlert}
          alert={cancelled_bookings > 0}
        />
        <MetricCard
          title="Cancellation Rate"
          value={`${Number(cancellation_rate_percent || 0).toFixed(1)}%`}
          subtitle="Cancelled / Total"
          typeBadge="Period"
          icon={Percent}
        />
        <MetricCard
          title="Walk-Ins"
          value={walk_in_bookings}
          subtitle="Reception desk"
          typeBadge="Period"
          icon={UserPlus}
        />
        <MetricCard
          title="Walk-In Ratio"
          value={`${Number(walk_in_ratio_percent || 0).toFixed(1)}%`}
          subtitle="Walk-in / Total"
          typeBadge="Period"
          icon={Percent}
        />
        <MetricCard
          title="Booked Hours"
          value={`${Number(total_booked_hours || 0).toFixed(1)}h`}
          subtitle={`Avail: ${Number(total_available_hours || 0).toFixed(0)}h`}
          typeBadge="Period"
          icon={Clock}
        />
        <MetricCard
          title="Court Utilization"
          value={`${Number(overall_court_utilization_percent || 0).toFixed(1)}%`}
          subtitle="Confirmed / Cap"
          typeBadge="Period"
          icon={Activity}
          className="border-sky-300 bg-sky-50/20"
        />
      </div>

      {/* Methodology Notice */}
      <div className="mt-3">
        <DashboardDisclaimer
          title="Court Utilization Methodology (16h Daily Capacity)"
          message="Court utilization rate is computed as: Confirmed Booked Hours ÷ (Active Courts × Days in Period × 16 hours) × 100 based on standard club operating hours of 06:00–22:00 IST. The denominator reflects current active courts; historical additions/deactivations are subject to current inventory."
          variant="info"
        />
      </div>

      {/* Peak Hours & Court Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Peak Hours Chart */}
        <Card
          title="Peak Hours Traffic"
          subtitle="Booking count distribution across operating hours"
        >
          {peakHourData.length > 0 ? (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHourData} margin={{ top: 10, right: 15, left: -15, bottom: 20 }}>
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip
                    formatter={(val) => [`${val} bookings`, 'Volume']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="bookings" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No booking activity"
              description="No bookings recorded during the selected reporting window."
            />
          )}
        </Card>

        {/* Court Utilization Breakdown */}
        <Card
          title="Court Utilization Breakdown"
          subtitle="Hours booked per facility during period"
          noPadding
        >
          {court_details.length > 0 ? (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              <div className="grid grid-cols-4 px-4 py-2 bg-slate-50 text-2xs font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                <span className="col-span-2">Court & Sport</span>
                <span className="text-right">Booked</span>
                <span className="text-right">Utilization</span>
              </div>
              {court_details.map((court, idx) => (
                <div
                  key={court.court_id || idx}
                  className="grid grid-cols-4 px-4 py-2.5 text-xs items-center hover:bg-slate-50/70"
                >
                  <div className="col-span-2">
                    <p className="font-semibold text-slate-900">{court.court_name}</p>
                    <p className="text-2xs text-slate-500 capitalize">{court.sport_type}</p>
                  </div>
                  <div className="text-right text-slate-700 font-mono">
                    {Number(court.booked_hours).toFixed(1)}h
                  </div>
                  <div className="text-right font-semibold font-mono text-slate-900">
                    {Number(court.utilization_percent).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No courts recorded"
                description="No active courts found in club roster."
              />
            </div>
          )}
        </Card>
      </div>
    </DashboardSection>
  );
};

export default BookingOverview;
