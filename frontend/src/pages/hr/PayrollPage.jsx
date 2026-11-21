import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Calendar, Plus, RefreshCw, FileText, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
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
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const { roles } = useAuth();
  const { showToast } = useToast();
  const canManageHR = roles.includes(ROLES.OWNER) || roles.includes(ROLES.HR_STAFF);

  const loadData = useCallback(async () => {
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
        setSelectedRun(latestRun);
        const entriesData = await payrollService.getRunEntries(latestRun.id);
        setEntries(entriesData || []);
      }
    } catch (err) {
      showToast?.('Failed to load payroll dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectRun = async (run) => {
    setSelectedRun(run);
    try {
      const entriesData = await payrollService.getRunEntries(run.id);
      setEntries(entriesData || []);
    } catch (err) {
      showToast?.('Failed to load payroll entries for selected run.', 'error');
    }
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    if (!periodName || !periodStart || !periodEnd) return;
    setSubmittingPeriod(true);

    try {
      await payrollService.createPeriod({
        name: periodName,
        start_date: periodStart,
        end_date: periodEnd,
      });
      showToast?.('Payroll period created!', 'success');
      setIsPeriodModalOpen(false);
      loadData();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to create period.', 'error');
    } finally {
      setSubmittingPeriod(false);
    }
  };

  const handleCreateDraftRun = async () => {
    if (!selectedPeriodId && periods.length > 0) {
      setSelectedPeriodId(periods[0].id);
    }
    const periodIdToUse = selectedPeriodId || periods[0]?.id;
    if (!periodIdToUse) {
      showToast?.('Please create a payroll period first.', 'error');
      return;
    }

    try {
      const newRun = await payrollService.createRun({
        payroll_period_id: periodIdToUse,
        name: `Payroll Run - ${formatDate(new Date())}`,
      });
      showToast?.('Draft payroll run calculated!', 'success');
      loadData();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to initialize payroll run.', 'error');
    }
  };

  const handleReviewRun = async () => {
    if (!selectedRun) return;
    try {
      await payrollService.reviewRun(selectedRun.id);
      showToast?.('Payroll run advanced to Under Review status.', 'success');
      loadData();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to advance payroll run.', 'error');
    }
  };

  const handleProcessRun = async () => {
    if (!selectedRun) return;
    setProcessing(true);
    try {
      await payrollService.processRun(selectedRun.id);
      showToast?.('Payroll processed! Employee payslips generated and locked.', 'success');
      setProcessModalOpen(false);
      loadData();
    } catch (err) {
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
      await payrollService.disburseEntry(selectedEntry.id, {
        amount: disburseAmount,
        payment_method: paymentMethod,
        transaction_reference: paymentReference || null,
      });
      showToast?.('Payroll disbursement recorded successfully!', 'success');
      setDisburseModalOpen(false);
      setSelectedEntry(null);
      if (selectedRun) handleSelectRun(selectedRun);
    } catch (err) {
      setDisburseError(err.response?.data?.detail || 'Disbursement failed.');
    } finally {
      setSubmittingDisburse(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Payroll Operations & Salary Disbursements"
        subtitle="Monthly payroll calculations, review pipeline, payslip issuance, and bank disbursements."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Payroll' }]}
        actions={
          canManageHR && (
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
          )
        }
      />

      {/* Active Run Lifecycle Banner */}
      {selectedRun && (
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">{selectedRun.name || 'Monthly Payroll Run'}</h3>
                <StatusBadge status={selectedRun.status} />
              </div>
              <p className="text-2xs text-slate-500 mt-0.5">
                Period: {selectedRun.payroll_period?.name || 'Current'} • Total Net Payable: <strong className="text-slate-900 font-mono">{formatCurrency(selectedRun.total_net_payable)}</strong>
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
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Finalize & Process Payslips ✓
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Payroll Entries Table */}
      <Card
        title={selectedRun ? `Staff Payslip Ledger (${selectedRun.status})` : 'Payroll Entries'}
        subtitle="Individual employee gross earnings, deductions, and disbursement status"
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
                  <th className="py-2.5 px-4 text-right">Gross Earnings</th>
                  <th className="py-2.5 px-4 text-right">Deductions</th>
                  <th className="py-2.5 px-4 text-right">Net Payable</th>
                  <th className="py-2.5 px-4 text-right">Disbursed</th>
                  <th className="py-2.5 px-4">Payment Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((ent) => {
                  const outstanding = Number(ent.net_payable) - Number(ent.amount_disbursed || 0);
                  const isFullyPaid = outstanding <= 0;

                  return (
                    <tr key={ent.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">
                          {ent.employee?.first_name} {ent.employee?.last_name}
                        </p>
                        <p className="text-3xs text-slate-400 font-mono">
                          {ent.employee?.employee_code || 'EMP'}
                        </p>
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
                        <StatusBadge status={isFullyPaid ? 'paid' : 'partially_paid'} />
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
                          Payslip
                        </Button>

                        {selectedRun?.status === 'processed' && !isFullyPaid && canManageHR && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEntry(ent);
                              setDisburseAmount(String(outstanding.toFixed(2)));
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

      {/* Disburse Modal */}
      <Modal
        isOpen={disburseModalOpen}
        onClose={() => setDisburseModalOpen(false)}
        title="Record Salary Disbursement"
        subtitle={`Staff: ${selectedEntry?.employee?.first_name} ${selectedEntry?.employee?.last_name}`}
      >
        <form onSubmit={handleDisburseSubmit} className="space-y-4 text-xs">
          {disburseError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
              {disburseError}
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-slate-600">
            <span>Net Payable Balance:</span>
            <span className="font-mono font-bold text-slate-900">
              {formatCurrency(Number(selectedEntry?.net_payable || 0) - Number(selectedEntry?.amount_disbursed || 0))}
            </span>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Disbursement Amount (INR) *</label>
            <input
              type="text"
              value={disburseAmount}
              onChange={(e) => setDisburseAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Payment Channel *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
              >
                <option value="bank_transfer">Direct Bank Transfer</option>
                <option value="cheque">Company Cheque</option>
                <option value="cash">Cash Voucher</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Transaction UTR / Ref</label>
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
              Record Bank Transfer
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

      {/* Payslip View Modal */}
      <Modal
        isOpen={payslipModalOpen}
        onClose={() => setPayslipModalOpen(false)}
        title="Employee Payslip Record"
        subtitle={`Staff: ${activePayslipEntry?.employee?.first_name} ${activePayslipEntry?.employee?.last_name}`}
        size="md"
      >
        {activePayslipEntry && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {activePayslipEntry.employee?.first_name} {activePayslipEntry.employee?.last_name}
                </p>
                <p className="text-2xs text-slate-500 font-mono">
                  Code: {activePayslipEntry.employee?.employee_code}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-base font-mono text-slate-900">
                  {formatCurrency(activePayslipEntry.net_payable)}
                </p>
                <p className="text-2xs text-emerald-700 font-semibold">Net Pay</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border border-slate-200 rounded-lg space-y-2">
                <p className="font-bold text-slate-700 border-b pb-1">Earnings</p>
                <div className="flex justify-between">
                  <span>Gross Earnings:</span>
                  <span className="font-mono font-semibold">{formatCurrency(activePayslipEntry.gross_earnings)}</span>
                </div>
              </div>
              <div className="p-3 border border-slate-200 rounded-lg space-y-2">
                <p className="font-bold text-slate-700 border-b pb-1">Deductions</p>
                <div className="flex justify-between text-rose-700">
                  <span>Total Deductions:</span>
                  <span className="font-mono font-semibold">-{formatCurrency(activePayslipEntry.total_deductions)}</span>
                </div>
              </div>
            </div>

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
