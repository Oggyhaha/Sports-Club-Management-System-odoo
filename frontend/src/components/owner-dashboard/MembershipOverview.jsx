import React from 'react';
import { Users, UserCheck, UserPlus, RefreshCw, Award } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import DashboardSection from './DashboardSection';
import MetricCard from './MetricCard';
import Card from '../common/Card';
import EmptyState from '../feedback/EmptyState';

const BAR_COLORS = ['#0284c7', '#38bdf8', '#0ea5e9', '#0369a1', '#7dd3fc'];

export const MembershipOverview = ({ memberships }) => {
  if (!memberships) return null;

  const {
    total_registered_members,
    active_members,
    inactive_members,
    active_subscriptions,
    expired_subscriptions,
    new_registrations_in_period,
    renewals_in_period,
    plan_distribution = [],
  } = memberships;

  const chartData = plan_distribution.map((p) => ({
    name: p.plan_name,
    count: p.active_member_count,
  }));

  const totalInPlans = plan_distribution.reduce((acc, curr) => acc + curr.active_member_count, 0);

  return (
    <DashboardSection
      icon={Users}
      title="Membership Growth & Distribution"
      subtitle="Member lifecycle states and tier breakdown"
      badge="Live Roster"
    >
      {/* Membership KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Total Registered"
          value={total_registered_members}
          subtitle="Cumulative registrations"
          typeBadge="All-Time"
          icon={Users}
        />
        <MetricCard
          title="Active Members"
          value={active_members}
          subtitle={`${inactive_members ?? 0} inactive`}
          typeBadge="Current Snapshot"
          icon={UserCheck}
        />
        <MetricCard
          title="Active Subscriptions"
          value={active_subscriptions}
          subtitle={`${expired_subscriptions ?? 0} expired`}
          typeBadge="Current Snapshot"
          icon={Award}
        />
        <MetricCard
          title="New in Period"
          value={new_registrations_in_period}
          subtitle="New signups"
          typeBadge="Period"
          icon={UserPlus}
        />
        <MetricCard
          title="Renewals in Period"
          value={renewals_in_period}
          subtitle="Subscription renewals"
          typeBadge="Period"
          icon={RefreshCw}
        />
        <MetricCard
          title="Inactive Members"
          value={inactive_members}
          subtitle="Pending / suspended"
          typeBadge="Current Snapshot"
          icon={Users}
        />
      </div>

      {/* Plan Distribution Chart & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2">
          <Card title="Plan Distribution" subtitle="Active members across membership plans">
            {chartData.length > 0 ? (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      interval={0}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <Tooltip
                      formatter={(val) => [`${val} members`, 'Active Members']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={BAR_COLORS[index % BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No active plan subscriptions"
                description="No members are currently enrolled in active subscription plans."
              />
            )}
          </Card>
        </div>

        <div>
          <Card title="Tier Breakdown" subtitle="Roster allocation share">
            {plan_distribution.length > 0 ? (
              <div className="space-y-3">
                {plan_distribution.map((plan, idx) => {
                  const sharePercent = totalInPlans > 0
                    ? ((plan.active_member_count / totalInPlans) * 100).toFixed(1)
                    : 0;
                  return (
                    <div key={plan.plan_id || idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{plan.plan_name}</span>
                        <span className="text-slate-600 font-mono">
                          {plan.active_member_count} ({sharePercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${sharePercent}%`,
                            backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No plans" description="No membership tiers defined." />
            )}
          </Card>
        </div>
      </div>
    </DashboardSection>
  );
};

export default MembershipOverview;
