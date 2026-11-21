import React, { useState, useEffect, useCallback } from 'react';
import { CalendarClock, Plus, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
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

  // Apply Modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyError, setApplyError] = useState('');

  // Review Modal (HR)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [leaveToReview, setLeaveToReview] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve'); // 'approve' | 'reject'
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Cancel Confirmation
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [leaveToCancel, setLeaveToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const { roles } = useAuth();
  const { showToast } = useToast();
  const canApproveHR = roles.includes(ROLES.OWNER) || roles.includes(ROLES.HR_STAFF);

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const data = await leaveService.getLeaves(params);
      setLeaves(data || []);
    } catch (err) {
      showToast?.('Failed to load leave requests.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

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
      await leaveService.applyLeave({
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason,
      });
      showToast?.('Leave application submitted for HR review!', 'success');
      setIsApplyModalOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      loadLeaves();
    } catch (err) {
      setApplyError(err.response?.data?.detail || 'Failed to apply for leave.');
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!leaveToReview) return;
    setSubmittingReview(true);

    try {
      if (reviewAction === 'approve') {
        await leaveService.approveLeave(leaveToReview.id, { review_notes: reviewNotes });
        showToast?.('Leave request approved!', 'success');
      } else {
        await leaveService.rejectLeave(leaveToReview.id, { review_notes: reviewNotes });
        showToast?.('Leave request rejected.', 'info');
      }
      setReviewModalOpen(false);
      setLeaveToReview(null);
      loadLeaves();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Review action failed.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!leaveToCancel) return;
    setCancelling(true);
    try {
      await leaveService.cancelLeave(leaveToCancel.id);
      showToast?.('Leave request cancelled.', 'success');
      setCancelModalOpen(false);
      setLeaveToCancel(null);
      loadLeaves();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to cancel leave.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Leave Management & Approvals"
        subtitle="Staff leave filing, temporal conflict detection, and administrative review queue."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Leaves' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setReason('');
              setApplyError('');
              setIsApplyModalOpen(true);
            }}
            leftIcon={Plus}
          >
            Apply for Leave
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <label className="font-semibold text-slate-600">Filter Queue by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
          >
            <option value="">All Applications</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <Button variant="outline" size="sm" onClick={loadLeaves} isLoading={loading} leftIcon={RefreshCw}>
          Refresh
        </Button>
      </div>

      {/* Leaves Queue Table */}
      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading leave applications...</div>
        ) : leaves.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No leave requests in queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4">Leave Category</th>
                  <th className="py-2.5 px-4">Duration Range</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">
                        {l.employee?.first_name} {l.employee?.last_name}
                      </p>
                      <p className="text-3xs text-slate-400 font-mono">
                        {l.employee?.employee_code || 'EMP'}
                      </p>
                    </td>
                    <td className="py-3 px-4 capitalize font-medium text-slate-700">
                      {l.leave_type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-2xs">
                      {formatDate(l.start_date)} to {formatDate(l.end_date)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-2xs max-w-[200px] truncate">
                      {l.reason || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {canApproveHR && l.status === 'pending' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            className="text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                              setLeaveToReview(l);
                              setReviewAction('approve');
                              setReviewNotes('');
                              setReviewModalOpen(true);
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => {
                              setLeaveToReview(l);
                              setReviewAction('reject');
                              setReviewNotes('');
                              setReviewModalOpen(true);
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      )}

                      {l.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-rose-600 text-xs"
                          onClick={() => {
                            setLeaveToCancel(l);
                            setCancelModalOpen(true);
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
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
        subtitle="Submit dates with automated overlap conflict verification"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
          {applyError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
              {applyError}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Leave Category *</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
              required
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
            <label className="block font-medium text-slate-700 mb-1">Application Reason</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Attending family wedding."
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

      {/* Review Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={`${reviewAction === 'approve' ? 'Approve' : 'Reject'} Leave Application`}
        subtitle={`Staff: ${leaveToReview?.employee?.first_name} ${leaveToReview?.employee?.last_name}`}
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">HR Review Notes</label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="e.g. Approved. Relief coach assigned to cover evening shift."
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
              Confirm {reviewAction === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation */}
      <ConfirmationDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Leave Application"
        message="Are you sure you want to withdraw this leave application?"
        confirmText="Withdraw Application"
        confirmVariant="danger"
        isLoading={cancelling}
      />
    </div>
  );
};

export default LeavesPage;
