import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, Activity, PlusCircle, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import CourtScheduleMatrix from '../../components/reception/CourtScheduleMatrix';
import CreateBookingModal from '../../components/reception/CreateBookingModal';
import courtService from '../../services/courtService';
import bookingService from '../../services/bookingService';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatters';

export const ReceptionDashboardPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [courts, setCourts] = useState([]);
  const [availability, setAvailability] = useState({});
  const [todayBookings, setTodayBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedCourtForBooking, setSelectedCourtForBooking] = useState(null);
  const [selectedTimeForBooking, setSelectedTimeForBooking] = useState('08:00');

  // Cancel Confirmation State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const { showToast } = useToast();

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [courtsData, availData, bookingsData] = await Promise.all([
        courtService.getCourts({ is_active: true }),
        bookingService.checkAvailability(selectedDate),
        bookingService.getBookings({ target_date: selectedDate }),
      ]);
      setCourts(courtsData || []);
      setAvailability(availData || {});
      setTodayBookings(bookingsData || []);
    } catch (err) {
      showToast?.('Failed to load reception shift schedule.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, showToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSelectSlot = (court, slot) => {
    setSelectedCourtForBooking(court);
    setSelectedTimeForBooking(slot);
    setIsBookingModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    setCancelling(true);
    try {
      await bookingService.cancelBooking(bookingToCancel.id);
      showToast?.('Booking reservation cancelled and slot released.', 'success');
      setCancelModalOpen(false);
      setBookingToCancel(null);
      loadDashboardData();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to cancel reservation.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const activeBookings = todayBookings.filter((b) => b.status === 'confirmed');
  const walkInCount = todayBookings.filter((b) => b.is_walk_in && b.status === 'confirmed').length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Reception & Front Desk"
        subtitle="Live court matrix, member reservations, walk-in check-in, and shift coordination."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Reception Desk' }]}
        actions={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboardData}
              isLoading={loading}
              leftIcon={RefreshCw}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedCourtForBooking(null);
                setSelectedTimeForBooking('08:00');
                setIsBookingModalOpen(true);
              }}
              leftIcon={PlusCircle}
            >
              New Reservation
            </Button>
          </div>
        }
      />

      {/* Shift Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Active Facilities</p>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">{courts.length} Courts</p>
          <p className="text-2xs text-slate-400 mt-0.5">Badminton, Tennis, Squash</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Confirmed Bookings</p>
          <p className="text-xl font-bold font-mono text-sky-700 mt-1">{activeBookings.length}</p>
          <p className="text-2xs text-slate-400 mt-0.5">On {formatDate(selectedDate)}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Walk-in Reservations</p>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">{walkInCount}</p>
          <p className="text-2xs text-slate-400 mt-0.5">Reception intake</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Shift Operating Hours</p>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">16h Daily</p>
          <p className="text-2xs text-slate-400 mt-0.5">06:00 – 22:00 IST</p>
        </div>
      </div>

      {/* Interactive Court Schedule Matrix */}
      <CourtScheduleMatrix
        courts={courts}
        availability={availability}
        selectedDate={selectedDate}
        onSelectSlot={handleSelectSlot}
        loading={loading}
      />

      {/* Reservations List for the Selected Date */}
      <Card
        title={`Reservations on ${formatDate(selectedDate)}`}
        subtitle="Manage slots, check customer status, and process cancellations"
        noPadding
      >
        {todayBookings.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No reservations scheduled on this date. Click any available green slot above to book.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Court</th>
                  <th className="py-2.5 px-4">Time Slot</th>
                  <th className="py-2.5 px-4">Customer / Member</th>
                  <th className="py-2.5 px-4 text-right">Fee (INR)</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {b.court?.name || 'Court'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {formatDateTime(b.start_time).split(',')[1]?.trim() || b.start_time} (60m)
                    </td>
                    <td className="py-3 px-4">
                      {b.is_walk_in ? (
                        <div>
                          <span className="font-semibold text-slate-900">{b.walk_in_name}</span>
                          <span className="ml-2 text-2xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Walk-In
                          </span>
                          <p className="text-3xs text-slate-400">{b.walk_in_phone}</p>
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-slate-900">{b.member?.full_name || 'Member'}</span>
                          <span className="ml-2 text-2xs px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                            Member
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(b.final_fee || b.total_fee || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {b.status === 'confirmed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            setBookingToCancel(b);
                            setCancelModalOpen(true);
                          }}
                        >
                          Cancel
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

      {/* Booking Modal */}
      <CreateBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        courts={courts}
        initialCourt={selectedCourtForBooking}
        initialDate={selectedDate}
        initialTime={selectedTimeForBooking}
        onSuccess={loadDashboardData}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Court Reservation"
        message={`Are you sure you want to cancel the reservation for ${
          bookingToCancel?.is_walk_in ? bookingToCancel?.walk_in_name : 'the member'
        }? This releases the slot immediately for new bookings.`}
        confirmText="Cancel Reservation"
        confirmVariant="danger"
        isLoading={cancelling}
      />
    </div>
  );
};

export default ReceptionDashboardPage;
