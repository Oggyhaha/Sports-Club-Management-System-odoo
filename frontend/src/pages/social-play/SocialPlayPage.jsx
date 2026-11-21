import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, RefreshCw, Calendar, Clock, Trophy, CheckCircle, XCircle } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import bookingService from '../../services/bookingService';
import courtService from '../../services/courtService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ROLES } from '../../config/constants';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

export const SocialPlayPage = () => {
  const [sessions, setSessions] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Session Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courtId, setCourtId] = useState('');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(8);
  const [feePerParticipant, setFeePerParticipant] = useState('150.00');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cancel Confirmation
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Participant List Modal
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  const [selectedSessionForParticipants, setSelectedSessionForParticipants] = useState(null);

  const { roles, user } = useAuth();
  const { showToast } = useToast();
  const isStaff = roles.includes(ROLES.OWNER) || roles.includes(ROLES.RECEPTIONIST);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsData, courtsData] = await Promise.all([
        bookingService.getSocialSessions(),
        courtService.getCourts({ is_active: true }),
      ]);
      setSessions(sessionsData || []);
      setCourts(courtsData || []);
    } catch (err) {
      showToast?.('Failed to load social play sessions.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!courtId || !title || !startTime || !endTime) {
      setErrorMsg('Please complete all required fields.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');

    try {
      // Align to IST (+05:30)
      const startIso = startTime.includes('+') ? startTime : `${startTime}:00+05:30`;
      const endIso = endTime.includes('+') ? endTime : `${endTime}:00+05:30`;

      await bookingService.createSocialSession({
        court_id: courtId,
        title,
        start_time: startIso,
        end_time: endIso,
        max_capacity: Number(maxCapacity),
        fee_per_participant: feePerParticipant,
      });
      showToast?.('Friday social play session scheduled successfully!', 'success');
      setIsModalOpen(false);
      loadSessions();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to schedule social play.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinSession = async (sessionId) => {
    try {
      await bookingService.joinSocialSession(sessionId);
      showToast?.('Successfully registered for social play session!', 'success');
      loadSessions();
    } catch (err) {
      showToast?.(err.response?.data?.detail || err.message || 'Could not join session.', 'error');
    }
  };

  const handleLeaveSession = async (sessionId) => {
    try {
      await bookingService.leaveSocialSession(sessionId);
      showToast?.('Left social play session.', 'info');
      loadSessions();
    } catch (err) {
      showToast?.(err.response?.data?.detail || err.message || 'Failed to leave session.', 'error');
    }
  };

  const handleConfirmCancel = async () => {
    if (!sessionToCancel) return;
    setCancelling(true);
    try {
      await bookingService.cancelSocialSession(sessionToCancel.id);
      showToast?.('Social play session cancelled.', 'success');
      setCancelModalOpen(false);
      setSessionToCancel(null);
      loadSessions();
    } catch (err) {
      showToast?.(err.response?.data?.detail || err.message || 'Failed to cancel session.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const openParticipants = (session) => {
    setSelectedSessionForParticipants(session);
    setParticipantModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Friday Social Play"
        subtitle="Communal sports mixers, round-robin sessions, and weekend club play."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Social Play' }]}
        actions={
          isStaff && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCourtId(courts[0]?.id || '');
                setTitle('Friday Social Mixer');
                const now = new Date();
                const defaultStart = new Date(now.getTime() + 86400000).toISOString().substring(0, 16);
                const defaultEnd = new Date(now.getTime() + 86400000 + 7200000).toISOString().substring(0, 16);
                setStartTime(defaultStart);
                setEndTime(defaultEnd);
                setMaxCapacity(8);
                setFeePerParticipant('150.00');
                setErrorMsg('');
                setIsModalOpen(true);
              }}
              leftIcon={Plus}
            >
              Schedule Session
            </Button>
          )
        }
      />

      <div className="flex items-center justify-between text-xs text-slate-500">
        <p>Social play mixers reserve courts for communal, multi-member casual gameplay.</p>
        <Button variant="outline" size="sm" onClick={loadSessions} isLoading={loading} leftIcon={RefreshCw}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading social play sessions...</div>
      ) : sessions.length === 0 ? (
        <Card className="text-center py-12 text-slate-500 text-xs">
          <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p>No communal social play sessions currently scheduled.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((s) => {
            const count = s.active_participants_count ?? s.participants?.length ?? 0;
            const cap = s.max_capacity || 8;
            const isFull = count >= cap;
            const isParticipant = s.participants?.some(
              (p) => (p.member_id === user?.id || p.member?.user_id === user?.id) && p.status === 'registered'
            );

            return (
              <Card key={s.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-800 uppercase tracking-wide">
                        {s.court?.sport_type || 'Court Sport'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{s.title}</h3>
                      <p className="text-xs text-slate-500">{s.court?.name || 'Allocated Court'}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateTime(s.start_time)} – {formatDateTime(s.end_time)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-slate-500">Player Capacity:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {count} / {cap} {isFull && <span className="text-rose-600 font-bold ml-1">(FULL)</span>}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Entry Fee:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(s.fee_per_participant)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openParticipants(s)}
                    leftIcon={Users}
                  >
                    Roster ({count})
                  </Button>

                  <div className="flex items-center gap-1.5">
                    {s.status === 'scheduled' && (
                      <>
                        {isParticipant ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={() => handleLeaveSession(s.id)}
                          >
                            Leave
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isFull}
                            onClick={() => handleJoinSession(s.id)}
                          >
                            {isFull ? 'Full' : 'Join Play'}
                          </Button>
                        )}

                        {isStaff && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-rose-600"
                            onClick={() => {
                              setSessionToCancel(s);
                              setCancelModalOpen(true);
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Schedule Social Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Friday Social Session"
        subtitle="Reserve a court facility for an open social play session"
      >
        <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Session Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Friday Night Badminton Mixer"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Allocate Court *</label>
            <select
              value={courtId}
              onChange={(e) => setCourtId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
              required
            >
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.sport_type} • {formatCurrency(c.hourly_rate)}/hr)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Start Time *</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">End Time *</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Max Capacity (2–32) *</label>
              <input
                type="number"
                min="2"
                max="32"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Fee per Player (INR) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={feePerParticipant}
                onChange={(e) => setFeePerParticipant(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Schedule Mixer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Participants Roster Modal */}
      <Modal
        isOpen={participantModalOpen}
        onClose={() => setParticipantModalOpen(false)}
        title="Session Participants Roster"
        subtitle={selectedSessionForParticipants?.title}
      >
        <div className="space-y-3 text-xs">
          {(!selectedSessionForParticipants?.participants || selectedSessionForParticipants.participants.length === 0) ? (
            <p className="text-slate-500 py-6 text-center">No participants have joined this session yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {selectedSessionForParticipants.participants.map((p) => (
                <li key={p.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{p.member?.full_name || 'Registered Member'}</p>
                    <p className="text-3xs text-slate-400 font-mono">{p.member?.email || 'member'}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setParticipantModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Session Confirmation */}
      <ConfirmationDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Social Play Session"
        message={`Are you sure you want to cancel '${sessionToCancel?.title}'? This will notify all registered players and release the court.`}
        confirmText="Cancel Session"
        variant="danger"
        isLoading={cancelling}
      />
    </div>
  );
};

export default SocialPlayPage;
