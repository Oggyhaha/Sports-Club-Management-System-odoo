import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as AuthContextModule from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { ROLES } from '../config/constants';
import RoleRoute from '../routes/RoleRoute';

// Pages under test
import MemberDashboardPage from '../pages/member/MemberDashboardPage';
import CorporateDashboardPage from '../pages/corporate/CorporateDashboardPage';

// Services
import memberService from '../services/memberService';
import bookingService from '../services/bookingService';
import courtService from '../services/courtService';
import shopService from '../services/shopService';
import financeService from '../services/financeService';

// Mock Services
vi.mock('../services/memberService');
vi.mock('../services/bookingService');
vi.mock('../services/courtService');
vi.mock('../services/shopService');
vi.mock('../services/financeService');

const mockAuth = (role = ROLES.MEMBER, overrides = {}) => {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    user: {
      id: 'u_member_1',
      full_name: 'Virat Kohli',
      email: 'virat@championsclub.com',
      phone: '9876543210',
      roles: [{ name: role }],
      ...overrides,
    },
    roles: [role],
    isAuthenticated: true,
    isLoading: false,
    hasRole: (r) => r === role,
    hasAnyRole: (roles) => roles.includes(role),
  });
};

const renderWithProviders = (ui) => {
  return render(
    <MemoryRouter>
      <ToastProvider>
        {ui}
      </ToastProvider>
    </MemoryRouter>
  );
};

