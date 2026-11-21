import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import bookingService from '../../services/bookingService';
import memberService from '../../services/memberService';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/formatters';

export const CreateBookingModal = ({
  isOpen,
  onClose,
  courts = [],
  initialCourt = null,
  initialDate = '',
  initialTime = '08:00',
  onSuccess,
}) => {
  const [courtId, setCourtId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [isWalkIn, setIsWalkIn] = useState(true);
  const [memberId, setMemberId] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setCourtId(initialCourt?.id || (courts[0]?.id ?? ''));
      setTargetDate(initialDate || new Date().toISOString().split('T')[0]);
      setStartTime(initialTime || '08:00');
      setErrorMsg('');

      // Fetch active members list for dropdown
      setLoadingMembers(true);
      memberService
        .getMembers({ status: 'active' })
        .then((data) => setMembers(data || []))
        .catch(() => setMembers([]))
        .finally(() => setLoadingMembers(false));
    }
  }, [isOpen, initialCourt, initialDate, initialTime, courts]);

  const selectedCourt = courts.find((c) => c.id === courtId);
  const selectedMember = members.find((m) => m.id === memberId);

  // Dynamic fee calculation preview
  let estimatedFee = selectedCourt?.walk_in_rate || selectedCourt?.hourly_rate || 0;
  if (!isWalkIn && selectedMember && selectedCourt) {
    const discount = selectedMember.court_discount_percent || 0;
    estimatedFee = Number(selectedCourt.hourly_rate) * (1 - discount / 100);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courtId) {
      setErrorMsg('Please select a court.');
      return;
    }
    if (!targetDate || !startTime) {
      setErrorMsg('Date and start time are required.');
      return;
    }
    if (isWalkIn && (!walkInName || !walkInPhone)) {
      setErrorMsg('Walk-in name and contact phone are required.');
      return;
    }
    if (!isWalkIn && !memberId) {
      setErrorMsg('Please select a club member.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      // Backend requires ISO 8601 string aligned to 30-min boundary in Asia/Kolkata (IST: +05:30)
      const startDateTimeStr = `${targetDate}T${startTime}:00+05:30`;

      const payload = {
        court_id: courtId,
        start_time: startDateTimeStr,
      };

      if (isWalkIn) {
        payload.walk_in_name = walkInName;
        payload.walk_in_phone = walkInPhone;
      } else {
        payload.member_id = memberId;
      }

      const res = await bookingService.createBooking(payload);
      showToast?.('Court booking confirmed successfully!', 'success');
      onSuccess?.(res);
      onClose();
    } catch (err) {
      const detail =
        err.response?.data?.detail || err.message || 'Failed to create booking reservation.';
      setErrorMsg(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Court Reservation"
      subtitle="Standard 60-minute reservation slot (06:00–22:00 IST)"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Member vs Walk-in Toggle */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setIsWalkIn(true)}
            className={`flex-1 py-1.5 font-medium rounded-md text-center transition-all cursor-pointer ${
              isWalkIn ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
            }`}
          >
            Walk-in Customer
          </button>
          <button
            type="button"
            onClick={() => setIsWalkIn(false)}
            className={`flex-1 py-1.5 font-medium rounded-md text-center transition-all cursor-pointer ${
              !isWalkIn ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
            }`}
          >
            Club Member
          </button>
        </div>

        {/* Customer Info */}
        {isWalkIn ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Customer Full Name *</label>
              <input
                type="text"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 text-slate-900"
                required
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block font-medium text-slate-700 mb-1">Select Member *</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 text-slate-900"
              required
            >
              <option value="">-- Choose Member --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.email}) • {m.plan_name || 'Standard'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Court & Date Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Court / Facility *</label>
            <select
              value={courtId}
              onChange={(e) => setCourtId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 text-slate-900 capitalize"
              required
            >
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.sport_type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Reservation Date *</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 text-slate-900"
              required
            />
          </div>
        </div>

        {/* Start Time Slot */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Start Time (30-min steps) *
            </label>
            <input
              type="time"
              step="1800"
              min="06:00"
              max="21:00"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 text-slate-900"
              required
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Duration</label>
            <input
              type="text"
              value="60 Minutes (Standard slot)"
              disabled
              className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-500"
            />
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-lg flex items-center justify-between">
          <span className="font-medium text-sky-900">Calculated Booking Rate:</span>
          <span className="font-bold font-mono text-sm text-sky-950">
            {formatCurrency(estimatedFee)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
            Confirm Reservation
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateBookingModal;
