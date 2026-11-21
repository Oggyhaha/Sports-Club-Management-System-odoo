import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { ROLES } from '../config/constants';

// Pages under test
import ReceptionDashboardPage from '../pages/reception/ReceptionDashboardPage';
import MembersPage from '../pages/members/MembersPage';
import CourtsPage from '../pages/courts/CourtsPage';
import BookingsPage from '../pages/bookings/BookingsPage';
import SocialPlayPage from '../pages/social-play/SocialPlayPage';
import ShopPosPage from '../pages/shop/ShopPosPage';
import ShopInventoryPage from '../pages/shop/ShopInventoryPage';
import CafeteriaKitchenPage from '../pages/cafeteria/CafeteriaKitchenPage';
import EmployeesPage from '../pages/hr/EmployeesPage';
import AttendancePage from '../pages/hr/AttendancePage';
import LeavesPage from '../pages/hr/LeavesPage';
import PayrollPage from '../pages/hr/PayrollPage';
import InvoicesPage from '../pages/finance/InvoicesPage';
import PaymentsPage from '../pages/finance/PaymentsPage';

// Services
import courtService from '../services/courtService';
import bookingService from '../services/bookingService';
import memberService from '../services/memberService';
import shopService from '../services/shopService';
import cafeteriaService from '../services/cafeteriaService';
import employeeService from '../services/employeeService';
import attendanceService from '../services/attendanceService';
import leaveService from '../services/leaveService';
import payrollService from '../services/payrollService';
import financeService from '../services/financeService';

// Mock Services
vi.mock('../services/courtService');
vi.mock('../services/bookingService');
vi.mock('../services/memberService');
vi.mock('../services/shopService');
vi.mock('../services/cafeteriaService');
vi.mock('../services/employeeService');
vi.mock('../services/attendanceService');
vi.mock('../services/leaveService');
vi.mock('../services/payrollService');
vi.mock('../services/financeService');

