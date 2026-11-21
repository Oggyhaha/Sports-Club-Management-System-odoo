import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Trash2,
  Calendar,
  Building2,
  User,
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

export const InvoicesPage = () => {
  const { user } = useAuth();
  const isOwner = user?.roles?.some((r) => (r.name || r) === ROLES.OWNER);

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modals & Actions
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Cancellation State
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Corporate clients for dropdown
  const [clients, setClients] = useState([]);

  // Create Invoice Form State
  const [recipientType, setRecipientType] = useState('business'); // 'business' | 'walk_in'
  const [selectedClientId, setSelectedClientId] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { description: 'Facility Rental / Services', quantity: 1, unit_price: 1000, discount_amount: 0, tax_amount: 180 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'all') {
        params.invoice_status = statusFilter;
      }
      const data = await financeService.getInvoices(params);
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError('Unable to load invoices repository.');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    if (isOwner) {
      try {
        const clientList = await financeService.getClients({ is_active: true });
        setClients(Array.isArray(clientList) ? clientList : []);
      } catch (e) {
        console.error('Failed to load clients for invoice selector:', e);
      }
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  useEffect(() => {
    loadClients();
  }, [isOwner]);

  const handleAddItem = () => {
    setItems([
      ...items,
      { description: '', quantity: 1, unit_price: 0, discount_amount: 0, tax_amount: 0 },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    items.forEach((item) => {
      const qty = Number(item.quantity) || 1;
      const unit = Number(item.unit_price) || 0;
      const disc = Number(item.discount_amount) || 0;
      const tx = Number(item.tax_amount) || 0;
      subtotal += qty * unit;
      discount += disc;
      tax += tx;
    });
    const total = Math.max(0, subtotal - discount + tax);
    return { subtotal, discount, tax, total };
  };

  const handleOpenCreate = () => {
    setRecipientType('business');
    setSelectedClientId(clients.length > 0 ? clients[0].id : '');
    setWalkInName('');
    setWalkInPhone('');
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setDueDate(d.toISOString().split('T')[0]);
    setNotes('');
    setItems([
      { description: 'Facility Rental / Services', quantity: 1, unit_price: 1000, discount_amount: 0, tax_amount: 180 },
    ]);
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        due_date: dueDate,
        currency: 'INR',
        notes: notes.trim() || null,
        items: items.map((it) => ({
          description: it.description.trim() || 'Service Item',
          quantity: parseInt(it.quantity, 10) || 1,
          unit_price: parseFloat(it.unit_price) || 0,
          discount_amount: parseFloat(it.discount_amount) || 0,
          tax_amount: parseFloat(it.tax_amount) || 0,
        })),
      };

      if (recipientType === 'business') {
        if (!selectedClientId) {
          throw new Error('Please select a corporate client.');
        }
        payload.business_client_id = selectedClientId;
      } else {
        if (!walkInName.trim()) {
          throw new Error('Walk-in customer name is required.');
        }
        payload.walk_in_name = walkInName.trim();
        payload.walk_in_phone = walkInPhone.trim() || null;
      }

      await financeService.createInvoice(payload);
      setShowCreateModal(false);
      fetchInvoices();
    } catch (err) {
      console.error('Invoice creation error:', err);
      setFormError(err.response?.data?.detail || err.message || 'Failed to create invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCancel = (invoice) => {
    setInvoiceToCancel(invoice);
    setCancelReason('');
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    if (!invoiceToCancel) return;
    setCancelling(true);
    try {
      await financeService.cancelInvoice(invoiceToCancel.id, cancelReason);
      setShowCancelDialog(false);
      setInvoiceToCancel(null);
      fetchInvoices();
    } catch (err) {
      console.error('Failed to cancel invoice:', err);
      alert(err.response?.data?.detail || 'Failed to cancel invoice.');
    } finally {
      setCancelling(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const invNum = inv.invoice_number?.toLowerCase() || '';
    const clientName = inv.business_client?.company_name?.toLowerCase() || '';
    const walkIn = inv.walk_in_name?.toLowerCase() || '';
    return invNum.includes(q) || clientName.includes(q) || walkIn.includes(q);
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paid
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5" />
            Partially Paid
          </span>
        );
      case 'issued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <AlertCircle className="w-3.5 h-3.5" />
            Issued
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-primary-600" />
            Invoices & Accounts Receivable
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Authoritative billing repository for court rentals, memberships, POS orders, and corporate agreements.
          </p>
        </div>
        {isOwner && (
          <Button onClick={handleOpenCreate} className="flex items-center gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Generate Direct Invoice
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by invoice number or recipient name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="issued">Issued / Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Fully Settled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Invoices Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading invoices...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No invoices found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Issue / Due Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total Billed
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount Paid
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Outstanding
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
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-primary-700">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {inv.business_client ? (
                        <div className="flex items-center text-xs font-medium text-gray-900 gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          {inv.business_client.company_name}
                        </div>
                      ) : inv.walk_in_name ? (
                        <div className="flex items-center text-xs font-medium text-gray-900 gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                          {inv.walk_in_name} (Walk-in)
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600">Club Member</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      <div>Issued: {inv.issue_date}</div>
                      <div className="text-gray-400">Due: {inv.due_date}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900 text-sm">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-emerald-600 font-medium text-sm">
                      {formatCurrency(inv.amount_paid)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900 text-sm">
                      {formatCurrency(inv.outstanding_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(inv.invoice_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setShowDetailModal(true);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </Button>
                      {isOwner && inv.invoice_status === 'issued' && Number(inv.amount_paid) === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenCancel(inv)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
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

      {/* Modal: Create Direct Invoice */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Generate Direct Corporate / Custom Invoice"
        >
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {formError}
              </div>
            )}

            {/* Recipient Selector */}
            <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setRecipientType('business')}
                className={`py-2 text-xs font-semibold rounded-md transition-all ${
                  recipientType === 'business'
                    ? 'bg-white shadow text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Corporate Client
              </button>
              <button
                type="button"
                onClick={() => setRecipientType('walk_in')}
                className={`py-2 text-xs font-semibold rounded-md transition-all ${
                  recipientType === 'walk_in'
                    ? 'bg-white shadow text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Walk-in / Custom Patron
              </button>
            </div>

            {recipientType === 'business' ? (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Select Corporate Account *
                </label>
                {clients.length === 0 ? (
                  <p className="text-xs text-red-500">
                    No active corporate accounts found. Please register a corporate client first.
                  </p>
                ) : (
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required
                    className="w-full text-sm border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name} ({c.contact_person})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Customer Name *
                  </label>
                  <Input
                    type="text"
                    required
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="e.g. Vikramaditya Singh"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Phone Number
                  </label>
                  <Input
                    type="text"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Due Date *
              </label>
              <Input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Line Items */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 uppercase">Billed Items</span>
                <Button type="button" variant="secondary" size="sm" onClick={handleAddItem}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
                </Button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-md border text-xs">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Description *"
                      required
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="w-16">
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs text-right"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      placeholder="Rate ₹"
                      min="0"
                      step="0.01"
                      required
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs text-right"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      placeholder="Tax ₹"
                      min="0"
                      step="0.01"
                      value={item.tax_amount}
                      onChange={(e) => handleItemChange(idx, 'tax_amount', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs text-right"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Totals Preview */}
              <div className="bg-primary-50 p-3 rounded-md text-xs space-y-1 text-gray-800">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST / Tax:</span>
                  <span className="font-semibold">{formatCurrency(totals.tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-primary-900 border-t pt-1">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Internal Notes / Terms
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional billing remarks..."
                className="w-full text-xs border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Generating...' : 'Issue Invoice'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: View Invoice Details */}
      {showDetailModal && selectedInvoice && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedInvoice(null);
          }}
          title={`Invoice ${selectedInvoice.invoice_number}`}
        >
          <div className="space-y-4 text-xs text-gray-700">
            <div className="flex justify-between items-center pb-2 border-b">
              <div>
                <span className="text-gray-500">Status: </span>
                {getStatusBadge(selectedInvoice.invoice_status)}
              </div>
              <div className="text-right text-gray-500">
                <div>Issue: {selectedInvoice.issue_date}</div>
                <div>Due: {selectedInvoice.due_date}</div>
              </div>
            </div>

            <div>
              <div className="font-bold text-gray-900 mb-1">Billed To:</div>
              {selectedInvoice.business_client ? (
                <div>
                  <div className="font-semibold">{selectedInvoice.business_client.company_name}</div>
                  <div>Contact: {selectedInvoice.business_client.contact_person}</div>
                  <div>GSTIN: {selectedInvoice.business_client.tax_id_gstin || 'None'}</div>
                </div>
              ) : selectedInvoice.walk_in_name ? (
                <div>
                  <div>{selectedInvoice.walk_in_name} (Walk-in Customer)</div>
                  {selectedInvoice.walk_in_phone && <div>Phone: {selectedInvoice.walk_in_phone}</div>}
                </div>
              ) : (
                <div>Club Member Account</div>
              )}
            </div>

            {/* Items Table */}
            <div>
              <div className="font-bold text-gray-900 mb-2">Line Items:</div>
              <table className="w-full border border-gray-200 divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Tax</th>
                    <th className="p-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedInvoice.items?.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2 font-medium">{it.description}</td>
                      <td className="p-2 text-right">{it.quantity}</td>
                      <td className="p-2 text-right">{formatCurrency(it.unit_price)}</td>
                      <td className="p-2 text-right">{formatCurrency(it.tax_amount)}</td>
                      <td className="p-2 text-right font-semibold">{formatCurrency(it.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Settlement Summary */}
            <div className="bg-gray-50 p-3 rounded-md space-y-1">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-semibold">{formatCurrency(selectedInvoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Amount Paid:</span>
                <span className="font-semibold">{formatCurrency(selectedInvoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-primary-900 border-t pt-1">
                <span>Outstanding Balance:</span>
                <span>{formatCurrency(selectedInvoice.outstanding_amount)}</span>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="text-gray-500 italic">
                Notes: {selectedInvoice.notes}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Confirmation: Cancel Invoice */}
      <ConfirmationDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Invoice"
        message={
          invoiceToCancel
            ? `Are you sure you want to void invoice ${invoiceToCancel.invoice_number}? This will irrevocably cancel the bill.`
            : ''
        }
        confirmText={cancelling ? 'Cancelling...' : 'Confirm Void'}
        confirmVariant="danger"
      />
    </div>
  );
};

export default InvoicesPage;
