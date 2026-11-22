import React, { useState, useEffect, useCallback } from 'react';
import { Award, Plus, RefreshCw, CheckCircle, Percent, Edit3, CreditCard, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import MockPaymentModal from '../../components/members/MockPaymentModal';
import memberService from '../../services/memberService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ROLES } from '../../config/constants';
import { formatCurrency } from '../../utils/formatters';

export const MembershipPlansPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState(null);

  // Mock Payment Gateway Modal
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [monthlyFee, setMonthlyFee] = useState('1500.00');
  const [courtDiscountPercent, setCourtDiscountPercent] = useState('10.0');
  const [shopDiscountPercent, setShopDiscountPercent] = useState('5.0');
  const [barDiscountPercent, setBarDiscountPercent] = useState('5.0');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { roles, user } = useAuth();
  const { showToast } = useToast();
  const isOwner = roles.includes(ROLES.OWNER);
  const isMember = roles.includes(ROLES.MEMBER) || (!isOwner && !roles.includes(ROLES.RECEPTIONIST) && !roles.includes(ROLES.SHOP_STAFF) && !roles.includes(ROLES.HR_STAFF));

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, profileData] = await Promise.all([
        memberService.getPlans(),
        memberService.getMyProfile().catch(() => null),
      ]);
      setPlans(plansData || []);
      setMyProfile(profileData);
    } catch (err) {
      showToast?.('Failed to load membership plans.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handlePaymentSuccess = () => {
    showToast?.('Membership subscription activated successfully!', 'success');
    loadPlans();
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setDescription('');
    setDurationDays(30);
    setMonthlyFee('1500.00');
    setCourtDiscountPercent('10.0');
    setShopDiscountPercent('5.0');
    setBarDiscountPercent('5.0');
    setIsActive(true);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setDescription(plan.description || '');
    setDurationDays(plan.duration_days || 30);
    setMonthlyFee(String(plan.monthly_fee));
    setCourtDiscountPercent(String(plan.court_discount_percent));
    setShopDiscountPercent(String(plan.shop_discount_percent || 0));
    setBarDiscountPercent(String(plan.bar_discount_percent || 0));
    setIsActive(plan.is_active);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        name,
        description: description || undefined,
        duration_days: Number(durationDays),
        monthly_fee: monthlyFee,
        court_discount_percent: courtDiscountPercent,
        shop_discount_percent: shopDiscountPercent,
        bar_discount_percent: barDiscountPercent,
        is_active: isActive,
      };

      if (editingPlan) {
        await memberService.updatePlan(editingPlan.id, payload);
        showToast?.('Membership plan updated successfully!', 'success');
      } else {
        await memberService.createPlan(payload);
        showToast?.('New membership plan published!', 'success');
      }
      setIsModalOpen(false);
      loadPlans();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to save membership plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Membership Plans"
        subtitle="Manage membership tiers, tiered discounts for courts, shop and cafeteria, and subscription durations."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Membership Plans' }]}
        actions={
          isOwner && (
            <Button variant="primary" size="sm" onClick={openCreateModal} leftIcon={Plus}>
              New Plan Tier
            </Button>
          )
        }
      />

      <div className="flex items-center justify-between text-xs text-slate-500">
        <p>Active membership tiers determine member booking discounts and priority access.</p>
        <Button variant="outline" size="sm" onClick={loadPlans} isLoading={loading} leftIcon={RefreshCw}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading membership plans...</div>
      ) : plans.length === 0 ? (
        <Card className="text-center py-12 text-slate-500 text-xs">
          <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p>No membership plans found.</p>
          {isOwner && (
            <Button variant="primary" size="sm" className="mt-4" onClick={openCreateModal}>
              Create First Plan
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const isMyActivePlan = myProfile?.plan_id === plan.id && myProfile?.is_active;
            return (
              <Card key={plan.id} className={`relative flex flex-col justify-between transition-all ${isMyActivePlan ? 'border-2 border-emerald-500 shadow-md ring-1 ring-emerald-500/20' : ''}`}>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">{plan.name}</h3>
                        <p className="text-3xs text-slate-400">{plan.duration_days || 30} Days Duration</p>
                      </div>
                    </div>
                    {isMyActivePlan ? (
                      <span className="px-2.5 py-1 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                        <CheckCircle className="w-3.5 h-3.5" /> Your Active Plan
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-3xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Available
                      </span>
                    )}
                  </div>

                  <div className="mt-4 pb-3 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-slate-900">{formatCurrency(plan.monthly_fee)}</span>
                      <span className="text-3xs text-slate-400">/ subscription period</span>
                    </div>
                    {plan.description && (
                      <p className="mt-2 text-xs text-slate-600 line-clamp-2">{plan.description}</p>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-sky-600" /> Court Booking Discount
                      </span>
                      <span className="font-semibold text-sky-700">{plan.court_discount_percent}%</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-emerald-600" /> Pro-Shop Discount
                      </span>
                      <span className="font-semibold text-emerald-700">{plan.shop_discount_percent || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-amber-600" /> Cafeteria Discount
                      </span>
                      <span className="font-semibold text-amber-700">{plan.bar_discount_percent || 0}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 space-y-2">
                  {isMyActivePlan ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                      onClick={() => {
                        setSelectedPlanForPayment(plan);
                        setShowPaymentModal(true);
                      }}
                      leftIcon={RefreshCw}
                    >
                      Renew / Extend Membership
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedPlanForPayment(plan);
                        setShowPaymentModal(true);
                      }}
                      leftIcon={CreditCard}
                    >
                      {myProfile?.is_active ? 'Upgrade to This Plan' : 'Select Plan & Pay (Mock Gateway)'}
                    </Button>
                  )}

                  {isOwner && (
                    <div className="flex justify-end pt-1">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(plan)} leftIcon={Edit3}>
                        Edit Tier
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Mock Payment Gateway Modal */}
      <MockPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        plan={selectedPlanForPayment}
        onSuccess={handlePaymentSuccess}
      />

      {/* Create / Edit Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}
        subtitle="Configure tier duration, monthly fee and percentage discounts"
      >
        <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Plan Tier Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gold Tier, Platinum, Junior"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Plan Fee (INR) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Duration (Days) *</label>
              <input
                type="number"
                min="1"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Court Disc (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={courtDiscountPercent}
                onChange={(e) => setCourtDiscountPercent(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Shop Disc (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={shopDiscountPercent}
                onChange={(e) => setShopDiscountPercent(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Café Disc (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={barDiscountPercent}
                onChange={(e) => setBarDiscountPercent(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Description / Perks</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Unlimited weekend access, 10% court discount, free cafeteria drinks."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="isActive" className="text-slate-700 font-medium cursor-pointer">
              Active Tier (Available for member subscription purchase)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              {editingPlan ? 'Update Plan' : 'Save & Publish'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MembershipPlansPage;
