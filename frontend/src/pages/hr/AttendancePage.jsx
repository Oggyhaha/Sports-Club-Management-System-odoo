import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, RefreshCw, AlertCircle, Edit3, ArrowRightCircle, UserCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import attendanceService from '../../services/attendanceService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ROLES } from '../../config/constants';
import { formatDate, formatDateTime } from '../../utils/formatters';

export const AttendancePage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noEmployeeProfile, setNoEmployeeProfile] = useState(false);

  // Punch Action States
  const [punchingIn, setPunchingIn] = useState(false);
  const [punchingOut, setPunchingOut] = useState(false);

  // Correction Modal (HR / Owner only)
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [recordToCorrect, setRecordToCorrect] = useState(null);
  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');
  const [newStatus, setNewStatus] = useState('present');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [correctionError, setCorrectionError] = useState('');

  const { roles, user } = useAuth();
  const { showToast } = useToast();
  const canAuditHR = roles.includes(ROLES.OWNER) || roles.includes(ROLES.HR_STAFF);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setNoEmployeeProfile(false);
    try {
      if (canAuditHR) {
        // Administrative queue across all employees for selected date
        const data = await attendanceService.getAttendance({ date: selectedDate });
        setRecords(data || []);
      } else {
        // Employee self-service personal attendance
        const data = await attendanceService.getMyAttendance();
        setRecords(data || []);
      }
    } catch (err) {
      if (err.status === 404 || err.response?.status === 404) {
        setNoEmployeeProfile(true);
      } else {
        showToast?.('Failed to load attendance logs.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [canAuditHR, selectedDate, showToast]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleSelfCheckIn = async () => {
    setPunchingIn(true);
    try {
      await attendanceService.checkIn();
      showToast?.('Clock-in punch recorded successfully!', 'success');
      loadAttendance();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Clock-in failed.';
      showToast?.(msg, 'error');
    } finally {
      setPunchingIn(false);
    }
  };

  const handleSelfCheckOut = async () => {
    setPunchingOut(true);
    try {
      await attendanceService.checkOut();
      showToast?.('Clock-out punch recorded successfully!', 'success');
      loadAttendance();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Clock-out failed.';
      showToast?.(msg, 'error');
    } finally {
      setPunchingOut(false);
    }
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!correctionReason.trim() || correctionReason.trim().length < 3) {
      setCorrectionError('Mandatory audit reason must be at least 3 characters.');
      return;
    }
    setSubmittingCorrection(true);
    setCorrectionError('');

    try {
      const payload = {
        correction_reason: correctionReason.trim(),
        status: newStatus,
      };
      if (newCheckIn) payload.check_in_time = `${selectedDate}T${newCheckIn}:00`;
      if (newCheckOut) payload.check_out_time = `${selectedDate}T${newCheckOut}:00`;

      await attendanceService.correctAttendance(recordToCorrect.id, payload);
      showToast?.('Attendance record corrected and audited.', 'success');
      setCorrectionModalOpen(false);
      setRecordToCorrect(null);
      loadAttendance();
    } catch (err) {
      setCorrectionError(err.response?.data?.detail || err.message || 'Failed to correct attendance.');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Attendance & Time Clock"
        subtitle={
          canAuditHR
            ? 'Club-wide employee clock punches, daily shifts, and HR audit punch corrections.'
            : 'Personal attendance records, daily check-in, and shift logging.'
        }
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Attendance' }]}
        actions={
          <div className="flex items-center gap-2">
            {canAuditHR && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900"
              />
            )}
            <Button variant="outline" size="sm" onClick={loadAttendance} isLoading={loading} leftIcon={RefreshCw}>
              Refresh
            </Button>
          </div>
        }
      />

      {/* Non-linked Account Warning */}
      {noEmployeeProfile && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
          <p className="font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            No Employee Profile Linked
          </p>
          <p className="mt-1 text-amber-800">
            No employee profile is linked to this authenticated user account. Please contact an HR administrator to associate your account with an active employee profile to punch in/out.
          </p>
        </div>
      )}

      {/* Self-Service Punch Station */}
      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-gradient-to-r from-sky-50 via-white to-slate-50 border-sky-100">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Employee Punch Terminal</h3>
            <p className="text-xs text-slate-500">Record your daily shift arrival and departure timestamps.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="primary"
            size="md"
            onClick={handleSelfCheckIn}
            isLoading={punchingIn}
            disabled={noEmployeeProfile}
            leftIcon={UserCheck}
          >
            Clock In
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={handleSelfCheckOut}
            isLoading={punchingOut}
            disabled={noEmployeeProfile}
            leftIcon={ArrowRightCircle}
          >
            Clock Out
          </Button>
        </div>
      </Card>

      {/* Attendance Table */}
      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading attendance records...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            {canAuditHR
              ? `No attendance records logged for ${formatDate(selectedDate)}.`
              : 'No personal attendance records logged yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  {canAuditHR && <th className="py-2.5 px-4">Employee</th>}
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Check-In</th>
                  <th className="py-2.5 px-4">Check-Out</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Audit / Notes</th>
                  {canAuditHR && <th className="py-2.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 font-mono text-slate-700">
                    {canAuditHR && (
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                        {r.employee?.first_name} {r.employee?.last_name}
                        <span className="text-3xs text-slate-400 block font-mono">{r.employee?.employee_code}</span>
                      </td>
                    )}
                    <td className="py-3 px-4 text-slate-500 font-sans">
                      {formatDate(r.date || r.check_in_time)}
                    </td>
                    <td className="py-3 px-4 text-emerald-700 font-semibold">
                      {r.check_in_time ? formatDateTime(r.check_in_time).split(',')[1] : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {r.check_out_time ? formatDateTime(r.check_out_time).split(',')[1] : 'Open / In Shift'}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <StatusBadge status={r.status || 'present'} />
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-500 text-2xs">
                      {r.correction_reason ? (
                        <span className="text-amber-700">Corrected: {r.correction_reason}</span>
                      ) : (
                        r.notes || 'Normal punch'
                      )}
                    </td>
                    {canAuditHR && (
                      <td className="py-3 px-4 text-right font-sans">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRecordToCorrect(r);
                            setNewCheckIn(r.check_in_time ? r.check_in_time.substring(11, 16) : '09:00');
                            setNewCheckOut(r.check_out_time ? r.check_out_time.substring(11, 16) : '18:00');
                            setNewStatus(r.status || 'present');
                            setCorrectionReason('');
                            setCorrectionError('');
                            setCorrectionModalOpen(true);
                          }}
                          leftIcon={Edit3}
                        >
                          Correct
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* HR Punch Correction Modal */}
      {canAuditHR && (
        <Modal
          isOpen={correctionModalOpen}
          onClose={() => setCorrectionModalOpen(false)}
          title="HR Attendance Punch Correction"
          subtitle={`Audited modification for ${recordToCorrect?.employee?.first_name || 'Staff'}`}
        >
          <form onSubmit={handleSaveCorrection} className="space-y-4 text-xs">
            {correctionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium">
                {correctionError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Check-In Time</label>
                <input
                  type="time"
                  value={newCheckIn}
                  onChange={(e) => setNewCheckIn(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Check-Out Time</label>
                <input
                  type="time"
                  value={newCheckOut}
                  onChange={(e) => setNewCheckOut(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Status Override</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
              >
                <option value="present">Present</option>
                <option value="half_day">Half Day</option>
                <option value="absent">Absent</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Mandatory Audit Reason *</label>
              <textarea
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="e.g. Employee forgot punch card; verified with shift supervisor."
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setCorrectionModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={submittingCorrection}>
                Save & Audit Punch
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AttendancePage;
