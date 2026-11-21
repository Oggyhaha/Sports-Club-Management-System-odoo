import React, { useState, useEffect, useCallback } from 'react';
import { CalendarClock, Plus, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import leaveService from '../../services/leaveService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ROLES } from '../../config/constants';
import { formatDate } from '../../utils/formatters';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual / Paid Leave' },
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick / Medical Leave' },
  { value: 'unpaid', label: 'Leave Without Pay (LWP)' },
];

export const LeavesPage = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [noEmployeeProfile, setNoEmployeeProfile] = useState(false);

  // Apply Modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyError, setApplyError] = useState('');

  // Review Modal (HR / Owner)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [leaveToReview, setLeaveToReview] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve'); // 'approve' | 'reject'
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Cancel Confirmation
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [leaveToCancel, setLeaveToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const { roles, user } = useAuth();
  const { showToast } = useToast();
  const canApproveHR = roles.includes(ROLES.OWNER) || roles.includes(ROLES.HR_STAFF);

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    setNoEmployeeProfile(false);
    try {
      if (canApproveHR) {
        const params = {};
        if (statusFilter) params.status = statusFilter;
        const data = await leaveService.getLeaves(params);
        setLeaves(data || []);
      } else {
        const data = await leaveService.getMyLeaves();
        setLeaves(data || []);
      }
    } catch (err) {
      if (err.status === 404 || err.response?.status === 404) {
        setNoEmployeeProfile(true);
      } else {
        showToast?.('Failed to load leave requests.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [canApproveHR, statusFilter, showToast]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setApplyError('Start date and end date are required.');
      return;
    }
    if (endDate < startDate) {
      setApplyError('End date cannot be earlier than start date.');
      return;
    }
    setSubmittingApply(true);
    setApplyError('');

    try {
      // Backend LeaveCreate: { leave_type, start_date, end_date, reason }
      await leaveService.applyLeave({
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason || undefined,
      });
      showToast?.('Leave application submitted for HR review!', 'success');
      setIsApplyModalOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      loadLeaves();
    } catch (err) {
      setApplyError(err.response?.data?.detail || err.message || 'Failed to apply for leave.');
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!leaveToReview) return;
    setSubmittingReview(true);

    try {
      const payload = { review_remarks: reviewNotes || undefined };
      if (reviewAction === 'approve') {
        await leaveService.approveLeave(leaveToReview.id, payload);
        showToast?.('Leave application approved!', 'success');
      } else {
        await leaveService.rejectLeave(leaveToReview.id, payload);
        showToast?.('Leave application rejected.', 'info');
      }
      setReviewModalOpen(false);
      setLeaveToReview(null);
      setReviewNotes('');
      loadLeaves();
    } catch (err) {
      showToast?.(err.response?.data?.detail || err.message || 'Review action failed.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!leaveToCancel) return;
    setCancelling(true);
    try {
      await leaveService.cancelLeave(leaveToCancel.id);
      showToast?.('Leave request cancelled successfully.', 'success');
      setCancelModalOpen(false);
      setLeaveToCancel(null);
      loadLeaves();
    } catch (err) {
      showToast?.(err.response?.data?.detail || err.message || 'Failed to cancel leave.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Leave Management & Applications"
        subtitle={
          canApproveHR
            ? 'Club-wide employee leave requests, approval workflow, and temporal overlap conflicts.'
            : 'Personal leave applications, status tracking, and vacation balance.'
        }
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Leaves' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setStartDate(new Date().toISOString().split('T')[0]);
                setEndDate(new Date().toISOString().split('T')[0]);
                setApplyError('');
                setIsApplyModalOpen(true);
              }}
              disabled={noEmployeeProfile}
              leftIcon={Plus}
            >
              Apply for Leave
            </Button>
            <Button variant="outline" size="sm" onClick={loadLeaves} isLoading={loading} leftIcon={RefreshCw}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Non-linked Account Warning */}
      {noEmployeeProfile && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
          <p className="font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            No Employee Profile Linked
          </p>
          <p className="mt-1 text-amber-800">
            No employee profile is linked to this authenticated user account. Please contact an HR administrator to link your account to apply for employee leaves.
          </p>
        </div>
      )}

      {/* Filter Bar */}
      {canApproveHR && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-600">Filter Queue:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
            >
              <option value="">All Applications</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      )}

      {/* Leaves Table */}
      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading leave requests...</div>
        ) : leaves.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            {canApproveHR ? 'No leave applications in queue.' : 'You have no recorded leave applications.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  {canApproveHR && <th className="py-2.5 px-4">Employee</th>}
                  <th className="py-2.5 px-4">Leave Type</th>
                  <th className="py-2.5 px-4">Date Range</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Applicant Reason</th>
                  <th className="py-2.5 px-4">HR Remarks</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((l) => {
                  const isPending = l.status === 'pending';

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/60">
                      {canApproveHR && (
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {l.employee?.first_name} {l.employee?.last_name}
                          <span className="text-3xs text-slate-400 block font-mono">{l.employee?.employee_code}</span>
                        </td>
                      )}
                      <td className="py-3 px-4 font-semibold text-slate-800 capitalize">
                        {l.leave_type.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {formatDate(l.start_date)} to {formatDate(l.end_date)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={l.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {l.reason || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-2xs italic max-w-xs truncate">
                        {l.review_remarks || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canApproveHR && isPending && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLeaveToReview(l);
                                setReviewAction('approve');
                                setReviewNotes('');
                                setReviewModalOpen(true);
                              }}
                            >
                              Review
                            </Button>
                          )}

                          {isPending && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-rose-600"
                              onClick={() => {
                                setLeaveToCancel(l);
                                setCancelModalOpen(true);
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Employee Leave"
        subtitle="Submit dates and reason for HR administrative review"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
          {applyError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium">
              {applyError}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Leave Category *</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Reason / Notes</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual family vacation, attending doctor appointment"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submittingApply}>
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* HR Review Modal */}
      {canApproveHR && (
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title="Review Leave Application"
          subtitle={`Applicant: ${leaveToReview?.employee?.first_name} ${leaveToReview?.employee?.last_name}`}
        >
          <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <p className="font-semibold text-slate-900">
                {leaveToReview?.leave_type?.toUpperCase()} LEAVE
              </p>
              <p className="text-slate-600 font-mono">
                {formatDate(leaveToReview?.start_date)} to {formatDate(leaveToReview?.end_date)}
              </p>
              {leaveToReview?.reason && (
                <p className="text-slate-500 text-3xs pt-1">Reason: {leaveToReview.reason}</p>
              )}
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Review Decision *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewAction('approve')}
                  className={`p-2.5 rounded-lg border font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    reviewAction === 'approve'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve Leave
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction('reject')}
                  className={`p-2.5 rounded-lg border font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    reviewAction === 'reject'
                      ? 'border-rose-600 bg-rose-50 text-rose-800 shadow-2xs'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <XCircle className="w-4 h-4" /> Reject Leave
                </button>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Remarks / Feedback (Optional)</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Approved. Reliever arranged for front desk."
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={reviewAction === 'approve' ? 'primary' : 'danger'}
                size="sm"
                type="submit"
                isLoading={submittingReview}
              >
                Confirm Decision
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Pending Leave Application"
        message="Are you sure you want to withdraw this leave request? This action will mark the request as cancelled."
        confirmText="Withdraw Application"
        variant="danger"
        isLoading={cancelling}
      />
    </div>
  );
};

export default LeavesPage;
