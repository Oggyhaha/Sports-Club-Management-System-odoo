import React, { useState } from 'react';
import { CreditCard, QrCode, Building, ShieldCheck, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import memberService from '../../services/memberService';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/formatters';

/**
 * Mock Payment Gateway Simulator
 * 
 * Provides an interactive test payment checkout modal for testing and evaluation.
 * Allows users to choose a plan and simulate real-time payment authorization,
 * creating active subscriptions and member profiles in the database.
 */
export const MockPaymentModal = ({
  isOpen,
  onClose,
  plan,
  onSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'upi' | 'netbanking'
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('888');
  const [cardName, setCardName] = useState('Club Member');
  const [upiId, setUpiId] = useState('member@okhdfcbank');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { showToast } = useToast();

  if (!plan) return null;

  const basePrice = Number(plan.monthly_fee) || 0;
  const gstAmount = basePrice * 0.18; // 18% standard GST
  const grandTotal = basePrice + gstAmount;

  const handlePay = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setErrorMsg('');

    try {
      // Simulate realistic payment gateway authorization latency
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockTxnRef = `MOCK-TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const payload = {
        plan_id: plan.id,
        payment_method: `mock_${paymentMethod}`,
        payment_reference: mockTxnRef,
      };

      const res = await memberService.purchaseSubscriptionOnline(payload);
      showToast?.(
        `Payment authorized! Subscribed to ${plan.name} Tier successfully.`,
        'success'
      );
      onSuccess?.(res);
      onClose();
    } catch (err) {
      console.error('Payment simulation failed:', err);
      setErrorMsg(
        err.response?.data?.detail || err.message || 'Payment simulation failed. Please try again.'
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Secure Membership Checkout"
      subtitle="Complete your payment to activate your club membership benefits immediately."
      maxWidth="max-w-xl"
    >
      <div className="space-y-5 text-xs">
        {/* Test Gateway Notice Banner */}
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-2xs">Mock Payment Gateway — Evaluation Test Mode</span>
          </div>
          <span className="text-3xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
            Simulated 200 OK
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Plan Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm">{plan.name} Tier Membership</span>
            <span className="text-slate-500 font-mono text-2xs">{plan.duration_days || 30} Days Validity</span>
          </div>
          <div className="text-slate-600 text-2xs flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-slate-200">
            <span>🏸 Court Discount: <strong className="text-sky-700">{plan.court_discount_percent}%</strong></span>
            <span>🛍️ Pro-Shop: <strong className="text-emerald-700">{plan.shop_discount_percent || 0}%</strong></span>
            <span>☕ Cafeteria: <strong className="text-amber-700">{plan.bar_discount_percent || 0}%</strong></span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900 text-sm">
            <span>Grand Total (incl. 18% GST)</span>
            <span className="text-primary-700 text-base">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {/* Payment Method Selector Tabs */}
        <div>
          <label className="block font-semibold text-slate-700 mb-2">Select Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                paymentMethod === 'card'
                  ? 'bg-primary-50 border-primary-600 text-primary-800 ring-2 ring-primary-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4 text-primary-600" />
              <span>Credit / Debit Card</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('upi')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                paymentMethod === 'upi'
                  ? 'bg-primary-50 border-primary-600 text-primary-800 ring-2 ring-primary-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <QrCode className="w-4 h-4 text-primary-600" />
              <span>UPI / QR</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('netbanking')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                paymentMethod === 'netbanking'
                  ? 'bg-primary-50 border-primary-600 text-primary-800 ring-2 ring-primary-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building className="w-4 h-4 text-primary-600" />
              <span>Net Banking</span>
            </button>
          </div>
        </div>

        {/* Tab Form: Card */}
        {paymentMethod === 'card' && (
          <div className="space-y-3 bg-white p-3.5 border border-slate-200 rounded-xl">
            <div>
              <label className="block text-2xs font-semibold text-slate-600 mb-1">Card Number (Mock Pre-filled)</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-semibold text-slate-600 mb-1">Expiry Date</label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-2xs font-semibold text-slate-600 mb-1">CVV</label>
                <input
                  type="password"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-2xs font-semibold text-slate-600 mb-1">Cardholder Name</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
          </div>
        )}

        {/* Tab Form: UPI */}
        {paymentMethod === 'upi' && (
          <div className="space-y-3 bg-white p-3.5 border border-slate-200 rounded-xl text-center">
            <div className="p-4 bg-slate-100 rounded-xl inline-block mx-auto border border-slate-200">
              <QrCode className="w-24 h-24 text-slate-700 mx-auto" />
              <p className="text-3xs text-slate-500 mt-2 font-mono">Scan via PhonePe, GPay, Paytm</p>
            </div>
            <div>
              <label className="block text-2xs font-semibold text-slate-600 mb-1 text-left">Virtual Payment Address (VPA)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-mono text-xs"
              />
            </div>
          </div>
        )}

        {/* Tab Form: Net Banking */}
        {paymentMethod === 'netbanking' && (
          <div className="space-y-3 bg-white p-3.5 border border-slate-200 rounded-xl">
            <div>
              <label className="block text-2xs font-semibold text-slate-600 mb-1">Select Bank</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-xs"
              >
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="State Bank of India">State Bank of India</option>
                <option value="Axis Bank">Axis Bank</option>
                <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
              </select>
            </div>
            <p className="text-2xs text-slate-500">
              You will be redirected to simulated banking portal upon authorization.
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-400 text-2xs">
            <Lock className="w-3.5 h-3.5" />
            <span>256-bit Mock Encrypted Checkout</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePay}
              isLoading={processing}
              leftIcon={ShieldCheck}
            >
              Authorize & Activate ({formatCurrency(grandTotal)})
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MockPaymentModal;
