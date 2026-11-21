import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, RefreshCw, Clock } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import CreateBookingModal from '../../components/reception/CreateBookingModal';
import bookingService from '../../services/bookingService';
import courtService from '../../services/courtService';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatters';

export const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [courtFilter, setCourtFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilter) params.target_date = dateFilter;
      if (courtFilter) params.court_id = courtFilter;
      if (statusFilter) params.status = statusFilter;

      const [bookingsData, courtsData] = await Promise.all([
        bookingService.getBookings(params),
        courtService.getCourts(),
      ]);
      setBookings(bookingsData || []);
      setCourts(courtsData || []);
    } catch (err) {
      showToast?.('Failed to load court reservations.', 'error');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, courtFilter, statusFilter, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    setCancelling(true);
    try {
      await bookingService.cancelBooking(bookingToCancel.id);
      showToast?.('Booking reservation cancelled successfully.', 'success');
      setCancelModalOpen(false);
      setBookingToCancel(null);
      loadData();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to cancel booking.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Court Reservations"
        subtitle="Manage reservation history, walk-in customer bookings, hourly pricing, and slot releases."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Bookings' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsBookingModalOpen(true)}
            leftIcon={Plus}
          >
            New Reservation
          </Button>
        }
      />

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-2xs font-semibold text-slate-500 block mb-1">Target Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
            />
          </div>

          <div>
            <label className="text-2xs font-semibold text-slate-500 block mb-1">Court</label>
            <select
              value={courtFilter}
              onChange={(e) => setCourtFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white capitalize"
            >
              <option value="">All Courts</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-2xs font-semibold text-slate-500 block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {(dateFilter || courtFilter || statusFilter) && (
            <div className="pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFilter('');
                  setCourtFilter('');
                  setStatusFilter('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={loadData} isLoading={loading} leftIcon={RefreshCw}>
          Refresh
        </Button>
      </div>

      {/* Bookings Table */}
      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading bookings repository...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No reservations found matching the selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Court</th>
                  <th className="py-2.5 px-4">Date & Time</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4 text-right">Fee (INR)</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {b.court?.name || 'Court'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {formatDateTime(b.start_time)} (60m)
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
        onSuccess={loadData}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Court Reservation"
        message="Are you sure you want to cancel this booking? The slot will be released immediately."
        confirmText="Confirm Cancellation"
        confirmVariant="danger"
        isLoading={cancelling}
      />
    </div>
  );
};

export default BookingsPage;
