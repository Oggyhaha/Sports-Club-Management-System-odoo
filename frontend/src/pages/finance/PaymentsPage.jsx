import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  ArrowRightLeft,
  DollarSign,
  AlertCircle,
  FileText,
  Eye,
  Building2,
  Receipt as ReceiptIcon,
} from 'lucide-react';
import financeService from '../../services/financeService';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../config/constants';
import { formatCurrency } from '../../utils/formatters';
import Modal from '../../components/common/Modal';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/forms/Input';

export const PaymentsPage = () => {
  const { user } = useAuth();
  const isOwner = user?.roles?.some((r) => (r.name || r) === ROLES.OWNER);

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modals
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showAllocationsModal, setShowAllocationsModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Record Payment Form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'upi',
    customer_name: 'Club Patron',
    external_reference: '',
    notes: '',
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // Allocation Form State
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [targetInvoiceId, setTargetInvoiceId] = useState('');
  const [allocationAmount, setAllocationAmount] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [allocationError, setAllocationError] = useState(null);

  // Existing Allocations View
  const [allocationsList, setAllocationsList] = useState([]);
  const [loadingAllocations, setLoadingAllocations] = useState(false);

  // Reversal Form State
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [reversalAmount, setReversalAmount] = useState('');
  const [reversalReason, setReversalReason] = useState('');
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [reversalError, setReversalError] = useState(null);

  // Refund Form State
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'all') params.payment_status = statusFilter;
      if (methodFilter !== 'all') params.payment_method = methodFilter;
      const data = await financeService.getPayments(params);
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load payments:', err);
      setError('Unable to load payments ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, methodFilter]);

  const handleOpenRecord = () => {
    setPaymentForm({
      amount: '',
      payment_method: 'upi',
      customer_name: 'Club Patron',
      external_reference: '',
      notes: '',
    });
    setPaymentError(null);
    setShowRecordModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmittingPayment(true);
    setPaymentError(null);
    try {
      const amt = parseFloat(paymentForm.amount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error('Please enter a valid payment amount greater than zero.');
      }
      await financeService.recordPayment(
        {
          amount: amt,
          currency: 'INR',
          payment_method: paymentForm.payment_method,
          external_reference: paymentForm.external_reference.trim() || null,
          notes: paymentForm.notes.trim() || null,
        },
        paymentForm.customer_name.trim() || 'Club Patron'
      );
      setShowRecordModal(false);
      fetchPayments();
    } catch (err) {
      console.error('Record payment error:', err);
      setPaymentError(err.response?.data?.detail || err.message || 'Failed to record payment.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Open Allocation Modal
  const handleOpenAllocate = async (payment) => {
    setSelectedPayment(payment);
    setAllocationAmount(String(payment.unallocated_amount || ''));
    setAllocationError(null);
    setShowAllocateModal(true);
    try {
      setLoadingInvoices(true);
      const allInvs = await financeService.getInvoices();
      const openInvs = (Array.isArray(allInvs) ? allInvs : []).filter(
        (i) => i.invoice_status === 'issued' || i.invoice_status === 'partially_paid'
      );
      setInvoices(openInvs);
      if (openInvs.length > 0) {
        setTargetInvoiceId(openInvs[0].id);
      }
    } catch (e) {
      console.error('Failed to load open invoices:', e);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleExecuteAllocation = async (e) => {
    e.preventDefault();
    if (!selectedPayment || !targetInvoiceId) return;
    setAllocating(true);
    setAllocationError(null);
    try {
      const amt = parseFloat(allocationAmount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error('Please specify a positive allocation amount.');
      }
      if (amt > Number(selectedPayment.unallocated_amount)) {
        throw new Error('Allocation cannot exceed available unallocated balance.');
      }

      await financeService.allocatePayment(selectedPayment.id, {
        invoice_id: targetInvoiceId,
        amount: amt,
      });

      setShowAllocateModal(false);
      setSelectedPayment(null);
      fetchPayments();
    } catch (err) {
      console.error('Allocation error:', err);
      setAllocationError(err.response?.data?.detail || err.message || 'Failed to allocate payment.');
    } finally {
      setAllocating(false);
    }
  };

  // View Payment Allocations / Statement
  const handleViewAllocations = async (payment) => {
    setSelectedPayment(payment);
    setShowAllocationsModal(true);
    try {
      setLoadingAllocations(true);
      const allocs = await financeService.getPaymentAllocations(payment.id);
      setAllocationsList(Array.isArray(allocs) ? allocs : []);
    } catch (err) {
      console.error('Failed to load allocations:', err);
      setAllocationsList([]);
    } finally {
      setLoadingAllocations(false);
    }
  };

  // Open Reversal Modal
  const handleOpenReverse = (alloc) => {
    setSelectedAllocation(alloc);
    setReversalAmount(String(alloc.net_allocated_amount || alloc.allocated_amount));
    setReversalReason('');
    setReversalError(null);
    setShowReverseModal(true);
  };

  const handleExecuteReversal = async (e) => {
    e.preventDefault();
    if (!selectedAllocation) return;
    setReversing(true);
    setReversalError(null);
    try {
      const amt = parseFloat(reversalAmount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error('Please enter a valid reversal amount.');
      }
      if (!reversalReason.trim() || reversalReason.trim().length < 3) {
        throw new Error('Reversal reason must be at least 3 characters.');
      }

      await financeService.reverseAllocation(selectedAllocation.id, {
        amount: amt,
        reason: reversalReason.trim(),
      });

      setShowReverseModal(false);
      setSelectedAllocation(null);
      // Refresh allocations list and payments
      if (selectedPayment) {
        const allocs = await financeService.getPaymentAllocations(selectedPayment.id);
        setAllocationsList(Array.isArray(allocs) ? allocs : []);
      }
      fetchPayments();
    } catch (err) {
      console.error('Reversal error:', err);
      setReversalError(err.response?.data?.detail || err.message || 'Failed to reverse allocation.');
    } finally {
      setReversing(false);
    }
  };

  // Open Refund Modal
  const handleOpenRefund = (payment) => {
    setSelectedPayment(payment);
    setRefundAmount(String(payment.unallocated_amount || ''));
    setRefundReason('');
    setRefundError(null);
    setShowRefundModal(true);
  };

  const handleExecuteRefund = async (e) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setRefunding(true);
    setRefundError(null);
    try {
      const amt = parseFloat(refundAmount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error('Please enter a valid refund amount.');
      }
      if (amt > Number(selectedPayment.unallocated_amount)) {
        throw new Error('Refund amount exceeds available unallocated payment balance.');
      }
      if (!refundReason.trim() || refundReason.trim().length < 3) {
        throw new Error('Refund audit justification must be at least 3 characters.');
      }

      await financeService.refundPayment(selectedPayment.id, {
        amount: amt,
        reason: refundReason.trim(),
      });

      setShowRefundModal(false);
      setSelectedPayment(null);
      fetchPayments();
    } catch (err) {
      console.error('Refund execution error:', err);
      setRefundError(err.response?.data?.detail || err.message || 'Failed to process refund.');
    } finally {
      setRefunding(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.payment_reference?.toLowerCase().includes(q) ||
      p.external_reference?.toLowerCase().includes(q) ||
      p.payment_method?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-primary-600" />
            Payment Receipts & Ledger Allocations
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Cash, UPI, Card, and Bank deposits mapped to outstanding receivables with audit-locked reconciliation.
          </p>
        </div>
        <Button onClick={handleOpenRecord} className="flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Record Inflow Payment
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by payment reference or gateway transaction ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="text-xs border border-gray-300 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Payments Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading payment transactions...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payment receipts found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Reference #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Method & Channel
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount Received
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Allocated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Unallocated
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((pmt) => {
                  const unalloc = Number(pmt.unallocated_amount) || 0;
                  return (
                    <tr key={pmt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-bold text-gray-900">
                          {pmt.payment_reference}
                        </div>
                        {pmt.external_reference && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            Gateway: {pmt.external_reference}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(pmt.received_at || pmt.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 uppercase font-medium text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          <DollarSign className="w-3 h-3 text-gray-500" />
                          {pmt.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900 text-sm">
                        {formatCurrency(pmt.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-emerald-600 font-medium text-sm">
                        {formatCurrency(pmt.allocated_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <span
                          className={`font-semibold ${
                            unalloc > 0 ? 'text-amber-600' : 'text-gray-400'
                          }`}
                        >
                          {formatCurrency(pmt.unallocated_amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 capitalize">
                          {pmt.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs space-x-1">
                        {unalloc > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenAllocate(pmt)}
                            className="text-xs text-primary-700"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
                            Allocate
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAllocations(pmt)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Statement
                        </Button>
                        {isOwner && unalloc > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenRefund(pmt)}
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Refund
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

      {/* Modal: Record Payment */}
      {showRecordModal && (
        <Modal
          isOpen={showRecordModal}
          onClose={() => setShowRecordModal(false)}
          title="Record Received Club Inflow"
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            {paymentError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {paymentError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Amount Received (INR ₹) *
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="5000.00"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, payment_method: e.target.value })
                  }
                  className="w-full text-sm border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="upi">UPI / QR Code</option>
                  <option value="cash">Cash at Counter</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="bank_transfer">Direct Bank Transfer</option>
                  <option value="other">Other / Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Customer / Payer Name
                </label>
                <Input
                  type="text"
                  value={paymentForm.customer_name}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, customer_name: e.target.value })
                  }
                  placeholder="Club Patron / Corporate Acct"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                External Reference / Transaction ID
              </label>
              <Input
                type="text"
                value={paymentForm.external_reference}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, external_reference: e.target.value })
                }
                placeholder="UTR / Bank Ref / POS Slip #"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Receipt Remarks
              </label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={2}
                placeholder="Audit notes or transaction description..."
                className="w-full text-xs border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowRecordModal(false)}
                disabled={submittingPayment}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submittingPayment}>
                {submittingPayment ? 'Recording...' : 'Record Payment Receipt'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Allocate Payment to Invoice */}
      {showAllocateModal && selectedPayment && (
        <Modal
          isOpen={showAllocateModal}
          onClose={() => {
            setShowAllocateModal(false);
            setSelectedPayment(null);
          }}
          title={`Allocate ${selectedPayment.payment_reference}`}
        >
          <form onSubmit={handleExecuteAllocation} className="space-y-4">
            {allocationError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {allocationError}
              </div>
            )}

            <div className="bg-primary-50 p-3 rounded-md text-xs space-y-1 text-primary-900">
              <div className="flex justify-between">
                <span>Total Payment:</span>
                <span className="font-bold">{formatCurrency(selectedPayment.amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-primary-700">
                <span>Available Unallocated Balance:</span>
                <span>{formatCurrency(selectedPayment.unallocated_amount)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Target Invoice to Settle *
              </label>
              {loadingInvoices ? (
                <div className="text-xs text-gray-500">Loading open invoices...</div>
              ) : invoices.length === 0 ? (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  No outstanding issued or partially-paid invoices found.
                </div>
              ) : (
                <select
                  value={targetInvoiceId}
                  onChange={(e) => setTargetInvoiceId(e.target.value)}
                  required
                  className="w-full text-xs border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — Due: {formatCurrency(inv.outstanding_amount)} (
                      {inv.business_client?.company_name || inv.walk_in_name || 'Member'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Amount to Allocate (₹) *
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                max={Number(selectedPayment.unallocated_amount)}
                required
                value={allocationAmount}
                onChange={(e) => setAllocationAmount(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowAllocateModal(false);
                  setSelectedPayment(null);
                }}
                disabled={allocating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={allocating || invoices.length === 0}>
                {allocating ? 'Allocating...' : 'Confirm Allocation'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: View Payment Allocations Statement */}
      {showAllocationsModal && selectedPayment && (
        <Modal
          isOpen={showAllocationsModal}
          onClose={() => {
            setShowAllocationsModal(false);
            setSelectedPayment(null);
          }}
          title={`Allocation Statement: ${selectedPayment.payment_reference}`}
        >
          <div className="space-y-4 text-xs text-gray-700">
            <div className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
              <div>
                <span className="font-semibold text-gray-900">Total Inflow: </span>
                {formatCurrency(selectedPayment.amount)}
              </div>
              <div>
                <span className="font-semibold text-emerald-700">Allocated: </span>
                {formatCurrency(selectedPayment.allocated_amount)}
              </div>
              <div>
                <span className="font-semibold text-amber-700">Unallocated: </span>
                {formatCurrency(selectedPayment.unallocated_amount)}
              </div>
            </div>

            {loadingAllocations ? (
              <div className="text-center py-4 text-gray-500">Loading allocation ledger...</div>
            ) : allocationsList.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded">
                No active allocations recorded for this payment yet.
              </div>
            ) : (
              <table className="w-full border border-gray-200 divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Invoice ID</th>
                    <th className="p-2 text-right">Allocated</th>
                    <th className="p-2 text-right">Net Active</th>
                    <th className="p-2 text-right">Date</th>
                    {isOwner && <th className="p-2 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allocationsList.map((a) => {
                    const isFullyReversed = Number(a.net_allocated_amount) <= 0;
                    return (
                      <tr key={a.id} className={isFullyReversed ? 'opacity-50' : ''}>
                        <td className="p-2 font-mono text-xs">{a.invoice_id.substring(0, 8)}...</td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(a.allocated_amount)}
                        </td>
                        <td className="p-2 text-right font-bold text-emerald-700">
                          {formatCurrency(a.net_allocated_amount)}
                        </td>
                        <td className="p-2 text-right text-gray-500">
                          {new Date(a.created_at).toLocaleDateString()}
                        </td>
                        {isOwner && (
                          <td className="p-2 text-center">
                            {!isFullyReversed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenReverse(a)}
                                className="text-red-600 hover:text-red-700 py-0.5 px-1.5 text-xs"
                              >
                                Reverse
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}

      {/* Modal: Reverse Allocation */}
      {showReverseModal && selectedAllocation && (
        <Modal
          isOpen={showReverseModal}
          onClose={() => {
            setShowReverseModal(false);
            setSelectedAllocation(null);
          }}
          title="Reverse Payment Allocation"
        >
          <form onSubmit={handleExecuteReversal} className="space-y-4">
            {reversalError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {reversalError}
              </div>
            )}

            <p className="text-xs text-gray-600">
              Reversing an allocation unlinks funds from the invoice and restores the unallocated
              cash balance in this payment record.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Reversal Amount (₹) *
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                max={Number(selectedAllocation.net_allocated_amount)}
                required
                value={reversalAmount}
                onChange={(e) => setReversalAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Mandatory Audit Reason *
              </label>
              <textarea
                required
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                rows={2}
                placeholder="Reason for reversing allocation..."
                className="w-full text-xs border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowReverseModal(false);
                  setSelectedAllocation(null);
                }}
                disabled={reversing}
              >
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={reversing}>
                {reversing ? 'Reversing...' : 'Execute Reversal'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Process Refund */}
      {showRefundModal && selectedPayment && (
        <Modal
          isOpen={showRefundModal}
          onClose={() => {
            setShowRefundModal(false);
            setSelectedPayment(null);
          }}
          title={`Issue Refund: ${selectedPayment.payment_reference}`}
        >
          <form onSubmit={handleExecuteRefund} className="space-y-4">
            {refundError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {refundError}
              </div>
            )}

            <div className="bg-amber-50 p-3 rounded-md text-xs text-amber-900">
              Refunds can only be issued against unallocated payment balance (Available: {formatCurrency(selectedPayment.unallocated_amount)}).
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Refund Amount (₹) *
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                max={Number(selectedPayment.unallocated_amount)}
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Audit Reason *
              </label>
              <textarea
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={2}
                placeholder="Reason for issuing customer refund..."
                className="w-full text-xs border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowRefundModal(false);
                  setSelectedPayment(null);
                }}
                disabled={refunding}
              >
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={refunding}>
                {refunding ? 'Processing...' : 'Authorize Refund'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default PaymentsPage;