describe('Milestones H7 & H8: Member & Corporate Portals Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. renders Member Portal with linked membership plan, discounts, and expiry date
  it('renders Member Portal with linked membership plan, discounts, and expiry date', async () => {
    mockAuth(ROLES.MEMBER);
    memberService.getMyProfile.mockResolvedValue({
      id: 'm1',
      user_id: 'u_member_1',
      full_name: 'Virat Kohli',
      email: 'virat@championsclub.com',
      phone: '9876543210',
      membership_tier: 'premium',
      is_active: true,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      plan: {
        id: 'p1',
        name: 'Diamond Annual Elite',
        court_discount_percent: 25,
        shop_discount_percent: 15,
        bar_discount_percent: 10,
      },
    });

    renderWithProviders(<MemberDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Virat Kohli/i)).toBeInTheDocument();
      expect(screen.getByText('Diamond Annual Elite')).toBeInTheDocument();
      expect(screen.getByText('25% OFF')).toBeInTheDocument();
      expect(screen.getByText('15% OFF')).toBeInTheDocument();
      expect(screen.getByText('10% OFF')).toBeInTheDocument();
    });
  });

  // 2. displays unlinked account warning when member profile returns 404
  it('displays unlinked account warning when member profile returns 404', async () => {
    mockAuth(ROLES.MEMBER);
    const err404 = new Error('Not Found');
    err404.response = { status: 404 };
    memberService.getMyProfile.mockRejectedValue(err404);

    renderWithProviders(<MemberDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Member Profile Not Linked/i)).toBeInTheDocument();
      expect(
        screen.getByText('Your account is not linked to a club member profile. Please contact the front desk.')
      ).toBeInTheDocument();
    });
  });

  // 3. renders court availability schedule and allows member to book a court
  it('renders court availability schedule and allows member to book a court', async () => {
    mockAuth(ROLES.MEMBER);
    memberService.getMyProfile.mockResolvedValue({
      id: 'm1',
      user_id: 'u_member_1',
      full_name: 'Virat Kohli',
      phone: '9876543210',
      plan: { court_discount_percent: 25 },
    });
    courtService.getCourts.mockResolvedValue([
      { id: 'c1', name: 'Tennis Court 1', court_type: 'tennis', hourly_rate: 600, is_active: true },
    ]);
    bookingService.getBookings.mockResolvedValue([]);
    bookingService.checkAvailability.mockResolvedValue({
      courts: [{ id: 'c1', name: 'Tennis Court 1' }],
      slots: { c1: { '08:00': 'available', '09:00': 'available' } },
    });
    memberService.getMembers.mockResolvedValue([
      { id: 'm1', full_name: 'Virat Kohli', court_discount_percent: 25 },
    ]);
    bookingService.createBooking.mockResolvedValue({ id: 'b_new', court_id: 'c1' });

    renderWithProviders(<MemberDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Court Reservations/i)).toBeInTheDocument();
    });

    // Switch to Court Reservations tab
    fireEvent.click(screen.getByText('Court Reservations'));

    // Toggle Matrix View
    await waitFor(() => {
      expect(screen.getByText('View Court Schedule Matrix')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('View Court Schedule Matrix'));

    await waitFor(() => {
      expect(screen.getByText(/Select Date for Schedule:/i)).toBeInTheDocument();
      expect(screen.getByText('Show Bookings List')).toBeInTheDocument();
    });

    // Open Book Court Modal
    fireEvent.click(screen.getByRole('button', { name: /Book Court/i }));

    await waitFor(() => {
      expect(screen.getByText('Create Court Reservation')).toBeInTheDocument();
    });

    // Toggle to Club Member booking and select member
    fireEvent.click(screen.getByText('Club Member'));

    await waitFor(() => {
      expect(screen.getByText('Select Member *')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'm1' } });

    // Submit reservation
    fireEvent.click(screen.getByText('Confirm Reservation'));

    await waitFor(() => {
      expect(bookingService.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          court_id: 'c1',
          member_id: 'm1',
        })
      );
    });
  });

  // 4. lists member's personal court bookings and triggers cancellation confirmation
  it("lists member's personal court bookings and triggers cancellation confirmation", async () => {
    mockAuth(ROLES.MEMBER);
    memberService.getMyProfile.mockResolvedValue({
      id: 'm1',
      full_name: 'Virat Kohli',
    });
    courtService.getCourts.mockResolvedValue([
      { id: 'c1', name: 'Badminton Court 1', court_type: 'badminton', hourly_rate: 400 },
    ]);
    bookingService.getBookings.mockResolvedValue([
      {
        id: 'b1',
        court_id: 'c1',
        court: { name: 'Badminton Court 1', sport_type: 'badminton' },
        start_time: '2026-11-25T10:00:00+05:30',
        calculated_fee: 400,
        status: 'confirmed',
        booking_status: 'confirmed',
      },
    ]);
    bookingService.checkAvailability.mockResolvedValue({});
    bookingService.cancelBooking.mockResolvedValue({ success: true });

    renderWithProviders(<MemberDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Court Reservations')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Court Reservations'));

    await waitFor(() => {
      expect(screen.getByText('Badminton Court 1')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    // Trigger Cancel Dialog
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.getByText('Cancel Court Reservation')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Are you sure you want to cancel this reservation? The court slot will be released back to the club availability calendar.'
        )
      ).toBeInTheDocument();
    });

    // Confirm Cancellation
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Reservation' }));

    await waitFor(() => {
      expect(bookingService.cancelBooking).toHaveBeenCalledWith('b1');
    });
  });

  // 5. renders Friday Social Play sessions and allows member to join and leave
  it('renders Friday Social Play sessions and allows member to join and leave', async () => {
    mockAuth(ROLES.MEMBER);
    memberService.getMyProfile.mockResolvedValue({
      id: 'm1',
      full_name: 'Virat Kohli',
    });
    bookingService.getSocialSessions.mockResolvedValue([
      {
        id: 's1',
        title: 'Friday Night Doubles Mixer',
        status: 'scheduled',
        court: { sport_type: 'badminton', name: 'Court 1' },
        start_time: '2026-11-27T18:00:00+05:30',
        end_time: '2026-11-27T20:00:00+05:30',
        max_capacity: 12,
        active_participants_count: 5,
        fee_per_participant: 250,
        participants: [
          {
            id: 'p1',
            member_id: 'm1',
            status: 'registered',
            member: { full_name: 'Virat Kohli' },
          },
        ],
      },
    ]);
    bookingService.leaveSocialSession.mockResolvedValue({ success: true });
    bookingService.joinSocialSession.mockResolvedValue({ success: true });

    renderWithProviders(<MemberDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Friday Social Play')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Friday Social Play'));

    await waitFor(() => {
      expect(screen.getByText('Friday Night Doubles Mixer')).toBeInTheDocument();
      expect(screen.getByText(/5 \/ 12/)).toBeInTheDocument();
      expect(screen.getByText('Leave')).toBeInTheDocument();
    });

    // Execute Leave Session
    fireEvent.click(screen.getByText('Leave'));

    await waitFor(() => {
      expect(bookingService.leaveSocialSession).toHaveBeenCalledWith('s1');
    });
  });

  // 6. renders Pro-Shop catalog for member and submits online order with member discount
  it('renders Pro-Shop catalog for member and submits online order with member discount', async () => {
    mockAuth(ROLES.MEMBER);
    memberService.getMyProfile.mockResolvedValue({
      id: 'm1',
      full_name: 'Virat Kohli',
      plan: { shop_discount_percent: 15 },
    });
    shopService.getProducts.mockResolvedValue([
      {
        id: 'prod1',
        name: 'Yonex Astrox 99 Pro',
        sku: 'YNX-AX99',
        category: 'badminton_equipment',
        unit_price: 10000,
        stock_quantity: 5,
        is_active: true,
        is_in_stock: true,
      },
    ]);
    shopService.getOrders.mockResolvedValue([]);
    shopService.createOrder.mockResolvedValue({ id: 'ord_1', total_amount: 8500 });

    renderWithProviders(<MemberDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Online Pro-Shop')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Online Pro-Shop'));

    await waitFor(() => {
      expect(screen.getByText('Yonex Astrox 99 Pro')).toBeInTheDocument();
      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
    });

    // Add product to cart
    fireEvent.click(screen.getByText('Add to Cart'));

    await waitFor(() => {
      expect(screen.getByText('Your Online Order Ticket')).toBeInTheDocument();
      expect(screen.getByText('Member Discount (15%):')).toBeInTheDocument();
      expect(screen.getByText('Submit Online Order')).toBeInTheDocument();
    });

    // Submit Order
    fireEvent.click(screen.getByText('Submit Online Order'));

    await waitFor(() => {
      expect(shopService.createOrder).toHaveBeenCalledWith({
        items: [{ product_id: 'prod1', quantity: 1 }],
        notes: null,
      });
    });
  });

  // 7. allows member to view personal invoices and view line item breakdowns
  it('allows member to view personal invoices and view line item breakdowns', async () => {
    mockAuth(ROLES.MEMBER);
    memberService.getMyProfile.mockResolvedValue({
      id: 'm1',
      full_name: 'Virat Kohli',
    });
    financeService.getInvoices.mockResolvedValue([
      {
        id: 'inv1',
        invoice_number: 'INV-2026-0001',
        issue_date: '2026-11-20',
        due_date: '2026-11-30',
        subtotal: 5000,
        discount_amount: 500,
        tax_amount: 810,
        total_amount: 5310,
        amount_paid: 5310,
        outstanding_amount: 0,
        invoice_status: 'paid',
        items: [
          {
            id: 'it1',
            description: 'Annual Diamond Membership',
            quantity: 1,
            unit_price: 5000,
            line_total: 5000,
          },
        ],
      },
    ]);

    renderWithProviders(<MemberDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Billing & Invoices')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Billing & Invoices'));

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
    });

    // Open Line Item Details Modal
    fireEvent.click(screen.getByText('Details'));

    await waitFor(() => {
      expect(screen.getByText('Invoice: INV-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('Annual Diamond Membership')).toBeInTheDocument();
    });
  });

  // 8. allows member to update self-service profile details (name and phone)
  it('allows member to update self-service profile details (name and phone)', async () => {
    mockAuth(ROLES.MEMBER);
    memberService.getMyProfile.mockResolvedValue({
      id: 'm1',
      full_name: 'Virat Kohli',
      phone: '9876543210',
    });
    memberService.updateMyProfile.mockResolvedValue({
      id: 'u_member_1',
      full_name: 'Virat Premier Kohli',
      phone: '9876543211',
    });

    renderWithProviders(<MemberDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Profile'));

    await waitFor(() => {
      expect(screen.getByText('Update Contact Profile')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Virat Kohli');
    const phoneInput = screen.getByDisplayValue('9876543210');

    fireEvent.change(nameInput, { target: { value: 'Virat Premier Kohli' } });
    fireEvent.change(phoneInput, { target: { value: '9876543211' } });

    fireEvent.click(screen.getByText('Save Profile'));

    await waitFor(() => {
      expect(memberService.updateMyProfile).toHaveBeenCalledWith({
        full_name: 'Virat Premier Kohli',
        phone: '9876543211',
      });
    });
  });

  // 9. renders Corporate Client Portal with company profile and GSTIN
  it('renders Corporate Client Portal with company profile and GSTIN', async () => {
    mockAuth(ROLES.BUSINESS_CLIENT);
    financeService.getMyClientProfile.mockResolvedValue({
      id: 'bc1',
      company_name: 'Infosys Sports Club',
      contact_person: 'Narayan Murthy',
      email: 'sports@infosys.com',
      phone: '9988776655',
      tax_id_gstin: '29ABCDE1234F1Z5',
      gstin: '29ABCDE1234F1Z5',
      billing_address: 'Electronics City, Bangalore, Karnataka 560100',
      is_active: true,
    });
    financeService.getMyClientInvoices.mockResolvedValue([]);

    renderWithProviders(<CorporateDashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Infosys Sports Club').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Narayan Murthy')).toBeInTheDocument();
      expect(screen.getByText('sports@infosys.com')).toBeInTheDocument();
      expect(screen.getByText('9988776655')).toBeInTheDocument();
      expect(screen.getByText('29ABCDE1234F1Z5')).toBeInTheDocument();
      expect(
        screen.getByText('Electronics City, Bangalore, Karnataka 560100')
      ).toBeInTheDocument();
    });
  });

  // 10. displays unlinked account warning when corporate client profile returns 404
  it('displays unlinked account warning when corporate client profile returns 404', async () => {
    mockAuth(ROLES.BUSINESS_CLIENT);
    const err404 = new Error('Not Found');
    err404.response = { status: 404 };
    financeService.getMyClientProfile.mockRejectedValue(err404);
    financeService.getMyClientInvoices.mockResolvedValue([]);

    renderWithProviders(<CorporateDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Corporate Account Not Linked')).toBeInTheDocument();
      expect(
        screen.getByText('Corporate profile pending activation. Please contact administration.')
      ).toBeInTheDocument();
    });
  });

  // 11. calculates corporate financial totals (total billed, settled, outstanding)
  it('calculates corporate financial totals (total billed, settled, outstanding)', async () => {
    mockAuth(ROLES.BUSINESS_CLIENT);
    financeService.getMyClientProfile.mockResolvedValue({
      id: 'bc1',
      company_name: 'Wipro Technologies',
      tax_id_gstin: '29WIPRO1234F1Z5',
      gstin: '29WIPRO1234F1Z5',
      is_active: true,
    });
    financeService.getMyClientInvoices.mockResolvedValue([
      {
        id: 'inv_c1',
        invoice_number: 'CORP-2026-001',
        total_amount: 100000,
        amount_paid: 100000,
        outstanding_amount: 0,
        invoice_status: 'paid',
      },
      {
        id: 'inv_c2',
        invoice_number: 'CORP-2026-002',
        total_amount: 50000,
        amount_paid: 20000,
        outstanding_amount: 30000,
        invoice_status: 'partially_paid',
      },
    ]);

    renderWithProviders(<CorporateDashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Wipro Technologies').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Total Invoiced')).toBeInTheDocument();
      expect(screen.getByText('Settled Amount')).toBeInTheDocument();
      expect(screen.getByText('Net Outstanding')).toBeInTheDocument();
    });

    // Verify derived total values (150,000 billed, 120,000 settled, 30,000 outstanding)
    expect(screen.getByText('₹1,50,000.00')).toBeInTheDocument();
    expect(screen.getByText('₹1,20,000.00')).toBeInTheDocument();
    expect(screen.getAllByText('₹30,000.00').length).toBeGreaterThanOrEqual(1);
  });

  // 12. lists corporate B2B invoices and opens itemized invoice detail modal
  it('lists corporate B2B invoices and opens itemized invoice detail modal', async () => {
    mockAuth(ROLES.BUSINESS_CLIENT);
    financeService.getMyClientProfile.mockResolvedValue({
      id: 'bc1',
      company_name: 'Tata Consultancy Services',
      is_active: true,
    });
    financeService.getMyClientInvoices.mockResolvedValue([
      {
        id: 'inv_tcs',
        invoice_number: 'INV-TCS-001',
        issue_date: '2026-11-15',
        due_date: '2026-11-30',
        subtotal: 75000,
        tax_amount: 13500,
        total_amount: 88500,
        amount_paid: 0,
        outstanding_amount: 88500,
        invoice_status: 'issued',
        notes: 'Corporate Annual Badminton League Booking',
        items: [
          {
            id: 'it_tcs_1',
            description: 'Corporate Badminton Arena Exclusive Block (50 hours)',
            quantity: 50,
            unit_price: 1500,
            line_total: 75000,
          },
        ],
      },
    ]);

    renderWithProviders(<CorporateDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-TCS-001')).toBeInTheDocument();
      expect(screen.getByText('Breakdown')).toBeInTheDocument();
    });

    // Open detail breakdown modal
    fireEvent.click(screen.getByText('Breakdown'));

    await waitFor(() => {
      expect(screen.getByText(/Corporate Tax Invoice: INV-TCS-001/i)).toBeInTheDocument();
      expect(
        screen.getByText('Corporate Badminton Arena Exclusive Block (50 hours)')
      ).toBeInTheDocument();
      expect(screen.getByText('Corporate Annual Badminton League Booking')).toBeInTheDocument();
    });
  });

  // 13. enforces RBAC: Member accessing /owner/dashboard is redirected to /unauthorized
  it('enforces RBAC: Member accessing /owner/dashboard is redirected to /unauthorized', () => {
    mockAuth(ROLES.MEMBER);

    render(
      <MemoryRouter initialEntries={['/owner/dashboard']}>
        <Routes>
          <Route path="/unauthorized" element={<div>Access Forbidden Screen</div>} />
          <Route
            path="/owner/dashboard"
            element={
              <RoleRoute allowedRoles={[ROLES.OWNER]}>
                <div>Owner Strategic Analytics</div>
              </RoleRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Owner Strategic Analytics')).not.toBeInTheDocument();
    expect(screen.getByText('Access Forbidden Screen')).toBeInTheDocument();
  });

  // 14. enforces RBAC: Corporate Client accessing /hr/employees is redirected to /unauthorized
  it('enforces RBAC: Corporate Client accessing /hr/employees is redirected to /unauthorized', () => {
    mockAuth(ROLES.BUSINESS_CLIENT);

    render(
      <MemoryRouter initialEntries={['/hr/employees']}>
        <Routes>
          <Route path="/unauthorized" element={<div>Access Forbidden Screen</div>} />
          <Route
            path="/hr/employees"
            element={
              <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.HR_STAFF]}>
                <div>Internal Employee Directory</div>
              </RoleRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Internal Employee Directory')).not.toBeInTheDocument();
    expect(screen.getByText('Access Forbidden Screen')).toBeInTheDocument();
  });
});
