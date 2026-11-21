import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, RefreshCw, AlertCircle, Edit3, ArrowRightCircle } from 'lucide-react';
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

  // Correction Modal
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [recordToCorrect, setRecordToCorrect] = useState(null);
  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');
  const [newStatus, setNewStatus] = useState('present');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [correctionError, setCorrectionError] = useState('');

  const { roles } = useAuth();
  const { showToast } = useToast();
  const canAuditHR = roles.includes(ROLES.OWNER) || roles.includes(ROLES.HR_STAFF);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const data = await attendanceService.getAttendance({ attendance_date: selectedDate });
      setRecords(data || []);
    } catch (err) {
      showToast?.('Failed to load attendance logs.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, showToast]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleSelfCheckIn = async () => {
    try {
      await attendanceService.checkIn();
      showToast?.('Clocked in successfully!', 'success');
      loadAttendance();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Clock-in failed.', 'error');
    }
  };

  const handleSelfCheckOut = async () => {
    try {
      await attendanceService.checkOut();
      showToast?.('Clocked out successfully!', 'success');
      loadAttendance();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Clock-out failed.', 'error');
    }
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!correctionReason.trim()) {
      setCorrectionError('Mandatory audit reason required for manual punch correction.');
      return;
    }
    setSubmittingCorrection(true);
    setCorrectionError('');

    try {
      await attendanceService.correctAttendance(recordToCorrect.id, {
        check_in_time: newCheckIn ? `${selectedDate}T${newCheckIn}:00` : null,
        check_out_time: newCheckOut ? `${selectedDate}T${newCheckOut}:00` : null,
        status: newStatus,
        correction_reason: correctionReason.trim(),
      });
      showToast?.('Attendance record corrected and audited.', 'success');
      setCorrectionModalOpen(false);
      setRecordToCorrect(null);
      loadAttendance();
    } catch (err) {
      setCorrectionError(err.response?.data?.detail || 'Failed to correct attendance.');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const presentCount = records.filter((r) => r.status === 'present').length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Attendance Tracking & Audit Logs"
        subtitle="Daily staff clock-in/clock-out records, working hours verification, and HR punch corrections."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Attendance' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSelfCheckIn} leftIcon={Clock}>
              Clock In
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSelfCheckOut} leftIcon={ArrowRightCircle}>
              Clock Out
            </Button>
          </div>
        }
      />

      {/* Date Filter & Shift Stats */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <label className="font-semibold text-slate-600">Attendance Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
          />
        </div>

        <div className="flex items-center gap-4">
          <span className="text-slate-600">
            Total Logged: <strong>{records.length}</strong>
          </span>
          <span className="text-emerald-700">
            Present: <strong>{presentCount}</strong>
          </span>
          <Button variant="outline" size="sm" onClick={loadAttendance} isLoading={loading} leftIcon={RefreshCw}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Attendance Table */}
      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading attendance records...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No attendance records logged for {formatDate(selectedDate)}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4">Check-In</th>
                  <th className="py-2.5 px-4">Check-Out</th>
                  <th className="py-2.5 px-4 text-right">Hours Logged</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Audit Notes</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">
                        {r.employee?.first_name} {r.employee?.last_name}
                      </p>
                      <p className="text-3xs text-slate-400 font-mono">
                        {r.employee?.employee_code || 'EMP'}
                      </p>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 text-2xs">
                      {r.check_in_time ? formatDateTime(r.check_in_time).split(',')[1]?.trim() : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 text-2xs">
                      {r.check_out_time ? formatDateTime(r.check_out_time).split(',')[1]?.trim() : 'Active'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {r.hours_worked ? `${Number(r.hours_worked).toFixed(1)}h` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 px-4 text-2xs text-slate-500 max-w-[200px] truncate">
                      {r.correction_reason || 'Self-service punch'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canAuditHR && (
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
                          Audit Correct
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

      {/* HR Correction Modal */}
      <Modal
        isOpen={correctionModalOpen}
        onClose={() => setCorrectionModalOpen(false)}
        title="Audit Correct Attendance Punch"
        subtitle={`Staff: ${recordToCorrect?.employee?.first_name} ${recordToCorrect?.employee?.last_name}`}
      >
        <form onSubmit={handleSaveCorrection} className="space-y-4 text-xs">
          {correctionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
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
            <label className="block font-medium text-slate-700 mb-1">Punch Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
            >
              <option value="present">Present (Full Day)</option>
              <option value="half_day">Half Day</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Audit Correction Reason (Mandatory) *
            </label>
            <textarea
              rows={3}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="e.g. Employee forgot punch badge during tournament morning shift; verified by Reception Manager."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setCorrectionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submittingCorrection}>
              Save Audit Correction
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendancePage;
