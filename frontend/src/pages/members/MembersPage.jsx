import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Search, RefreshCw, Award, Calendar, CheckCircle } from 'lucide-react';
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

  // Renew Modal
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [memberToRenew, setMemberToRenew] = useState(null);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewing, setRenewing] = useState(false);

  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const [membersData, plansData] = await Promise.all([
        memberService.getMembers(params),
        memberService.getPlans(),
      ]);
      setMembers(membersData || []);
      setPlans(plansData || []);
    } catch (err) {
      showToast?.('Failed to load member directory.', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateMember = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !phone) {
      setAddError('Full name, email, and phone are required.');
      return;
    }
    setSavingMember(true);
    setAddError('');

    try {
      const payload = { full_name: fullName, email, phone };
      if (selectedPlanId) payload.membership_plan_id = selectedPlanId;

      await memberService.createMember(payload);
      showToast?.('Member onboarded successfully!', 'success');
      setIsAddModalOpen(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setSelectedPlanId('');
      loadData();
    } catch (err) {
      setAddError(err.response?.data?.detail || 'Failed to onboard member.');
    } finally {
      setSavingMember(false);
    }
  };

  const handleRenewSubscription = async (e) => {
    e.preventDefault();
    if (!memberToRenew) return;
    setRenewing(true);

    try {
      const payload = {};
      if (renewPlanId) payload.plan_id = renewPlanId;

      await memberService.renewSubscription(memberToRenew.id, payload);
      showToast?.(`Subscription renewed for ${memberToRenew.full_name}!`, 'success');
      setRenewModalOpen(false);
      setMemberToRenew(null);
      loadData();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to renew subscription.', 'error');
    } finally {
      setRenewing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Member Directory"
        subtitle="Active club subscriptions, walk-in records, profile onboarding, and tier renewals."
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
              placeholder="Search by name, email, phone..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
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
                  <th className="py-2.5 px-4">Subscription Expiry</th>
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
                      <p className="text-3xs text-slate-400 font-mono">{m.phone}</p>
                    </td>
                    <td className="py-3 px-4">
                      {m.plan_name ? (
                        <span className="font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-2xs">
                          {m.plan_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None / Walk-In</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {m.expiry_date ? formatDate(m.expiry_date) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={m.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMemberToRenew(m);
                          setRenewPlanId(m.membership_plan_id || (plans[0]?.id ?? ''));
                          setRenewModalOpen(true);
                        }}
                      >
                        Renew Plan
                      </Button>
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
        subtitle="Register customer profile and optional initial membership plan"
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
              <label className="block font-medium text-slate-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Initial Membership Plan (Optional)</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
            >
              <option value="">-- No Plan / Walk-in Only --</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.duration_months} mo • {formatCurrency(p.price)})
                </option>
              ))}
            </select>
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

      {/* Renew Subscription Modal */}
      <Modal
        isOpen={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        title="Renew Member Subscription"
        subtitle={`Extend membership for ${memberToRenew?.full_name}`}
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
                  {p.name} ({p.duration_months} Months • {formatCurrency(p.price)} • {p.court_discount_percent}% Court Discount)
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 text-sky-900">
            <p className="font-semibold">Continuous Renewal Policy</p>
            <p className="mt-0.5 text-2xs text-sky-800">
              If the member subscription is currently active, the new duration extends seamlessly from the current expiry date.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setRenewModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={renewing}>
              Confirm Renewal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MembersPage;
