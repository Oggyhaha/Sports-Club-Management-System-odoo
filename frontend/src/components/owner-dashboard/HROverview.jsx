import React from 'react';
import { UserCog, CalendarClock, CreditCard, CheckCircle2, Clock } from 'lucide-react';
import DashboardSection from './DashboardSection';
import MetricCard from './MetricCard';
import Card from '../common/Card';
import EmptyState from '../feedback/EmptyState';
import { formatCurrency } from '../../utils/formatters';

export const HROverview = ({ hr }) => {
  if (!hr) return null;

  const {
    total_employees,
    active_employees,
    employees_on_leave,
    department_distribution = [],
    attendance_records_count,
    present_records_count,
    leave_requests_count,
    approved_leaves_count,
    payroll_runs_in_period,
    payroll_total_net_payable,
    payroll_total_disbursed,
    payroll_outstanding_liability,
  } = hr;

  const totalAssignedStaff = department_distribution.reduce(
    (acc, d) => acc + d.employee_count,
    0
  );

  return (
    <DashboardSection
      icon={UserCog}
      title="Workforce, Attendance & Payroll Analytics"
      subtitle="Staff headcount, attendance verification, leave records, and aggregate payroll liability"
      badge="Confidential Executive Summary"
    >
      {/* HR & Payroll KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Total Staff"
          value={total_employees}
          subtitle={`${active_employees} active • ${employees_on_leave} on leave`}
          typeBadge="Current Snapshot"
          icon={UserCog}
        />
        <MetricCard
          title="Attendance Records"
          value={attendance_records_count}
          subtitle={`${present_records_count} marked present`}
          typeBadge="Period"
          icon={Clock}
        />
        <MetricCard
          title="Leave Applications"
          value={leave_requests_count}
          subtitle={`${approved_leaves_count} approved`}
          typeBadge="Period"
          icon={CalendarClock}
        />
        <MetricCard
          title="Payroll Net Payable"
          value={formatCurrency(payroll_total_net_payable)}
          subtitle={`${payroll_runs_in_period} payroll runs`}
          typeBadge="Period"
          icon={CreditCard}
        />
        <MetricCard
          title="Payroll Disbursed"
          value={formatCurrency(payroll_total_disbursed)}
          subtitle="Direct bank transfers"
          typeBadge="Period"
          icon={CheckCircle2}
        />
        <MetricCard
          title="Outstanding Liability"
          value={formatCurrency(payroll_outstanding_liability)}
          subtitle="Remaining unpaid payroll"
          typeBadge="Current Snapshot"
          icon={CreditCard}
          alert={Number(payroll_outstanding_liability) > 0}
        />
      </div>

      {/* Department Distribution */}
      <div className="mt-4">
        <Card
          title="Department Workforce Distribution"
          subtitle="Active employee allocations across departments"
          noPadding
        >
          {department_distribution.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 p-4 gap-4">
              {department_distribution.map((dept, idx) => {
                const percent =
                  totalAssignedStaff > 0
                    ? ((dept.employee_count / totalAssignedStaff) * 100).toFixed(0)
                    : 0;
                return (
                  <div key={dept.department_id || idx} className="space-y-1.5 p-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {dept.department_name}
                      </span>
                      <span className="font-mono text-slate-600 font-bold">
                        {dept.employee_count}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-sky-600"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-3xs text-slate-400 text-right">{percent}% of staff</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No department records"
                description="No organizational departments configured."
              />
            </div>
          )}
        </Card>
      </div>
    </DashboardSection>
  );
};

export default HROverview;
