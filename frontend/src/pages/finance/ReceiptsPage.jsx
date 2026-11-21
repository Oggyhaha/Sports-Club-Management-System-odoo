import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Printer,
  CheckCircle2,
  DollarSign,
  User,
  Calendar,
  CreditCard,
  ShieldCheck,
  Building,
} from 'lucide-react';
import financeService from '../../services/financeService';
import { formatCurrency } from '../../utils/formatters';
import Modal from '../../components/common/Modal';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/forms/Input';

export const ReceiptsPage = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // View Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await financeService.getReceipts();
      setReceipts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load receipts:', err);
      setError('Unable to load official payment receipts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const filteredReceipts = receipts.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.receipt_number?.toLowerCase().includes(q) ||
      r.customer_name_snapshot?.toLowerCase().includes(q) ||
      r.payment_method?.toLowerCase().includes(q)
    );
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary-600" />
            Official Payment Receipts
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Authoritative, immutable transaction receipts generated on payment intake.
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by receipt number, customer name, or payment method..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </Card>

      {/* Receipts Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading receipts archive...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : filteredReceipts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No payment receipts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Receipt #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer Name Snapshot
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Payment Channel
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount Received
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Issued At
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReceipts.map((rcpt) => (
                  <tr key={rcpt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-primary-700">
                      {rcpt.receipt_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-900">
                      {rcpt.customer_name_snapshot}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 uppercase font-medium text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                        {rcpt.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-emerald-700 text-sm">
                      {formatCurrency(rcpt.amount_received)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {new Date(rcpt.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedReceipt(rcpt);
                          setShowReceiptModal(true);
                        }}
                      >
                        View Voucher
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: View Receipt Voucher */}
      {showReceiptModal && selectedReceipt && (
        <Modal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedReceipt(null);
          }}
          title="Payment Voucher"
        >
          <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Club Header */}
            <div className="text-center pb-3 border-b border-gray-200">
              <h2 className="text-lg font-black text-gray-900 tracking-wider">CHAMPIONS CLUB</h2>
              <p className="text-xs text-gray-500">Sports & Recreation Center — Official Receipt</p>
            </div>

            {/* Voucher Details */}
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-700">
              <div>
                <span className="text-gray-500 block">Receipt No:</span>
                <span className="font-mono font-bold text-gray-900">
                  {selectedReceipt.receipt_number}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 block">Date & Time:</span>
                <span className="font-medium">
                  {new Date(selectedReceipt.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Received From:</span>
                <span className="font-semibold text-gray-900">
                  {selectedReceipt.customer_name_snapshot}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 block">Payment Mode:</span>
                <span className="font-semibold uppercase text-gray-900">
                  {selectedReceipt.payment_method}
                </span>
              </div>
            </div>

            {/* Amount Box */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-center">
              <span className="text-xs text-emerald-800 uppercase font-semibold block">
                Total Amount Received
              </span>
              <span className="text-2xl font-black text-emerald-700">
                {formatCurrency(selectedReceipt.amount_received)}
              </span>
            </div>

            {/* Footer / Stamp */}
            <div className="pt-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
                <span>Authorized Financial Record</span>
              </div>
              <Button size="sm" variant="secondary" onClick={handlePrint} className="no-print">
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print Voucher
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ReceiptsPage;
