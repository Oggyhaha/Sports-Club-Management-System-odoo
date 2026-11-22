import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  CreditCard,
  ShoppingBag,
  Receipt,
  User,
  ShieldCheck,
  AlertTriangle,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  FileText,
  Percent,
  Tag,
  Phone,
  Mail,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import CourtScheduleMatrix from '../../components/reception/CourtScheduleMatrix';
import CreateBookingModal from '../../components/reception/CreateBookingModal';
import memberService from '../../services/memberService';
import bookingService from '../../services/bookingService';
import courtService from '../../services/courtService';
import shopService from '../../services/shopService';
import financeService from '../../services/financeService';
import authService from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatters';

export const MemberDashboardPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('membership'); // membership | bookings | social | shop | invoices
  const [loading, setLoading] = useState(true);
  const [memberProfile, setMemberProfile] = useState(null);
  const [isUnlinked, setIsUnlinked] = useState(false);

  // Subscriptions Ledger Modal
  const [subscriptions, setSubscriptions] = useState([]);
  const [showSubHistoryModal, setShowSubHistoryModal] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Profile Edit Modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Bookings Subsystem
  const [myBookings, setMyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [courts, setCourts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [availability, setAvailability] = useState({});
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [showMatrixView, setShowMatrixView] = useState(false);
  const [showCreateBookingModal, setShowCreateBookingModal] = useState(false);
  const [selectedCourtForBooking, setSelectedCourtForBooking] = useState(null);
  const [selectedTimeForBooking, setSelectedTimeForBooking] = useState('08:00');
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [showCancelBookingDialog, setShowCancelBookingDialog] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(false);

  // Friday Social Play Subsystem
  const [socialSessions, setSocialSessions] = useState([]);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [activeRosterSession, setActiveRosterSession] = useState(null);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [joiningSessionId, setJoiningSessionId] = useState(null);

  // Online Pro-Shop Subsystem
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [cart, setCart] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [showCancelOrderDialog, setShowCancelOrderDialog] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);

  // Invoices Subsystem
  const [myInvoices, setMyInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false);

  // Fetch Member Profile
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setIsUnlinked(false);
    try {
      const data = await memberService.getMyProfile();
      setMemberProfile(data);
      setProfileForm({
        full_name: data.full_name || user?.full_name || '',
        phone: data.phone || user?.phone || '',
      });
    } catch (err) {
      if (err.response?.status === 404) {
        setIsUnlinked(true);
      } else {
        console.error('Failed to load member profile:', err);
        showToast?.('Unable to load member profile.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showToast, user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Load Bookings Data
  const loadBookingsData = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const [bookingsData, courtsData] = await Promise.all([
        bookingService.getBookings(),
        courtService.getCourts({ is_active: true }),
      ]);
      setMyBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setCourts(Array.isArray(courtsData) ? courtsData : []);
    } catch (e) {
      console.error('Failed to load member bookings:', e);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  // Load Availability Matrix
  const loadAvailability = useCallback(async (date) => {
    setLoadingAvail(true);
    try {
      const data = await bookingService.checkAvailability(date);
      setAvailability(data || {});
    } catch (e) {
      console.error('Failed to check availability:', e);
    } finally {
      setLoadingAvail(false);
    }
  }, []);

  // Load Social Play
  const loadSocialSessions = useCallback(async () => {
    setLoadingSocial(true);
    try {
      const data = await bookingService.getSocialSessions();
      setSocialSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load social sessions:', e);
    } finally {
      setLoadingSocial(false);
    }
  }, []);

  // Load Shop Products & Orders
  const loadShopData = useCallback(async () => {
    setLoadingProducts(true);
    setLoadingOrders(true);
    try {
      const [prodsData, ordersData] = await Promise.all([
        shopService.getProducts(),
        shopService.getOrders(),
      ]);
      setProducts(Array.isArray(prodsData) ? prodsData : []);
      setMyOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (e) {
      console.error('Failed to load shop catalog or orders:', e);
    } finally {
      setLoadingProducts(false);
      setLoadingOrders(false);
    }
  }, []);

  // Load Invoices
  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const data = await financeService.getInvoices();
      setMyInvoices(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load personal invoices:', e);
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  // Trigger loads when active tab changes
  useEffect(() => {
    if (activeTab === 'bookings') {
      loadBookingsData();
      loadAvailability(selectedDate);
    } else if (activeTab === 'social') {
      loadSocialSessions();
    } else if (activeTab === 'shop') {
      loadShopData();
    } else if (activeTab === 'invoices') {
      loadInvoices();
    }
  }, [activeTab, loadBookingsData, loadAvailability, selectedDate, loadSocialSessions, loadShopData, loadInvoices]);

  // Load Subscription History
  const handleOpenSubHistory = async () => {
    if (!memberProfile?.id) return;
    setShowSubHistoryModal(true);
    setLoadingSubs(true);
    try {
      const data = await memberService.getMemberSubscriptions(memberProfile.id);
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load subscription history:', e);
      showToast?.('Unable to load subscription history ledger.', 'error');
    } finally {
      setLoadingSubs(false);
    }
  };

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await memberService.updateMyProfile({
        full_name: profileForm.full_name.trim(),
        phone: profileForm.phone.trim() || null,
      });
      showToast?.('Member contact profile updated successfully!', 'success');
      setShowProfileModal(false);
      loadProfile();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Booking Cancellation
  const handleConfirmCancelBooking = async () => {
    if (!bookingToCancel) return;
    setCancellingBooking(true);
    try {
      await bookingService.cancelBooking(bookingToCancel.id);
      showToast?.('Court reservation cancelled successfully and slot freed.', 'success');
      setShowCancelBookingDialog(false);
      setBookingToCancel(null);
      loadBookingsData();
      loadAvailability(selectedDate);
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to cancel reservation.', 'error');
    } finally {
      setCancellingBooking(false);
    }
  };

  // Handle Social Play Join/Leave
  const handleJoinSocialSession = async (sessionId) => {
    setJoiningSessionId(sessionId);
    try {
      await bookingService.joinSocialSession(sessionId);
      showToast?.('Successfully joined Friday Social Play session!', 'success');
      loadSocialSessions();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to join social session.', 'error');
    } finally {
      setJoiningSessionId(null);
    }
  };

  const handleLeaveSocialSession = async (sessionId) => {
    setJoiningSessionId(sessionId);
    try {
      await bookingService.leaveSocialSession(sessionId);
      showToast?.('Left social session and freed capacity spot.', 'success');
      loadSocialSessions();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to leave social session.', 'error');
    } finally {
      setJoiningSessionId(null);
    }
  };

  // Cart Management for Online Pro-Shop
  const handleAddToCart = (product) => {
    const existing = cart.find((i) => i.product.id === product.id);
    if (existing) {
      setCart(cart.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    showToast?.(`Added "${product.name}" to cart.`, 'success');
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter((i) => i.product.id !== productId));
  };

  const calculateCartTotals = () => {
    const subtotal = cart.reduce((acc, item) => acc + (Number(item.product.unit_price || item.product.price || 0) * item.quantity), 0);
    const shopDiscountPercent = Number(memberProfile?.plan?.shop_discount_percent || 0);
    const discount = (subtotal * shopDiscountPercent) / 100;
    const total = Math.max(0, subtotal - discount);
    return { subtotal, discount, total, shopDiscountPercent };
  };

  const handlePlaceOnlineOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmittingOrder(true);
    try {
      await shopService.createOrder({
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
        notes: orderNotes.trim() || null,
      });
      showToast?.('Online pro-shop order submitted successfully!', 'success');
      setCart([]);
      setOrderNotes('');
      loadShopData();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to submit online order.', 'error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return;
    setCancellingOrder(true);
    try {
      await shopService.cancelOrder(orderToCancel.id, 'Cancelled by member');
      showToast?.('Online order cancelled and inventory stock restored.', 'success');
      setShowCancelOrderDialog(false);
      setOrderToCancel(null);
      loadShopData();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to cancel order.', 'error');
    } finally {
      setCancellingOrder(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Welcome, ${memberProfile?.full_name || user?.full_name || 'Member'}`}
        subtitle="Manage your active membership, reserve sports courts, participate in Friday social mixers, and review personal billing statements."
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Member Portal' }]}
        actions={
          memberProfile && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProfileModal(true)}
                leftIcon={Edit2}
              >
                Edit Profile
              </Button>
            </div>
          )
        }
      />

      {/* Prospective Member / Unsubscribed Banner */}
      {(isUnlinked || !memberProfile?.is_active) && (
        <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-950">Member Profile Not Linked</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Your account is not linked to a club member profile. Please contact the front desk.
              </p>
            </div>
          </div>
          <Link
            to="/members/plans"
            className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all"
          >
            <CreditCard className="w-4 h-4" />
            <span>Choose Plan & Activate</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Member Self-Service Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('membership')}
          className={`pb-3 font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'membership'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          Active Membership & Tier
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'bookings'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Court Reservations
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`pb-3 font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'social'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Friday Social Play
        </button>
        <button
          onClick={() => setActiveTab('shop')}
          className={`pb-3 font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'shop'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Online Pro-Shop
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'invoices'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Billing & Invoices
        </button>
      </div>

      {/* ----------------- TAB A: MEMBERSHIP & BENEFITS ----------------- */}
      {activeTab === 'membership' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Membership Tier Summary Card */}
            <Card className="p-5 md:col-span-2 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      {memberProfile?.plan?.name || 'Active Membership'}
                    </h3>
                    <p className="text-2xs text-slate-500">
                      Member Account ID: <span className="font-mono">{memberProfile?.id ? memberProfile.id.substring(0, 8) : '—'}</span>
                    </p>
                  </div>
                </div>
                <StatusBadge status={memberProfile?.is_active ? 'active' : 'expired'} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 text-2xs block">Start Date:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {memberProfile?.start_date ? formatDate(memberProfile.start_date) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-2xs block">Expiry Date:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {memberProfile?.expiry_date || memberProfile?.end_date ? formatDate(memberProfile.expiry_date || memberProfile.end_date) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-2xs block">Monthly Dues:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {formatCurrency(memberProfile?.plan?.monthly_fee || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-2xs block">Plan Validity:</span>
                  <span className="font-semibold text-slate-800">
                    {memberProfile?.plan?.duration_days ? `${memberProfile.plan.duration_days} Days` : 'Annual'}
                  </span>
                </div>
              </div>

              {/* Exclusive Member Discounts Banner */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-2xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-sky-600" /> Exclusive Membership Discounts
                </span>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-2xs text-slate-500 block">Court Rentals</span>
                    <span className="text-sm font-bold text-sky-700 font-mono">
                      {memberProfile?.plan?.court_discount_percent || 0}% OFF
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-2xs text-slate-500 block">Pro-Shop Gear</span>
                    <span className="text-sm font-bold text-emerald-700 font-mono">
                      {memberProfile?.plan?.shop_discount_percent || 0}% OFF
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-2xs text-slate-500 block">Cafeteria & Bar</span>
                    <span className="text-sm font-bold text-amber-700 font-mono">
                      {memberProfile?.plan?.bar_discount_percent || 0}% OFF
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenSubHistory}
                  leftIcon={FileText}
                >
                  Subscription Ledger History
                </Button>
                <p className="text-2xs text-slate-400 italic">
                  * Membership renewals and tier changes require front-desk assistance.
                </p>
              </div>
            </Card>

            {/* Profile Overview Card */}
            <Card title="Personal Details" subtitle="Contact Information">
              <div className="text-xs space-y-3 text-slate-600">
                <div className="flex items-center gap-2.5 py-1 border-b border-slate-100">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-3xs text-slate-400 block">Full Name</span>
                    <span className="font-semibold text-slate-900">{memberProfile?.full_name || user?.full_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 py-1 border-b border-slate-100">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-3xs text-slate-400 block">Email Address</span>
                    <span className="font-medium text-slate-800">{memberProfile?.email || user?.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 py-1 border-b border-slate-100">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-3xs text-slate-400 block">Phone Number</span>
                    <span className="font-mono text-slate-800">{memberProfile?.phone || user?.phone || 'Not recorded'}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowProfileModal(true)}
                  >
                    Update Contact Details
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ----------------- TAB B: COURT RESERVATIONS ----------------- */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Your Court Reservations</h3>
              <p className="text-2xs text-slate-500">
                Inspect 60-minute time slot availability and book court time with your plan discount.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showMatrixView ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setShowMatrixView(!showMatrixView)}
                leftIcon={Calendar}
              >
                {showMatrixView ? 'Show Bookings List' : 'View Court Schedule Matrix'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowCreateBookingModal(true)}
                leftIcon={Plus}
              >
                Book Court
              </Button>
            </div>
          </div>

          {/* Interactive Court Matrix (Optional View) */}
          {showMatrixView ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Select Date for Schedule:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    loadAvailability(e.target.value);
                  }}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {loadingAvail ? (
                <div className="p-12 text-center text-slate-400 text-xs">Checking real-time court availability...</div>
              ) : (
                <CourtScheduleMatrix
                  courts={courts}
                  availability={availability}
                  bookings={myBookings}
                  selectedDate={selectedDate}
                  onSelectSlot={(court, slot) => {
                    setSelectedCourtForBooking(court);
                    setSelectedTimeForBooking(slot);
                    setShowCreateBookingModal(true);
                  }}
                />
              )}
            </div>
          ) : (
            /* My Bookings Table */
            <Card noPadding>
              {loadingBookings ? (
                <div className="p-12 text-center text-slate-400 text-xs">Loading court bookings...</div>
              ) : myBookings.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  You have no court reservations scheduled. Click "Book Court" to reserve a time slot.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-4">Court</th>
                        <th className="py-2.5 px-4">Session Date & Time</th>
                        <th className="py-2.5 px-4 text-right">Calculated Fee</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 block">{b.court?.name || 'Sports Court'}</span>
                            <span className="text-3xs text-slate-400 capitalize">{b.court?.sport_type || 'Court'}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">
                            {formatDateTime(b.start_time)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(b.calculated_fee || 0)}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={b.status || b.booking_status} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            {(b.status === 'confirmed' || b.booking_status === 'confirmed') && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                onClick={() => {
                                  setBookingToCancel(b);
                                  setShowCancelBookingDialog(true);
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
          )}
        </div>
      )}

      {/* ----------------- TAB C: FRIDAY SOCIAL PLAY ----------------- */}
      {activeTab === 'social' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Friday Social Play Mixers</h3>
              <p className="text-2xs text-slate-500">
                Join communal doubles and casual mixers to play with other club members.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadSocialSessions} leftIcon={RefreshCw}>
              Refresh
            </Button>
          </div>

          {loadingSocial ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading social play sessions...</div>
          ) : socialSessions.length === 0 ? (
            <Card className="text-center py-12 text-slate-500 text-xs">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No social play sessions currently scheduled.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {socialSessions.map((s) => {
                const count = s.active_participants_count ?? s.participants?.length ?? 0;
                const cap = s.max_capacity || 8;
                const isFull = count >= cap;
                const isParticipant = s.participants?.some(
                  (p) => (p.member_id === memberProfile?.id || p.member?.user_id === user?.id) && p.status === 'registered'
                );

                return (
                  <Card key={s.id} className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-3xs uppercase tracking-wider font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                            {s.court?.sport_type || 'Court Sport'}
                          </span>
                          <h4 className="text-base font-bold text-slate-900 mt-1">{s.title}</h4>
                          <p className="text-xs text-slate-500">{s.court?.name || 'Allocated Court'}</p>
                        </div>
                        <StatusBadge status={s.status} />
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateTime(s.start_time)}</span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="text-slate-500">Player Capacity:</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {count} / {cap} {isFull && <span className="text-rose-600 font-bold ml-1">(FULL)</span>}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Participant Fee:</span>
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
                        onClick={() => {
                          setActiveRosterSession(s);
                          setShowRosterModal(true);
                        }}
                        leftIcon={Users}
                      >
                        Roster ({count})
                      </Button>

                      {s.status === 'scheduled' && (
                        <div>
                          {isParticipant ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-rose-600 border-rose-200 hover:bg-rose-50"
                              onClick={() => handleLeaveSocialSession(s.id)}
                              isLoading={joiningSessionId === s.id}
                            >
                              Leave
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={isFull}
                              onClick={() => handleJoinSocialSession(s.id)}
                              isLoading={joiningSessionId === s.id}
                            >
                              {isFull ? 'Full' : 'Join Mixer'}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB D: ONLINE PRO-SHOP ----------------- */}
      {activeTab === 'shop' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Catalog (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Official Club Pro-Shop Catalog</h3>
              <p className="text-2xs text-slate-500">
                Order sporting equipment and gear online with your member discount applied at checkout.
              </p>

              {loadingProducts ? (
                <div className="p-12 text-center text-slate-400 text-xs">Loading merchandise catalog...</div>
              ) : products.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">No products currently available.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {products.map((p) => {
                    const price = Number(p.unit_price || p.price || 0);
                    const isInStock = p.is_in_stock !== false;

                    return (
                      <Card key={p.id} className="p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between">
                            <span className="text-3xs font-mono text-slate-400">{p.sku || 'SKU'}</span>
                            <StatusBadge status={isInStock ? 'in_stock' : 'out_of_stock'} />
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">{p.name}</h4>
                          <p className="text-3xs text-slate-500 mt-1 line-clamp-2">{p.description || 'Pro-Shop merchandise'}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(price)}
                          </span>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={!isInStock}
                            onClick={() => handleAddToCart(p)}
                            leftIcon={Plus}
                          >
                            Add to Cart
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Shopping Cart & Online Checkout (1 col) */}
            <div className="space-y-6">
              <Card title="Your Online Order Ticket" subtitle="Cart Summary">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Your shopping cart is empty.</div>
                ) : (
                  <form onSubmit={handlePlaceOnlineOrder} className="space-y-4 text-xs">
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.product.id} className="py-2 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{item.product.name}</p>
                            <p className="text-3xs text-slate-400 font-mono">
                              {item.quantity} × {formatCurrency(item.product.unit_price || item.product.price || 0)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.product.id)}
                            className="text-rose-600 hover:text-rose-800 text-3xs font-medium cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    {(() => {
                      const { subtotal, discount, total, shopDiscountPercent } = calculateCartTotals();
                      return (
                        <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
                          <div className="flex justify-between text-slate-600">
                            <span>Subtotal:</span>
                            <span className="font-mono">{formatCurrency(subtotal)}</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between text-emerald-700 font-semibold">
                              <span>Member Discount ({shopDiscountPercent}%):</span>
                              <span className="font-mono">-{formatCurrency(discount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-100">
                            <span>Net Total:</span>
                            <span className="font-mono">{formatCurrency(total)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <div>
                      <label className="block text-3xs font-semibold text-slate-600 mb-1">Order Notes (Optional)</label>
                      <input
                        type="text"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="e.g. Grip size or stringing request"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      type="submit"
                      className="w-full"
                      isLoading={submittingOrder}
                    >
                      Submit Online Order
                    </Button>
                  </form>
                )}
              </Card>

              {/* Order History */}
              <Card title="My Order History" subtitle="Recent Pro-Shop Tickets" noPadding>
                {loadingOrders ? (
                  <div className="p-6 text-center text-slate-400 text-xs">Loading orders...</div>
                ) : myOrders.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">No orders recorded yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {myOrders.map((o) => (
                      <div key={o.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-mono font-bold text-slate-900">{o.order_number}</p>
                          <p className="text-3xs text-slate-400">{formatDate(o.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-slate-900">{formatCurrency(o.total_amount)}</p>
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            <StatusBadge status={o.order_status} />
                            {o.order_status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOrderToCancel(o);
                                  setShowCancelOrderDialog(true);
                                }}
                                className="text-rose-600 hover:text-rose-800 text-3xs font-medium cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB E: BILLING & INVOICES ----------------- */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Your Official Statements & Invoices</h3>
              <p className="text-2xs text-slate-500">
                Authoritative records of club dues, court rentals, and retail purchases.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadInvoices} leftIcon={RefreshCw}>
              Refresh
            </Button>
          </div>

          <Card noPadding>
            {loadingInvoices ? (
              <div className="p-12 text-center text-slate-400 text-xs">Loading personal invoices...</div>
            ) : myInvoices.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No invoices found for your member account.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-4">Invoice #</th>
                      <th className="py-2.5 px-4">Issue Date</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                      <th className="py-2.5 px-4 text-right">GST / Tax</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                      <th className="py-2.5 px-4 text-right">Amount Paid</th>
                      <th className="py-2.5 px-4 text-right">Outstanding</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 font-mono text-slate-700">
                        <td className="py-3 px-4 font-bold text-primary-700">{inv.invoice_number}</td>
                        <td className="py-3 px-4 font-sans text-slate-500">{formatDate(inv.issue_date)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(inv.subtotal)}</td>
                        <td className="py-3 px-4 text-right text-slate-500">{formatCurrency(inv.tax_amount)}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(inv.total_amount)}</td>
                        <td className="py-3 px-4 text-right text-emerald-700 font-semibold">{formatCurrency(inv.amount_paid)}</td>
                        <td className="py-3 px-4 text-right text-rose-700 font-bold">{formatCurrency(inv.outstanding_amount)}</td>
                        <td className="py-3 px-4 font-sans">
                          <StatusBadge status={inv.invoice_status} />
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setShowInvoiceDetailModal(true);
                            }}
                            leftIcon={FileText}
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ----------------- MODALS & DIALOGS ----------------- */}

      {/* Create Booking Modal */}
      <CreateBookingModal
        isOpen={showCreateBookingModal}
        onClose={() => {
          setShowCreateBookingModal(false);
          setSelectedCourtForBooking(null);
        }}
        courts={courts}
        initialCourt={selectedCourtForBooking}
        initialDate={selectedDate}
        initialTime={selectedTimeForBooking}
        onSuccess={() => {
          loadBookingsData();
          loadAvailability(selectedDate);
        }}
      />

      {/* Subscription History Modal */}
      <Modal
        isOpen={showSubHistoryModal}
        onClose={() => setShowSubHistoryModal(false)}
        title="Membership Subscription History"
        subtitle={`Historical subscription snapshots for ${memberProfile?.full_name}`}
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {loadingSubs ? (
            <div className="p-8 text-center text-slate-400">Loading subscription records...</div>
          ) : subscriptions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No historical subscriptions recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2 px-3">Plan Tier Snapshot</th>
                    <th className="py-2 px-3">Period</th>
                    <th className="py-2 px-3 text-right">Price Paid</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptions.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{s.plan_name_snapshot}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {formatDate(s.start_date)} to {formatDate(s.end_date)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(s.price_paid)}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={s.subscription_status} />
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={s.payment_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setShowSubHistoryModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Update Contact Profile"
        subtitle="Modify your registered member full name and phone number"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setShowProfileModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingProfile}>
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Booking Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showCancelBookingDialog}
        onClose={() => setShowCancelBookingDialog(false)}
        onConfirm={handleConfirmCancelBooking}
        title="Cancel Court Reservation"
        message="Are you sure you want to cancel this reservation? The court slot will be released back to the club availability calendar."
        confirmText="Cancel Reservation"
        confirmVariant="danger"
        isLoading={cancellingBooking}
      />

      {/* Cancel Order Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showCancelOrderDialog}
        onClose={() => setShowCancelOrderDialog(false)}
        onConfirm={handleConfirmCancelOrder}
        title="Cancel Online Order"
        message="Are you sure you want to cancel this pending pro-shop order? Reserved inventory items will be restored."
        confirmText="Cancel Order"
        confirmVariant="danger"
        isLoading={cancellingOrder}
      />

      {/* Social Play Roster Modal */}
      <Modal
        isOpen={showRosterModal}
        onClose={() => setShowRosterModal(false)}
        title={activeRosterSession?.title || 'Session Roster'}
        subtitle={`Participants Roster (${activeRosterSession?.participants?.length || 0} registered)`}
      >
        <div className="space-y-4 text-xs">
          {(!activeRosterSession?.participants || activeRosterSession.participants.length === 0) ? (
            <p className="text-slate-500 py-4 text-center">No participants registered yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activeRosterSession.participants.map((p, idx) => (
                <li key={p.id || idx} className="py-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    {p.member?.full_name || 'Registered Club Member'}
                  </span>
                  <StatusBadge status={p.status || 'registered'} />
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setShowRosterModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={showInvoiceDetailModal}
        onClose={() => setShowInvoiceDetailModal(false)}
        title={selectedInvoice ? `Invoice: ${selectedInvoice.invoice_number}` : 'Invoice Details'}
        subtitle={selectedInvoice ? `Issued: ${formatDate(selectedInvoice.issue_date)} • Due: ${formatDate(selectedInvoice.due_date)}` : ''}
        size="md"
      >
        {selectedInvoice && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-3xs block">Payment Status</span>
                <StatusBadge status={selectedInvoice.invoice_status} />
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-3xs block">Outstanding Due</span>
                <span className="font-mono font-bold text-sm text-rose-700">
                  {formatCurrency(selectedInvoice.outstanding_amount)}
                </span>
              </div>
            </div>

            {/* Line Items */}
            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="py-2 px-3 font-medium text-slate-800">{it.description}</td>
                        <td className="py-2 px-3 text-center font-mono">{it.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(it.unit_price)}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatCurrency(it.line_total || (it.quantity * it.unit_price))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals Breakdown */}
            <div className="space-y-1 pt-2 border-t border-slate-100 text-right">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              {Number(selectedInvoice.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span className="font-mono">-{formatCurrency(selectedInvoice.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST Tax:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Amount:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Amount Paid:</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.amount_paid)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setShowInvoiceDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MemberDashboardPage;
