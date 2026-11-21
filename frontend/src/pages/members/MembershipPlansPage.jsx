import React, { useState, useEffect, useCallback } from 'react';
import { Award, Plus, RefreshCw, CheckCircle, Percent } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import memberService from '../../services/memberService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ROLES } from '../../config/constants';
import { formatCurrency } from '../../utils/formatters';

export const MembershipPlansPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMonths, setDurationMonths] = useState(1);
  const [price, setPrice] = useState('1500.00');
  const [courtDiscountPercent, setCourtDiscountPercent] = useState('10.0');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { roles } = useAuth();
  const { showToast } = useToast();
  const isOwner = roles.includes(ROLES.OWNER);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await memberService.getPlans();
      setPlans(data || []);
    } catch (err) {
      showToast?.('Failed to load membership plans.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setDescription('');
    setDurationMonths(1);
    setPrice('1500.00');
    setCourtDiscountPercent('10.0');
    setIsActive(true);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setDescription(plan.description || '');
    setDurationMonths(plan.duration_months);
    setPrice(String(plan.price));
    setCourtDiscountPercent(String(plan.court_discount_percent));
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
        description,
        duration_months: Number(durationMonths),
        price: price,
        court_discount_percent: courtDiscountPercent,
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
      setErrorMsg(err.response?.data?.detail || 'Failed to save membership plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Membership Plans"
        subtitle="Manage club membership tiers, duration windows, subscription fees, and court booking discounts."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Membership Plans' }]}
        actions={
          isOwner && (
            <Button variant="primary" size="sm" onClick={openCreateModal} leftIcon={Plus}>
              Create New Plan
            </Button>
          )
        }
      />

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading plans catalog...</div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
          No membership plans defined. Click "Create New Plan" to configure membership tiers.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all duration-150 p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-2xs text-slate-400 font-mono">
                        {plan.duration_months} {plan.duration_months === 1 ? 'Month' : 'Months'} Validity
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={plan.is_active ? 'active' : 'inactive'} />
                </div>

                <div className="mt-4 pb-4 border-b border-slate-100">
                  <span className="text-2xl font-bold font-mono text-slate-900">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">/ subscription</span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-sky-600" /> Court Booking Discount
                    </span>
                    <span className="font-bold text-sky-900 font-mono">
                      {plan.court_discount_percent}% OFF
                    </span>
                  </div>

                  {plan.description && (
                    <p className="text-2xs text-slate-500 leading-relaxed pt-2">
                      {plan.description}
                    </p>
                  )}
                </div>
              </div>

              {isOwner && (
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
                  <Button variant="outline" size="sm" onClick={() => openEditModal(plan)}>
                    Edit Plan
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}
        subtitle="Configure pricing and court reservation discounts (Owner Restricted)"
      >
        <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Plan Title *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gold Annual Membership"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Duration (Months) *</label>
              <input
                type="number"
                min="1"
                max="36"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Subscription Price (INR) *</label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1500.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Court Discount Percentage (0–100%) *</label>
            <input
              type="text"
              value={courtDiscountPercent}
              onChange={(e) => setCourtDiscountPercent(e.target.value)}
              placeholder="15.0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Plan Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full access to badminton and squash courts with weekend guest passes."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="plan-is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="plan-is-active" className="text-slate-700 font-medium cursor-pointer">
              Active plan available for member enrollment
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              {editingPlan ? 'Update Plan' : 'Publish Plan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MembershipPlansPage;
