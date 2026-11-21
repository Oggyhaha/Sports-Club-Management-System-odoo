import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, RefreshCw, Calendar, Clock, Trophy } from 'lucide-react';
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
  const [sportType, setSportType] = useState('badminton');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(12);
  const [feePerPlayer, setFeePerPlayer] = useState('150.00');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cancel Confirmation
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

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
      await bookingService.createSocialSession({
        court_id: courtId,
        title,
        sport_type: sportType,
        start_time: startTime,
        end_time: endTime,
        max_participants: Number(maxParticipants),
        fee_per_player: feePerPlayer,
      });
      showToast?.('Social play session scheduled!', 'success');
      setIsModalOpen(false);
      loadSessions();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to schedule social play.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinSession = async (sessionId) => {
    try {
      await bookingService.joinSocialSession(sessionId);
      showToast?.('Successfully joined social play session!', 'success');
      loadSessions();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Could not join session.', 'error');
    }
  };

  const handleLeaveSession = async (sessionId) => {
    try {
      await bookingService.leaveSocialSession(sessionId);
      showToast?.('Left social play session.', 'info');
      loadSessions();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to leave session.', 'error');
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
      showToast?.(err.response?.data?.detail || 'Failed to cancel session.', 'error');
    } finally {
      setCancelling(false);
    }
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
                setTitle('Friday Badminton Mixer');
                setSportType('badminton');
                setStartTime(new Date().toISOString().substring(0, 16));
                setEndTime(new Date().toISOString().substring(0, 16));
                setIsModalOpen(true);
              }}
              leftIcon={Plus}
            >
              Schedule Session
            </Button>
          )
        }
      />

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading social play sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
          No communal social play sessions scheduled.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((s) => {
            const registeredCount = s.participants?.length || s.current_participants_count || 0;
            const isFull = registeredCount >= s.max_participants;
            const isParticipant = s.participants?.some((p) => p.user_id === user?.id || p.member_id === user?.member_profile?.id);

            return (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all duration-150 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-800 uppercase tracking-wide">
                        {s.sport_type}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{s.title}</h3>
                      <p className="text-xs text-slate-500">{s.court?.name || 'Court'}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateTime(s.start_time)} to {formatDateTime(s.end_time).split(',')[1]}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-slate-500">Player Capacity:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {registeredCount} / {s.max_participants} {isFull && '(FULL)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Entry Fee:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(s.fee_per_player)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {s.status === 'scheduled' && (
                    <>
                      {isParticipant ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => handleLeaveSession(s.id)}
                        >
                          Leave Session
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isFull}
                          onClick={() => handleJoinSession(s.id)}
                        >
                          {isFull ? 'Session Full' : 'Join Session'}
                        </Button>
                      )}
                    </>
                  )}

                  {isStaff && s.status === 'scheduled' && (
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Friday Social Play"
        subtitle="Organize open communal mixers and court slots"
      >
        <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">Session Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Friday Night Badminton Doubles"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Court / Facility *</label>
              <select
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
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
              <label className="block font-medium text-slate-700 mb-1">Sport Type *</label>
              <select
                value={sportType}
                onChange={(e) => setSportType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                required
              >
                <option value="badminton">Badminton</option>
                <option value="tennis">Tennis</option>
                <option value="squash">Squash</option>
                <option value="cricket">Cricket</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Start Date & Time *</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">End Date & Time *</label>
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
              <label className="block font-medium text-slate-700 mb-1">Max Participants *</label>
              <input
                type="number"
                min="2"
                max="50"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Fee Per Player (INR) *</label>
              <input
                type="text"
                value={feePerPlayer}
                onChange={(e) => setFeePerPlayer(e.target.value)}
                placeholder="150.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Schedule Session
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation */}
      <ConfirmationDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Social Play Session"
        message="Are you sure you want to cancel this social play session? Registered participants will be notified."
        confirmText="Confirm Cancellation"
        confirmVariant="danger"
        isLoading={cancelling}
      />
    </div>
  );
};

export default SocialPlayPage;