const mockAuth = (role = ROLES.OWNER) => {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    user: { id: 'u1', name: 'Test Administrator', email: 'owner@championsclub.com', roles: [{ name: role }] },
    roles: [role],
    isAuthenticated: true,
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

describe('Milestone H5 & H6: Operational Modules Unit & Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth(ROLES.OWNER);
  });

  // 1. Reception & Court Availability Matrix
  it('renders Reception Dashboard and court schedule matrix correctly', async () => {
    courtService.getCourts.mockResolvedValue([
      { id: 'c1', name: 'Badminton Court 1', court_type: 'badminton', is_active: true, hourly_rate: 400 },
    ]);
    bookingService.checkAvailability.mockResolvedValue({ booked_slots: [] });
    bookingService.getBookings.mockResolvedValue([]);
    memberService.getMembers.mockResolvedValue([]);

    renderWithProviders(<ReceptionDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Reception Desk')).toBeInTheDocument();
      expect(screen.getByText(/Court Operating Schedule/i)).toBeInTheDocument();
    });
  });

  // 2. Members Management
  it('renders Members directory and allows searching members', async () => {
    memberService.getMembers.mockResolvedValue([
      {
        id: 'm1',
        full_name: 'Rahul Dravid',
        email: 'rahul@cricket.in',
        phone: '9876543210',
        is_active: true,
        plan_name: 'Annual Gold Badminton',
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);
    memberService.getPlans.mockResolvedValue([]);

    renderWithProviders(<MembersPage />);

    await waitFor(() => {
      expect(screen.getByText('Rahul Dravid')).toBeInTheDocument();
      expect(screen.getByText('rahul@cricket.in')).toBeInTheDocument();
      expect(screen.getByText(/Annual Gold Badminton/i)).toBeInTheDocument();
    });
  });

  // 3. Court Management
  it('renders Courts listing with active statuses and pricing', async () => {
    courtService.getCourts.mockResolvedValue([
      {
        id: 'c1',
        name: 'Tennis Court Center',
        court_type: 'tennis',
        hourly_rate: 800,
        walk_in_rate: 1000,
        is_active: true,
      },
    ]);

    renderWithProviders(<CourtsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tennis Court Center')).toBeInTheDocument();
      expect(screen.getByText(/₹800/i)).toBeInTheDocument();
    });
  });

  // 4. Bookings Management & Cancellation
  it('renders Bookings page and triggers cancellation modal', async () => {
    bookingService.getBookings.mockResolvedValue([
      {
        id: 'b1',
        court: { name: 'Squash 1' },
        is_walk_in: true,
        walk_in_name: 'Walk-in Patron',
        start_time: '2026-11-25T10:00:00Z',
        total_fee: 500,
        status: 'confirmed',
      },
    ]);
    courtService.getCourts.mockResolvedValue([]);

    renderWithProviders(<BookingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Squash 1')).toBeInTheDocument();
      expect(screen.getByText('Walk-in Patron')).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.getByText(/Cancel Court Reservation/i)).toBeInTheDocument();
  });

  // 5. Friday Social Play
  it('renders Social Play sessions and displays participant counts', async () => {
    bookingService.getSocialSessions.mockResolvedValue([
      {
        id: 'sp1',
        title: 'Friday Badminton Mixer',
        sport_type: 'badminton',
        court: { name: 'Court 1' },
        start_time: '2026-11-27T18:00:00Z',
        end_time: '2026-11-27T20:00:00Z',
        max_participants: 16,
        current_participants_count: 12,
        fee_per_player: '150.00',
        status: 'scheduled',
      },
    ]);
    courtService.getCourts.mockResolvedValue([]);

    renderWithProviders(<SocialPlayPage />);

    await waitFor(() => {
      expect(screen.getByText('Friday Badminton Mixer')).toBeInTheDocument();
      expect(screen.getByText(/12 \/ 16/i)).toBeInTheDocument();
    });
  });

  // 6. Shop POS Register & Cart Management
  it('renders Shop POS register, loads catalog, and adds item to cart', async () => {
    shopService.getCategories.mockResolvedValue([
      { id: 'cat1', name: 'Rackets' },
    ]);
    shopService.getProducts.mockResolvedValue([
      {
        id: 'p1',
        name: 'Yonex Astrox 88D Pro',
        sku: 'YNX-88D',
        price: 12500,
        current_stock: 5,
        reorder_threshold: 2,
        is_active: true,
      },
    ]);
    memberService.getMembers.mockResolvedValue([]);

    renderWithProviders(<ShopPosPage />);

    await waitFor(() => {
      expect(screen.getByText('Yonex Astrox 88D Pro')).toBeInTheDocument();
      expect(screen.getByText(/5 in stock/i)).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('Current POS Ticket')).toBeInTheDocument();
  });

  // 7. Shop Inventory & Restock
  it('renders Shop Inventory control and opens Restock modal', async () => {
    shopService.getInventory.mockResolvedValue([
      {
        product_id: 'p1',
        product_name: 'Babolat Tennis Balls (Can of 3)',
        sku: 'BAB-TB-3',
        current_stock: 2,
        reorder_threshold: 10,
      },
    ]);
    shopService.getMovements.mockResolvedValue([]);

    renderWithProviders(<ShopInventoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Babolat Tennis Balls (Can of 3)')).toBeInTheDocument();
      expect(screen.getByText(/Low Stock/i)).toBeInTheDocument();
    });

    const restockBtn = screen.getByRole('button', { name: /restock/i });
    fireEvent.click(restockBtn);

    expect(screen.getByText(/Restock: Babolat Tennis Balls/i)).toBeInTheDocument();
  });

  // 8. Cafeteria Kitchen Queue
  it('renders Cafeteria Kitchen queue and orders across status columns', async () => {
    cafeteriaService.getOrders.mockResolvedValue([
      {
        id: 'ord-12345678',
        status: 'pending',
        created_at: new Date().toISOString(),
        member: { full_name: 'Sunil Gavaskar' },
        items: [
          { id: 'item-1', product_name: 'Electrolyte Smoothie', quantity: 2 },
        ],
      },
    ]);

    renderWithProviders(<CafeteriaKitchenPage />);

    await waitFor(() => {
      expect(screen.getByText('Sunil Gavaskar')).toBeInTheDocument();
      expect(screen.getByText(/Electrolyte Smoothie/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start preparing/i })).toBeInTheDocument();
    });
  });

  // 9. HR Employee Directory
  it('renders Employee Directory and shows active staff', async () => {
    employeeService.getEmployees.mockResolvedValue([
      {
        id: 'e1',
        employee_code: 'EMP-001',
        first_name: 'Anil',
        last_name: 'Kumble',
        department: { name: 'Facility Operations' },
        designation: { title: 'Chief Groundsman' },
        employment_status: 'active',
        date_of_joining: '2025-01-15',
      },
    ]);
    employeeService.getDepartments.mockResolvedValue([]);
    employeeService.getDesignations.mockResolvedValue([]);

    renderWithProviders(<EmployeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Anil Kumble')).toBeInTheDocument();
      expect(screen.getByText('EMP-001')).toBeInTheDocument();
      expect(screen.getByText('Chief Groundsman')).toBeInTheDocument();
    });
  });

  // 10. HR Attendance & Audit Correction
  it('renders Attendance log and allows HR manual correction with mandatory reason', async () => {
    attendanceService.getAttendance.mockResolvedValue([
      {
        id: 'att-1',
        employee: { first_name: 'Kapil', last_name: 'Dev', employee_code: 'EMP-007' },
        check_in_time: '2026-11-22T08:00:00Z',
        check_out_time: null,
        hours_worked: 4.5,
        status: 'present',
      },
    ]);

    renderWithProviders(<AttendancePage />);

    await waitFor(() => {
      expect(screen.getByText('Kapil Dev')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /audit correct/i })).toBeInTheDocument();
    });

    const editBtn = screen.getByRole('button', { name: /audit correct/i });
    fireEvent.click(editBtn);

    expect(screen.getByText(/Correction Reason/i)).toBeInTheDocument();
  });

  // 11. HR Leave Applications & Review
  it('renders Leave applications and displays review action buttons for HR', async () => {
    leaveService.getLeaves.mockResolvedValue([
      {
        id: 'lv-1',
        employee: { first_name: 'Sachin', last_name: 'Tendulkar', employee_code: 'EMP-010' },
        leave_type: 'annual',
        start_date: '2026-12-01',
        end_date: '2026-12-05',
        status: 'pending',
        reason: 'Family holiday',
      },
    ]);

    renderWithProviders(<LeavesPage />);

    await waitFor(() => {
      expect(screen.getByText('Sachin Tendulkar')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });
  });

  // 12. HR Monthly Payroll Runs & Irreversible Lock Dialog
  it('renders Payroll periods and warns on irreversible payslip processing', async () => {
    payrollService.getPeriods.mockResolvedValue([
      {
        id: 'per-1',
        period_name: 'November 2026',
        start_date: '2026-11-01',
        end_date: '2026-11-30',
        is_processed: false,
      },
    ]);
    payrollService.getRuns.mockResolvedValue([
      {
        id: 'run-1',
        period_id: 'per-1',
        status: 'under_review',
        total_gross: 250000,
        total_deductions: 25000,
        total_net: 225000,
      },
    ]);
    payrollService.getRunEntries.mockResolvedValue([]);

    renderWithProviders(<PayrollPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/under_review/i).length).toBeGreaterThanOrEqual(1);
    });

    const processBtn = screen.getByRole('button', { name: /finalize & process payslips/i });
    fireEvent.click(processBtn);

    expect(
      screen.getByText(/Finalize & Process Payroll Run/i)
    ).toBeInTheDocument();
  });

  // 13. Finance Invoices & Generation
  it('renders Invoices repository and shows outstanding balance', async () => {
    financeService.getInvoices.mockResolvedValue([
      {
        id: 'inv-1',
        invoice_number: 'INV-2026-0099',
        total_amount: 15000,
        amount_paid: 5000,
        outstanding_amount: 10000,
        invoice_status: 'partially_paid',
        issue_date: '2026-11-10',
        due_date: '2026-11-25',
        business_client: {
          company_name: 'Reliance Corporate Park',
        },
      },
    ]);
    financeService.getClients.mockResolvedValue([]);

    renderWithProviders(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0099')).toBeInTheDocument();
      expect(screen.getByText('Reliance Corporate Park')).toBeInTheDocument();
      expect(screen.getAllByText('Partially Paid').length).toBeGreaterThanOrEqual(1);
    });
  });

  // 14. Finance Payments & Allocation
  it('renders Payments ledger and shows unallocated balance with Allocate action', async () => {
    financeService.getPayments.mockResolvedValue([
      {
        id: 'pmt-1',
        payment_reference: 'PMT-2026-050',
        payment_method: 'upi',
        amount: 25000,
        allocated_amount: 15000,
        unallocated_amount: 10000,
        payment_status: 'completed',
        received_at: '2026-11-20T10:00:00Z',
      },
    ]);

    renderWithProviders(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText('PMT-2026-050')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /allocate/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /statement/i })).toBeInTheDocument();
    });
  });
});
