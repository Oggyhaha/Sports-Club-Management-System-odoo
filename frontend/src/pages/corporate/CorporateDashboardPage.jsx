import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Receipt,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  CreditCard,
  ShieldCheck,
  CalendarDays,
  Clock,
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import financeService from '../../services/financeService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatters';

export const CorporateDashboardPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [clientProfile, setClientProfile] = useState(null);
  const [isUnlinked, setIsUnlinked] = useState(false);

  // Invoices State
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Invoice Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load Corporate Client Profile
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setIsUnlinked(false);
    try {
      const data = await financeService.getMyClientProfile();
      setClientProfile(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setIsUnlinked(true);
      } else {
        console.error('Failed to load corporate profile:', err);
        showToast?.('Unable to load corporate account profile.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load Corporate Invoices
  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.invoice_status = statusFilter;
      const data = await financeService.getMyClientInvoices(params);
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load corporate invoices:', err);
      // Fallback to getInvoices (auto-filtered by backend for business_client role)
      try {
        const params = {};
        if (statusFilter !== 'all') params.invoice_status = statusFilter;
        const data = await financeService.getInvoices(params);
        setInvoices(Array.isArray(data) ? data : []);
      } catch (e) {
        showToast?.('Unable to load corporate invoices.', 'error');
      }
    } finally {
      setLoadingInvoices(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Derived Financial Aggregations from authoritative invoice ledger
  const calculateFinancialTotals = () => {
    const totalBilled = invoices.reduce((acc, inv) => acc + Number(inv.total_amount || 0), 0);
    const totalSettled = invoices.reduce((acc, inv) => acc + Number(inv.amount_paid || 0), 0);
    const outstanding = invoices.reduce((acc, inv) => acc + Number(inv.outstanding_amount || 0), 0);
    return { totalBilled, totalSettled, outstanding };
  };

  const { totalBilled, totalSettled, outstanding } = calculateFinancialTotals();

  const filteredInvoices = invoices.filter((inv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.notes?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={clientProfile ? clientProfile.company_name : 'Corporate Client Portal'}
        subtitle="Commercial account overview, consolidated B2B tax invoices, and institutional billing statements."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Corporate Portal' }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadProfile();
              loadInvoices();
            }}
            leftIcon={RefreshCw}
          >
            Refresh Data
          </Button>
        }
      />

      {/* Unlinked Corporate Profile Alert */}
      {isUnlinked && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-xs text-amber-900">Corporate Account Not Linked</h4>
            <p className="text-2xs text-amber-800 mt-0.5">
              Corporate profile pending activation. Please contact administration.
            </p>
          </div>
        </div>
      )}

      {/* Top Section: Corporate Profile & Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Corporate Profile Card (1 col) */}
        <Card title="Corporate Identity" subtitle="Account Specifications" className="flex flex-col justify-between">
          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  {clientProfile?.company_name || 'Corporate Account'}
                </h4>
                <p className="text-3xs text-slate-400 font-mono">
                  Client ID: {clientProfile?.id ? clientProfile.id.substring(0, 8) : '—'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Contact Person:</span>
                <span className="font-semibold text-slate-900">{clientProfile?.contact_person || user?.full_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Registered Email:</span>
                <span className="font-medium text-slate-800">{clientProfile?.email || user?.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Contact Phone:</span>
                <span className="font-mono text-slate-800">{clientProfile?.phone || 'Not recorded'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">GSTIN / Tax ID:</span>
                <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded text-2xs">
                  {clientProfile?.tax_id_gstin || clientProfile?.gstin || 'Unspecified'}
                </span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 block text-3xs">Billing Address:</span>
                <span className="text-slate-700 text-2xs mt-0.5 block line-clamp-2">
                  {clientProfile?.billing_address || 'On file with administration'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-2xs">
            <span className="text-slate-500">Account Status:</span>
            <StatusBadge status={clientProfile?.is_active ? 'active' : 'inactive'} />
          </div>
        </Card>

        {/* Financial KPI Summary Cards (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 border-l-4 border-l-sky-500">
              <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">Total Invoiced</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                {formatCurrency(totalBilled)}
              </p>
              <span className="text-3xs text-slate-500 mt-1 block">Cumulative B2B obligations</span>
            </Card>

            <Card className="p-4 border-l-4 border-l-emerald-500">
              <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">Settled Amount</span>
              <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
                {formatCurrency(totalSettled)}
              </p>
              <span className="text-3xs text-slate-500 mt-1 block">Allocated payments</span>
            </Card>

            <Card className="p-4 border-l-4 border-l-rose-500">
              <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">Net Outstanding</span>
              <p className="text-xl font-bold font-mono text-rose-700 mt-1">
                {formatCurrency(outstanding)}
              </p>
              <span className="text-3xs text-slate-500 mt-1 block">Receivable balance due</span>
            </Card>
          </div>

          {/* Institutional Booking & Credit Policy Notice */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <CalendarDays className="w-4 h-4 text-sky-600" />
              <span>Institutional Facility Reservations & Corporate Events</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-2xs">
              Corporate clients can arrange bulk court blocks, inter-company tournaments, and private clubhouse functions.
              Consolidated tax invoices are issued on credit terms and settled via NEFT/RTGS bank transfers or corporate cheques.
              For custom event reservations, contact the club corporate relations desk at <strong className="text-slate-800">corporate@championsclub.com</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Corporate B2B Invoices Section */}
      <Card
        title="Corporate B2B Invoices Ledger"
        subtitle="Itemized tax invoices, GST breakdowns, and settlement history"
        noPadding
      >
        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-slate-500 text-2xs font-semibold">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs text-slate-800"
            >
              <option value="all">All Invoices</option>
              <option value="issued">Issued (Unpaid)</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Fully Settled</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Invoices Table */}
        {loadingInvoices ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading corporate invoices ledger...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No invoices found for your corporate account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Issue Date</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4 text-right">Subtotal</th>
                  <th className="py-2.5 px-4 text-right">GST Output</th>
                  <th className="py-2.5 px-4 text-right">Total Amount</th>
                  <th className="py-2.5 px-4 text-right">Amount Settled</th>
                  <th className="py-2.5 px-4 text-right">Outstanding</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-primary-700">{inv.invoice_number}</td>
                    <td className="py-3 px-4 font-sans text-slate-500">{formatDate(inv.issue_date)}</td>
                    <td className="py-3 px-4 font-sans text-slate-500">{formatDate(inv.due_date)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(inv.subtotal)}</td>
                    <td className="py-3 px-4 text-right text-slate-500">{formatCurrency(inv.tax_amount)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(inv.total_amount)}</td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-semibold">{formatCurrency(inv.amount_paid)}</td>
                    <td className="py-3 px-4 text-right text-rose-700 font-bold">{formatCurrency(inv.outstanding_amount)}</td>
                    <td className="py-3 px-4 font-sans">
                      <StatusBadge status={inv.invoice_status} />
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setShowDetailModal(true);
                        }}
                        leftIcon={FileText}
                      >
                        Breakdown
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Invoice Line-Item Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedInvoice ? `Corporate Tax Invoice: ${selectedInvoice.invoice_number}` : 'Invoice Details'}
        subtitle={selectedInvoice ? `Issue: ${formatDate(selectedInvoice.issue_date)} • Due: ${formatDate(selectedInvoice.due_date)}` : ''}
        size="md"
      >
        {selectedInvoice && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-3xs block">Payment Status</span>
                <StatusBadge status={selectedInvoice.invoice_status} />
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-3xs block">Outstanding Due</span>
                <span className="font-mono font-bold text-sm text-rose-700">
                  {formatCurrency(selectedInvoice.outstanding_amount)}
                </span>
              </div>
            </div>

            {/* Line Items */}
            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2 px-3">Service / Item</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Rate</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {selectedInvoice.items.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="py-2 px-3 font-sans font-medium text-slate-800">{it.description}</td>
                        <td className="py-2 px-3 text-center">{it.quantity}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(it.unit_price)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(it.line_total || (it.quantity * it.unit_price))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Billing Notes */}
            {selectedInvoice.notes && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                <span className="font-semibold text-3xs text-slate-400 uppercase tracking-wider block">Billing Notes</span>
                <p className="mt-0.5">{selectedInvoice.notes}</p>
              </div>
            )}

            {/* Totals Breakdown */}
            <div className="space-y-1 pt-2 border-t border-slate-100 text-right">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              {Number(selectedInvoice.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Corporate Discount:</span>
                  <span className="font-mono">-{formatCurrency(selectedInvoice.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST Output (Statutory):</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Invoiced:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Settled (Amount Paid):</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.amount_paid)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CorporateDashboardPage;
