import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Search, RefreshCw, Award, Calendar, History, CheckCircle2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import memberService from '../../services/memberService';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, formatCurrency } from '../../utils/formatters';

export const MembersPage = () => {
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // New Member Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [savingMember, setSavingMember] = useState(false);
  const [addError, setAddError] = useState('');

  // Renew / Change Plan Modal
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [memberToRenew, setMemberToRenew] = useState(null);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewNotes, setRenewNotes] = useState('');
  const [renewing, setRenewing] = useState(false);

  // Subscription History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [memberForHistory, setMemberForHistory] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== '') params.is_active = statusFilter === 'active';

      const [membersData, plansData] = await Promise.all([
        memberService.getMembers(params),
        memberService.getPlans(),
      ]);
      setMembers(membersData || []);
      setPlans(plansData || []);
      if (plansData?.length > 0 && !selectedPlanId) {
        setSelectedPlanId(plansData[0].id);
      }
    } catch (err) {
      showToast?.('Failed to load member directory.', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, selectedPlanId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateMember = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !selectedPlanId) {
      setAddError('Full name, email, and a selected membership plan are required.');
      return;
    }
    setSavingMember(true);
    setAddError('');

    try {
      const payload = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone ? phone.trim() : undefined,
        plan_id: selectedPlanId,
      };

      await memberService.createMember(payload);
      showToast?.('Member onboarded successfully with active plan tier!', 'success');
      setIsAddModalOpen(false);
      setFullName('');
      setEmail('');
      setPhone('');
      loadData();
    } catch (err) {
      setAddError(err.response?.data?.detail || err.message || 'Failed to onboard member.');
    } finally {
      setSavingMember(false);
    }
  };

  const handleRenewSubscription = async (e) => {
    e.preventDefault();
    if (!memberToRenew) return;
    setRenewing(true);

    try {
      if (renewPlanId && renewPlanId !== memberToRenew.plan_id) {
        // Plan Tier Change
        await memberService.changePlan(memberToRenew.id, {
          new_plan_id: renewPlanId,
          notes: renewNotes || 'Plan tier changed at reception',
        });
        showToast?.(`Membership upgraded to new tier for ${memberToRenew.full_name}!`, 'success');
      } else {
        // Same Plan Renewal
        await memberService.renewSubscription(memberToRenew.id, {
          notes: renewNotes || 'Standard subscription renewal',
        });
        showToast?.(`Subscription renewed seamlessly for ${memberToRenew.full_name}!`, 'success');
      }
      setRenewModalOpen(false);
      setMemberToRenew(null);
      setRenewNotes('');
      loadData();
    } catch (err) {
      showToast?.(err.response?.data?.detail || err.message || 'Failed to renew subscription.', 'error');
    } finally {
      setRenewing(false);
    }
  };

  const openHistoryModal = async (member) => {
    setMemberForHistory(member);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const history = await memberService.getMemberSubscriptions(member.id);
      setSubscriptionHistory(history || []);
    } catch (err) {
      showToast?.('Failed to load subscription history.', 'error');
      setSubscriptionHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Member Directory"
        subtitle="Active club subscriptions, profile onboarding, plan tiers, and renewal history."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Members' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={UserPlus}
          >
            Onboard Member
          </Button>
        }
      />

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by member name, email..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Members</option>
            <option value="inactive">Inactive / Expired</option>
          </select>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} isLoading={loading} leftIcon={RefreshCw}>
          Refresh
        </Button>
      </div>

      {/* Member Table */}
      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading member roster...</div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No members found matching your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Member Name</th>
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-4">Membership Plan</th>
                  <th className="py-2.5 px-4">Subscription Period</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{m.full_name}</p>
                      <p className="text-3xs text-slate-400">Joined {formatDate(m.created_at)}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <p>{m.email}</p>
                      <p className="text-3xs text-slate-400 font-mono">{m.phone || '—'}</p>
                    </td>
                    <td className="py-3 px-4">
                      {m.plan ? (
                        <div>
                          <span className="font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-2xs">
                            {m.plan.name}
                          </span>
                          <p className="text-3xs text-slate-400 mt-0.5">
                            {m.plan.court_discount_percent}% court disc
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None / Walk-In</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <p className="font-mono">{formatDate(m.start_date)} to {formatDate(m.expiry_date)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={m.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openHistoryModal(m)}
                          leftIcon={History}
                        >
                          History
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMemberToRenew(m);
                            setRenewPlanId(m.plan_id || (plans[0]?.id ?? ''));
                            setRenewNotes('');
                            setRenewModalOpen(true);
                          }}
                        >
                          Renew / Upgrade
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Onboard Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Onboard New Member"
        subtitle="Register customer profile and attach initial membership plan"
      >
        <form onSubmit={handleCreateMember} className="space-y-4 text-xs">
          {addError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium">
              {addError}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@example.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Select Membership Plan *</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
              required
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.duration_days || 30} Days • {formatCurrency(p.monthly_fee)} • {p.court_discount_percent}% court disc)
                </option>
              ))}
            </select>
            <p className="mt-1 text-3xs text-slate-500">
              Note: Onboarding a member sets subscription status to active. Financial payment must be collected via Finance invoices.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingMember}>
              Save Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Renew / Change Plan Modal */}
      <Modal
        isOpen={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        title="Renew or Change Plan"
        subtitle={`Extend or upgrade subscription for ${memberToRenew?.full_name}`}
      >
        <form onSubmit={handleRenewSubscription} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Select Membership Plan *</label>
            <select
              value={renewPlanId}
              onChange={(e) => setRenewPlanId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
              required
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.duration_days || 30} Days • {formatCurrency(p.monthly_fee)} • {p.court_discount_percent}% Disc)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Notes / Reception Remarks</label>
            <input
              type="text"
              value={renewNotes}
              onChange={(e) => setRenewNotes(e.target.value)}
              placeholder="e.g. Counter payment promised or renewal requested"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 text-sky-900">
            <p className="font-semibold">Continuous Renewal & Integrity Policy</p>
            <p className="mt-0.5 text-2xs text-sky-800">
              If currently active, the subscription end-date extends seamlessly. Creating or renewing a subscription does NOT fabricate a payment record.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setRenewModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={renewing}>
              Confirm Extension
            </Button>
          </div>
        </form>
      </Modal>

      {/* Subscription History Modal */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title="Subscription Ledger History"
        subtitle={`Immutable historical snapshot records for ${memberForHistory?.full_name}`}
        size="lg"
      >
        <div className="space-y-3 text-xs">
          {loadingHistory ? (
            <div className="p-8 text-center text-slate-400">Loading subscription records...</div>
          ) : subscriptionHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No prior subscription records found for this member.</div>
          ) : (
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                    <th className="py-2 px-3">Plan Snapshot</th>
                    <th className="py-2 px-3">Start Date</th>
                    <th className="py-2 px-3">End Date</th>
                    <th className="py-2 px-3">Fee Snapshot</th>
                    <th className="py-2 px-3">Sub Status</th>
                    <th className="py-2 px-3">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptionHistory.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{sub.plan_name_snapshot}</td>
                      <td className="py-2.5 px-3 font-mono">{formatDate(sub.start_date)}</td>
                      <td className="py-2.5 px-3 font-mono">{formatDate(sub.end_date)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{formatCurrency(sub.price_paid)}</td>
                      <td className="py-2.5 px-3"><StatusBadge status={sub.subscription_status} /></td>
                      <td className="py-2.5 px-3"><StatusBadge status={sub.payment_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setHistoryModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MembersPage;
