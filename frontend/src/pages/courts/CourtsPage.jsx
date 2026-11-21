import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Plus, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import courtService from '../../services/courtService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ROLES } from '../../config/constants';
import { formatCurrency } from '../../utils/formatters';

const SPORT_OPTIONS = [
  { value: 'badminton', label: 'Badminton' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'squash', label: 'Squash' },
  { value: 'cricket', label: 'Cricket' },
];

export const CourtsPage = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState(null);
  const [name, setName] = useState('');
  const [sportType, setSportType] = useState('badminton');
  const [hourlyRate, setHourlyRate] = useState('400.00');
  const [walkInRate, setWalkInRate] = useState('500.00');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { roles } = useAuth();
  const { showToast } = useToast();
  const isOwner = roles.includes(ROLES.OWNER);

  const loadCourts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await courtService.getCourts();
      setCourts(data || []);
    } catch (err) {
      showToast?.('Failed to load courts catalog.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCourts();
  }, [loadCourts]);

  const openCreateModal = () => {
    setEditingCourt(null);
    setName('');
    setSportType('badminton');
    setHourlyRate('400.00');
    setWalkInRate('500.00');
    setIsActive(true);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (court) => {
    setEditingCourt(court);
    setName(court.name);
    setSportType(court.sport_type);
    setHourlyRate(String(court.hourly_rate));
    setWalkInRate(String(court.walk_in_rate || court.hourly_rate));
    setIsActive(court.is_active);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveCourt = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        name,
        sport_type: sportType,
        hourly_rate: hourlyRate,
        walk_in_rate: walkInRate,
        is_active: isActive,
      };

      if (editingCourt) {
        await courtService.updateCourt(editingCourt.id, payload);
        showToast?.('Court facility updated successfully!', 'success');
      } else {
        await courtService.createCourt(payload);
        showToast?.('New court registered successfully!', 'success');
      }
      setIsModalOpen(false);
      loadCourts();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to save court.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Courts & Sports Facilities"
        subtitle="Facility inventory, sport categories, member hourly rates, and walk-in pricing."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Courts' }]}
        actions={
          isOwner && (
            <Button variant="primary" size="sm" onClick={openCreateModal} leftIcon={Plus}>
              Register New Court
            </Button>
          )
        }
      />

      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading court inventory...</div>
        ) : courts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No sports courts configured.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Court Name</th>
                  <th className="py-2.5 px-4">Sport Category</th>
                  <th className="py-2.5 px-4 text-right">Member Hourly Rate</th>
                  <th className="py-2.5 px-4 text-right">Walk-in Rate</th>
                  <th className="py-2.5 px-4">Operating Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courts.map((court) => (
                  <tr key={court.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-semibold text-slate-900">{court.name}</td>
                    <td className="py-3 px-4 capitalize text-slate-700">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-2xs">
                        {court.sport_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(court.hourly_rate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {formatCurrency(court.walk_in_rate || court.hourly_rate)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={court.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isOwner && (
                        <Button variant="outline" size="sm" onClick={() => openEditModal(court)}>
                          Edit Court
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

      {/* Create / Edit Court Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCourt ? 'Edit Court Facility' : 'Register New Court'}
        subtitle="Manage sports facility hourly pricing and status"
      >
        <form onSubmit={handleSaveCourt} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Court Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Badminton Court 4"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Sport Type *</label>
            <select
              value={sportType}
              onChange={(e) => setSportType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
              required
            >
              {SPORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Member Hourly Rate (INR) *</label>
              <input
                type="text"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="400.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Walk-in Rate (INR) *</label>
              <input
                type="text"
                value={walkInRate}
                onChange={(e) => setWalkInRate(e.target.value)}
                placeholder="500.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="court-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="court-active" className="text-slate-700 font-medium cursor-pointer">
              Facility is active and open for bookings
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              {editingCourt ? 'Update Facility' : 'Register Facility'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CourtsPage;
