import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Calendar,
  Plus,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  User,
  ShieldAlert,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import payrollService from '../../services/payrollService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ROLES } from '../../config/constants';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatters';

export const PayrollPage = () => {
  const { roles } = useAuth();
  const { showToast } = useToast();
  const canManageHR = roles.includes(ROLES.OWNER) || roles.includes(ROLES.HR_STAFF);

  // Active Tab: 'admin' (runs & disbursements) vs 'my_payslips' (self-service)
  const [activeTab, setActiveTab] = useState(canManageHR ? 'admin' : 'my_payslips');

  // Admin Payroll State
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Self-Service Payslips State
  const [myPayslips, setMyPayslips] = useState([]);
  const [loadingMyPayslips, setLoadingMyPayslips] = useState(false);
  const [unlinkedEmployee, setUnlinkedEmployee] = useState(false);

  // Create Period Modal
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [periodName, setPeriodName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [submittingPeriod, setSubmittingPeriod] = useState(false);

  // Process Confirmation
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Disburse Modal
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [disburseAmount, setDisburseAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [submittingDisburse, setSubmittingDisburse] = useState(false);
  const [disburseError, setDisburseError] = useState('');

  // Payslip Modal
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [activePayslipEntry, setActivePayslipEntry] = useState(null);

  // Load Administrative Runs & Periods
  const loadAdminData = useCallback(async () => {
    if (!canManageHR) return;
    setLoading(true);
    try {
      const [periodsData, runsData] = await Promise.all([
        payrollService.getPeriods(),
        payrollService.getRuns(),
      ]);
      setPeriods(periodsData || []);
      setRuns(runsData || []);

      if (runsData && runsData.length > 0) {
        const latestRun = runsData[0];
        // Fetch full run details by ID to get embedded entries and components
        const fullRun = await payrollService.getRunById(latestRun.id);
        setSelectedRun(fullRun);
        setEntries(fullRun.entries || []);
      } else {
        setSelectedRun(null);
        setEntries([]);
      }
    } catch (err) {
      console.error('Failed to load payroll data:', err);
      showToast?.('Failed to load payroll records.', 'error');
    } finally {
      setLoading(false);
    }
  }, [canManageHR, showToast]);

  // Load Self-Service Payslips
  const loadMyPayslips = useCallback(async () => {
    setLoadingMyPayslips(true);
    setUnlinkedEmployee(false);
    try {
      const data = await payrollService.getMyPayslips();
      setMyPayslips(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.response?.status === 404) {
        setUnlinkedEmployee(true);
      } else {
        console.error('Failed to load my payslips:', err);
        showToast?.('Unable to load personal payslips.', 'error');
      }
    } finally {
      setLoadingMyPayslips(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (activeTab === 'admin' && canManageHR) {
      loadAdminData();
    } else {
      loadMyPayslips();
    }
  }, [activeTab, canManageHR, loadAdminData, loadMyPayslips]);

  const handleSelectRun = async (runId) => {
    try {
      setLoading(true);
      const fullRun = await payrollService.getRunById(runId);
      setSelectedRun(fullRun);
      setEntries(fullRun.entries || []);
    } catch (err) {
      console.error('Failed to load payroll entries for selected run:', err);
      showToast?.('Failed to load payroll run details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    if (!periodName || !periodStart || !periodEnd) return;
    setSubmittingPeriod(true);

    try {
      await payrollService.createPeriod({
        period_name: periodName.trim(),
        start_date: periodStart,
        end_date: periodEnd,
      });
      showToast?.('Payroll period created successfully!', 'success');
      setIsPeriodModalOpen(false);
      setPeriodName('');
      setPeriodStart('');
      setPeriodEnd('');
      loadAdminData();
    } catch (err) {
      console.error('Create period error:', err);
      showToast?.(err.response?.data?.detail || 'Failed to create payroll period.', 'error');
    } finally {
      setSubmittingPeriod(false);
    }
  };

  const handleCreateDraftRun = async () => {
    const periodIdToUse = selectedPeriodId || periods[0]?.id;
    if (!periodIdToUse) {
      showToast?.('Please create a payroll period first.', 'error');
      return;
    }

    try {
      setLoading(true);
      const newRun = await payrollService.createRun({
        payroll_period_id: periodIdToUse,
        notes: `Calculated on ${formatDate(new Date())}`,
      });
      showToast?.(`Payroll run ${newRun.run_number} calculated!`, 'success');
      await loadAdminData();
      if (newRun.id) {
        handleSelectRun(newRun.id);
      }
    } catch (err) {
      console.error('Run creation error:', err);
      showToast?.(err.response?.data?.detail || 'Failed to initialize payroll run.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewRun = async () => {
    if (!selectedRun) return;
    try {
      const updated = await payrollService.reviewRun(selectedRun.id);
      showToast?.(`Payroll run ${updated.run_number} moved to Under Review.`, 'success');
      handleSelectRun(selectedRun.id);
    } catch (err) {
      console.error('Review run error:', err);
      showToast?.(err.response?.data?.detail || 'Failed to submit run for review.', 'error');
    }
  };

  const handleProcessRun = async () => {
    if (!selectedRun) return;
    setProcessing(true);
    try {
      const processed = await payrollService.processRun(selectedRun.id);
      showToast?.(`Payroll run ${processed.run_number} processed! Payslips locked.`, 'success');
      setProcessModalOpen(false);
      handleSelectRun(selectedRun.id);
    } catch (err) {
      console.error('Process run error:', err);
      showToast?.(err.response?.data?.detail || 'Processing payroll run failed.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDisburseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEntry || !disburseAmount) return;
    setSubmittingDisburse(true);
    setDisburseError('');

    try {
      const amt = Number(disburseAmount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error('Please enter a valid disbursement amount greater than zero.');
      }

      await payrollService.disburseEntry(selectedEntry.id, {
        amount: amt,
        disbursement_method: paymentMethod,
        disbursement_date: new Date().toISOString().split('T')[0],
        idempotency_key: `DISB-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        notes: paymentReference.trim() || null,
      });

      showToast?.('Salary disbursement recorded successfully!', 'success');
      setDisburseModalOpen(false);
      setSelectedEntry(null);
      if (selectedRun) {
        handleSelectRun(selectedRun.id);
      }
    } catch (err) {
      console.error('Disbursement error:', err);
      setDisburseError(err.response?.data?.detail || err.message || 'Disbursement failed.');
    } finally {
      setSubmittingDisburse(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Payroll Operations & Salary Disbursements"
        subtitle="Monthly payroll calculations, review pipeline, payslip issuance, and bank disbursements."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'HR & Payroll' }]}
        actions={
          canManageHR && activeTab === 'admin' ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPeriodName(`Month of ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}`);
                  setIsPeriodModalOpen(true);
                }}
                leftIcon={Calendar}
              >
                New Period
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateDraftRun} leftIcon={Plus}>
                Calculate Payroll Run
              </Button>
            </div>
          ) : null
        }
      />

      {/* Navigation Tabs */}
      {canManageHR && (
        <div className="flex border-b border-slate-200 gap-4">
          <button
            onClick={() => setActiveTab('admin')}
            className={`pb-3 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'admin'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Payroll Administration & Runs
          </button>
          <button
            onClick={() => setActiveTab('my_payslips')}
            className={`pb-3 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'my_payslips'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            My Personal Payslips
          </button>
        </div>
      )}

      {/* ----------------- ADMIN TAB ----------------- */}
      {activeTab === 'admin' && canManageHR && (
        <>
          {/* Run Selection & Overview Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 md:col-span-1">
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Select Payroll Run
              </label>
              {runs.length === 0 ? (
                <p className="text-xs text-slate-400">No payroll runs yet. Calculate one to begin.</p>
              ) : (
                <select
                  value={selectedRun?.id || ''}
                  onChange={(e) => handleSelectRun(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                >
                  {runs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.run_number} ({r.status.toUpperCase()}) — {formatDate(r.created_at)}
                    </option>
                  ))}
                </select>
              )}
            </Card>

            {selectedRun && (
              <div className="md:col-span-2 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{selectedRun.run_number}</h3>
                      <StatusBadge status={selectedRun.status} />
                    </div>
                    <p className="text-2xs text-slate-500 mt-0.5">
                      Gross: <strong className="font-mono text-slate-700">{formatCurrency(selectedRun.total_gross)}</strong> • Deductions: <strong className="font-mono text-rose-600">-{formatCurrency(selectedRun.total_deductions)}</strong> • Net Payable: <strong className="font-mono text-slate-900">{formatCurrency(selectedRun.total_net)}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedRun.status === 'draft' && (
                    <Button variant="outline" size="sm" onClick={handleReviewRun}>
                      Submit for Review →
                    </Button>
                  )}

                  {selectedRun.status === 'under_review' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setProcessModalOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Finalize & Process Payslips ✓
                    </Button>
                  )}

                  {selectedRun.status === 'processed' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-2xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Locked & Processed
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payroll Entries Table */}
          <Card
            title={selectedRun ? `Staff Payslip Ledger (${selectedRun.run_number})` : 'Payroll Entries'}
            subtitle="Individual employee gross earnings, deductions, snapshots and disbursement progress"
            noPadding
          >
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">Loading payroll entries...</div>
            ) : entries.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No entries generated. Calculate a new payroll run above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-4">Staff Member</th>
                      <th className="py-2.5 px-4">Role / Department</th>
                      <th className="py-2.5 px-4 text-right">Gross Earnings</th>
                      <th className="py-2.5 px-4 text-right">Deductions</th>
                      <th className="py-2.5 px-4 text-right">Net Payable</th>
                      <th className="py-2.5 px-4 text-right">Disbursed</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((ent) => {
                      const outstanding = Number(ent.net_payable) - Number(ent.amount_disbursed || 0);
                      const isFullyPaid = outstanding <= 0 || ent.payment_status === 'paid';

                      return (
                        <tr key={ent.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{ent.employee_name_snapshot}</p>
                            <p className="text-3xs text-slate-400 font-mono">{ent.employee_code_snapshot}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <p>{ent.designation_snapshot || 'Staff'}</p>
                            <p className="text-3xs text-slate-400">{ent.department_snapshot || 'General'}</p>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                            {formatCurrency(ent.gross_earnings)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-rose-700">
                            -{formatCurrency(ent.total_deductions)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(ent.net_payable)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-700">
                            {formatCurrency(ent.amount_disbursed || 0)}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={ent.payment_status || (isFullyPaid ? 'paid' : 'pending')} />
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setActivePayslipEntry(ent);
                                setPayslipModalOpen(true);
                              }}
                              leftIcon={FileText}
                            >
                              Components
                            </Button>

                            {selectedRun?.status === 'processed' && !isFullyPaid && canManageHR && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedEntry(ent);
                                  setDisburseAmount(String(Math.max(0, outstanding).toFixed(2)));
                                  setDisburseError('');
                                  setDisburseModalOpen(true);
                                }}
                              >
                                Disburse
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ----------------- SELF-SERVICE MY PAYSLIPS TAB ----------------- */}
      {activeTab === 'my_payslips' && (
        <div className="space-y-4">
          {unlinkedEmployee && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-xs text-amber-900">Account Not Linked to Employee Profile</h4>
                <p className="text-2xs text-amber-700 mt-0.5">
                  Your login account is not linked to an active employee record. Please contact the Club HR
                  administrator to associate your user credentials.
                </p>
              </div>
            </div>
          )}

          <Card
            title="My Payslips History"
            subtitle="Access and review your official monthly club salary statements and component breakdowns"
            noPadding
          >
            {loadingMyPayslips ? (
              <div className="p-12 text-center text-slate-400 text-xs">Loading personal payslips...</div>
            ) : myPayslips.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No issued payslips found for your account.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-4">Payslip #</th>
                      <th className="py-2.5 px-4">Issue Date</th>
                      <th className="py-2.5 px-4 text-right">Gross Earnings</th>
                      <th className="py-2.5 px-4 text-right">Total Deductions</th>
                      <th className="py-2.5 px-4 text-right">Net Payable</th>
                      <th className="py-2.5 px-4 text-right">Amount Disbursed</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myPayslips.map((ps) => {
                      const entry = ps.payroll_entry || {};
                      return (
                        <tr key={ps.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono font-bold text-primary-700">
                            {ps.payslip_number}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {formatDate(ps.generated_at)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700 font-medium">
                            {formatCurrency(entry.gross_earnings)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-rose-700">
                            -{formatCurrency(entry.total_deductions)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(entry.net_payable)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-700">
                            {formatCurrency(entry.amount_disbursed || 0)}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={entry.payment_status || 'paid'} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setActivePayslipEntry(entry);
                                setPayslipModalOpen(true);
                              }}
                              leftIcon={FileText}
                            >
                              Statement
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Disburse Modal */}
      <Modal
        isOpen={disburseModalOpen}
        onClose={() => setDisburseModalOpen(false)}
        title="Record Salary Disbursement"
        subtitle={`Staff: ${selectedEntry?.employee_name_snapshot} (${selectedEntry?.employee_code_snapshot})`}
      >
        <form onSubmit={handleDisburseSubmit} className="space-y-4 text-xs">
          {disburseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
              {disburseError}
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-slate-600">
            <span>Outstanding Net Payable:</span>
            <span className="font-mono font-bold text-slate-900">
              {formatCurrency(
                Math.max(0, Number(selectedEntry?.net_payable || 0) - Number(selectedEntry?.amount_disbursed || 0))
              )}
            </span>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Disbursement Amount (INR) *</label>
            <input
              type="number"
              step="0.01"
              value={disburseAmount}
              onChange={(e) => setDisburseAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Disbursement Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
              >
                <option value="bank_transfer">Direct Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="cheque">Company Cheque</option>
                <option value="cash">Cash Voucher</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">UTR / External Ref / Notes</label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. UTR #928174819"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setDisburseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submittingDisburse}>
              Record Disbursement
            </Button>
          </div>
        </form>
      </Modal>

      {/* Process Run Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={processModalOpen}
        onClose={() => setProcessModalOpen(false)}
        onConfirm={handleProcessRun}
        title="Finalize & Process Payroll Run"
        message="This is an IRREVERSIBLE action. Finalizing will generate immutable employee payslips, lock salary components, and transition the run to final processing."
        confirmText="Finalize & Lock Payslips"
        confirmVariant="danger"
        isLoading={processing}
      />

      {/* Create Period Modal */}
      <Modal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        title="Create Payroll Calendar Period"
        subtitle="Define monthly accounting cycle intervals"
      >
        <form onSubmit={handleCreatePeriod} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Period Name *</label>
            <input
              type="text"
              value={periodName}
              onChange={(e) => setPeriodName(e.target.value)}
              placeholder="e.g. November 2026"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">End Date *</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsPeriodModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submittingPeriod}>
              Create Period
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detailed Payslip Component View Modal */}
      <Modal
        isOpen={payslipModalOpen}
        onClose={() => setPayslipModalOpen(false)}
        title="Employee Payslip Statement"
        subtitle={`Staff: ${activePayslipEntry?.employee_name_snapshot || 'Employee'} (${activePayslipEntry?.employee_code_snapshot || 'EMP'})`}
        size="md"
      >
        {activePayslipEntry && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {activePayslipEntry.employee_name_snapshot}
                </p>
                <p className="text-2xs text-slate-500 font-mono">
                  {activePayslipEntry.employee_code_snapshot} • {activePayslipEntry.designation_snapshot || 'Staff'} ({activePayslipEntry.department_snapshot || 'General'})
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-base font-mono text-slate-900">
                  {formatCurrency(activePayslipEntry.net_payable)}
                </p>
                <p className="text-2xs text-emerald-700 font-semibold">Net Salary</p>
              </div>
            </div>

            {/* Earnings & Deductions Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border border-slate-200 rounded-lg space-y-2">
                <p className="font-bold text-slate-700 border-b pb-1">Earnings Summary</p>
                <div className="flex justify-between">
                  <span>Gross Earnings:</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {formatCurrency(activePayslipEntry.gross_earnings)}
                  </span>
                </div>
              </div>
              <div className="p-3 border border-slate-200 rounded-lg space-y-2">
                <p className="font-bold text-slate-700 border-b pb-1">Deductions Summary</p>
                <div className="flex justify-between text-rose-700">
                  <span>Total Deductions:</span>
                  <span className="font-mono font-semibold">
                    -{formatCurrency(activePayslipEntry.total_deductions)}
                  </span>
                </div>
              </div>
            </div>

            {/* Itemized Salary Components Breakdown */}
            {activePayslipEntry.components && activePayslipEntry.components.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                <p className="font-bold text-slate-700 text-xs border-b pb-1">Itemized Component Breakdown</p>
                <div className="space-y-1.5">
                  {activePayslipEntry.components.map((c) => (
                    <div key={c.id || c.component_name} className="flex justify-between text-2xs py-1 border-b border-slate-100 last:border-b-0">
                      <span className="font-medium text-slate-700">
                        {c.component_name} <span className="text-3xs uppercase text-slate-400">({c.component_type})</span>
                      </span>
                      <span className={`font-mono font-bold ${c.component_type === 'deduction' ? 'text-rose-600' : 'text-slate-900'}`}>
                        {c.component_type === 'deduction' ? '-' : ''}{formatCurrency(c.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setPayslipModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PayrollPage;
