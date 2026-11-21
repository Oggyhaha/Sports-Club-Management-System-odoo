import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import OwnerDashboardPage from '../pages/owner/OwnerDashboardPage';
import reportService from '../services/reportService';
import { ToastProvider } from '../contexts/ToastContext';
import * as AuthContextModule from '../contexts/AuthContext';
import ProtectedRoute from '../routes/ProtectedRoute';
import RoleRoute from '../routes/RoleRoute';
import { ROLES } from '../config/constants';

// Mock reportService
vi.mock('../services/reportService', () => ({
  default: {
    getOwnerDashboard: vi.fn(),
    exportReportCsv: vi.fn(),
    getFinancialReport: vi.fn(),
    getMembershipReport: vi.fn(),
    getBookingReport: vi.fn(),
    getCommerceReport: vi.fn(),
    getHRReport: vi.fn(),
    getTaxReport: vi.fn(),
  },
}));

const mockDashboardData = {
  period: {
    filter_type: 'this_month',
    start_date: '2026-11-01',
    end_date: '2026-11-30',
    timezone: 'Asia/Kolkata',
    generated_at: '2026-11-22T02:00:00Z',
  },
  financials: {
    invoices_issued_count: 14,
    invoices_issued_value: '45000.00',
    outstanding_receivables: '8500.00',
    payments_received_count: 22,
    gross_customer_collections: '62000.00',
    customer_refunds_count: 2,
    customer_refunds_value: '1500.00',
    net_customer_collections: '60500.00',
    net_allocated_value: '58000.00',
    unallocated_customer_balance: '2500.00',
    payroll_disbursements_count: 5,
    recorded_operating_expenses: '32000.00',
    estimated_operating_surplus: '28500.00',
    surplus_disclaimer:
      'Estimated operating surplus based on recorded customer collections less staff payroll disbursements. Excludes unrecorded facility rent, utilities, equipment depreciation, and statutory tax obligations.',
  },
  memberships: {
    total_registered_members: 94,
    active_members: 86,
    inactive_members: 8,
    active_subscriptions: 82,
    expired_subscriptions: 12,
    new_registrations_in_period: 7,
    renewals_in_period: 14,
    plan_distribution: [
      { plan_id: '11111111-1111-1111-1111-111111111111', plan_name: 'Premium Badminton', active_member_count: 45 },
      { plan_id: '22222222-2222-2222-2222-222222222222', plan_name: 'Squash Elite', active_member_count: 25 },
    ],
  },
  bookings: {
    total_bookings: 47,
    confirmed_bookings: 43,
    cancelled_bookings: 4,
    cancellation_rate_percent: '8.51',
    walk_in_bookings: 11,
    walk_in_ratio_percent: '23.40',
    social_play_sessions: 6,
    social_play_participants: 28,
    total_booked_hours: '68.5',
    total_available_hours: '28320.0',
    overall_court_utilization_percent: '0.24',
    court_details: [
      {
        court_id: 'aaaa1111-0000-0000-0000-000000000001',
        court_name: 'Court 1 - Badminton',
        sport_type: 'badminton',
        booked_hours: '24.0',
        available_hours: '480.0',
        utilization_percent: '5.0',
      },
    ],
    peak_hours: [
      { hour_slot: '18:00', booking_count: 12 },
      { hour_slot: '19:00', booking_count: 15 },
    ],
  },
  commerce: {
    total_orders_count: 36,
    shop_orders_count: 16,
    cafeteria_orders_count: 20,
    cancelled_orders_count: 1,
    completed_orders_value: '18450.00',
    cancelled_orders_value: '350.00',
    top_selling_products: [
      {
        product_id: 'bbbb1111-0000-0000-0000-000000000001',
        product_name: 'Yonex Mavis 350',
        module_type: 'shop',
        total_units_sold: 28,
        total_sales_value: '8400.00',
      },
    ],
    low_stock_alerts_count: 1,
    low_stock_products: [
      {
        product_id: 'cccc1111-0000-0000-0000-000000000001',
        product_name: 'Grip Tape Pro',
        sku: 'GRIP-PRO-01',
        current_stock: 3,
        reorder_threshold: 10,
      },
    ],
  },
  hr: {
    total_employees: 18,
    active_employees: 16,
    employees_on_leave: 2,
    department_distribution: [
      { department_id: 'dddd1111-0000-0000-0000-000000000001', department_name: 'Operations & Courts', employee_count: 8 },
    ],
    attendance_records_count: 120,
    present_records_count: 114,
    leave_requests_count: 6,
    approved_leaves_count: 5,
    payroll_runs_in_period: 1,
    payroll_total_net_payable: '35000.00',
    payroll_total_disbursed: '32000.00',
    payroll_outstanding_liability: '3000.00',
  },
  tax: {
    period: {
      filter_type: 'this_month',
      start_date: '2026-11-01',
      end_date: '2026-11-30',
      timezone: 'Asia/Kolkata',
      generated_at: '2026-11-22T02:00:00Z',
    },
    commerce_tax: {
      source: 'commerce_orders',
      taxable_turnover: '15635.59',
      tax_collected: '2814.41',
    },
    direct_invoicing_tax: {
      source: 'direct_invoices',
      taxable_turnover: '38135.59',
      tax_collected: '6864.41',
    },
    total_taxable_turnover: '53771.18',
    total_output_tax_collected: '9678.82',
    statutory_notice:
      'Summary represents calculated output GST liability from non-cancelled retail orders and direct non-order invoices. Does not constitute an audited GSTR-1 or GSTR-3B tax filing.',
  },
};

const renderDashboard = () => {
  return render(
    <MemoryRouter initialEntries={['/owner/dashboard']}>
      <ToastProvider>
        <OwnerDashboardPage />
      </ToastProvider>
    </MemoryRouter>
  );
};

describe('Owner Dashboard (Milestone H4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Dashboard Rendering & KPI Cards
  it('renders all executive dashboard subsystems with valid data', async () => {
    reportService.getOwnerDashboard.mockResolvedValueOnce(mockDashboardData);
    renderDashboard();

    expect(screen.getByRole('status', { name: /loading dashboard/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Financial & Cash Flow Analytics')).toBeInTheDocument();
      expect(screen.getByText('Membership Growth & Distribution')).toBeInTheDocument();
      expect(screen.getByText('Court Operations & Utilization Analytics')).toBeInTheDocument();
      expect(screen.getByText('Commerce, Food & Inventory Analytics')).toBeInTheDocument();
      expect(screen.getByText('Workforce, Attendance & Payroll Analytics')).toBeInTheDocument();
      expect(screen.getByText('Statutory Output Tax & GST Overview')).toBeInTheDocument();
    });
  });

  // 2. Financial Metrics & Mandatory Disclaimer
  it('displays core financial metrics and mandatory operating surplus disclaimer', async () => {
    reportService.getOwnerDashboard.mockResolvedValueOnce(mockDashboardData);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Invoices Issued Value')).toBeInTheDocument();
      expect(screen.getByText('Outstanding Receivables')).toBeInTheDocument();
      expect(screen.getByText('Gross Customer Collections')).toBeInTheDocument();
      expect(screen.getByText('Customer Refunds')).toBeInTheDocument();
      expect(screen.getByText('Net Customer Collections')).toBeInTheDocument();
      expect(screen.getByText('Recorded Operating Expenses')).toBeInTheDocument();
      expect(screen.getByText('Estimated Operating Surplus')).toBeInTheDocument();
    });

    // Verify verbatim surplus disclaimer is present
    expect(
      screen.getByText(/Estimated operating surplus based on recorded customer collections/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Excludes unrecorded facility rent, utilities, equipment depreciation/i)
    ).toBeInTheDocument();
  });

  // 3. Period Filter Preset Switching
  it('switches preset filters and triggers API with selected filter_type', async () => {
    reportService.getOwnerDashboard.mockResolvedValue(mockDashboardData);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Today'));

    await waitFor(() => {
      expect(reportService.getOwnerDashboard).toHaveBeenCalledWith({
        filter_type: 'today',
      });
    });

    fireEvent.click(screen.getByText('This Year'));

    await waitFor(() => {
      expect(reportService.getOwnerDashboard).toHaveBeenCalledWith({
        filter_type: 'this_year',
      });
    });
  });

  // 4. Custom Date Range Validation
  it('validates custom date range and rejects end dates earlier than start dates', async () => {
    reportService.getOwnerDashboard.mockResolvedValue(mockDashboardData);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Custom'));

    expect(screen.getByLabelText(/start:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end:/i)).toBeInTheDocument();

    const startInput = screen.getByLabelText(/start:/i);
    const endInput = screen.getByLabelText(/end:/i);
    const applyButton = screen.getByRole('button', { name: /apply range/i });

    // Set invalid dates: end before start
    fireEvent.change(startInput, { target: { value: '2026-11-20' } });
    fireEvent.change(endInput, { target: { value: '2026-11-10' } });
    fireEvent.click(applyButton);

    expect(
      screen.getByText('End date cannot be earlier than start date.')
    ).toBeInTheDocument();

    // Verify invalid parameters were NOT sent to backend
    expect(reportService.getOwnerDashboard).not.toHaveBeenCalledWith(
      expect.objectContaining({
        filter_type: 'custom',
        start_date: '2026-11-20',
        end_date: '2026-11-10',
      })
    );

    // Now set valid dates: start <= end
    fireEvent.change(endInput, { target: { value: '2026-11-25' } });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(reportService.getOwnerDashboard).toHaveBeenCalledWith({
        filter_type: 'custom',
        start_date: '2026-11-20',
        end_date: '2026-11-25',
      });
    });
  });

  // 5. Booking Methodology & Court Utilization Tooltip Note
  it('renders court utilization rate and the 16h daily capacity methodology notice', async () => {
    reportService.getOwnerDashboard.mockResolvedValueOnce(mockDashboardData);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Court Utilization Rate is computed as: Confirmed Booked Hours ÷ (Active Courts × Days in Period × 16 hours) × 100', { exact: false })).toBeInTheDocument();
    });
  });

  // 6. Commerce & Inventory Alert Handling
  it('renders top selling products and low stock items', async () => {
    reportService.getOwnerDashboard.mockResolvedValueOnce(mockDashboardData);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Yonex Mavis 350')).toBeInTheDocument();
      expect(screen.getByText('Grip Tape Pro')).toBeInTheDocument();
      expect(screen.getByText('GRIP-PRO-01')).toBeInTheDocument();
    });
  });

  // 7. Statutory Output Tax Overview & Deduplication
  it('renders output tax summary and statutory notice', async () => {
    reportService.getOwnerDashboard.mockResolvedValueOnce(mockDashboardData);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Direct Club Invoices')).toBeInTheDocument();
      expect(screen.getByText(/invoice\.order_id IS NULL/i)).toBeInTheDocument();
      expect(screen.getByText(/Does not constitute an audited GSTR-1/i)).toBeInTheDocument();
    });
  });

  // 8. API Failure & Retry Flow
  it('displays error state on API failure and retries successfully', async () => {
    reportService.getOwnerDashboard.mockRejectedValueOnce(
      new Error('Database connection failed')
    );
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Unable to load Executive Analytics')).toBeInTheDocument();
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });

    // Provide successful response for retry
    reportService.getOwnerDashboard.mockResolvedValueOnce(mockDashboardData);
    fireEvent.click(screen.getByRole('button', { name: /retry analytics sync/i }));

    await waitFor(() => {
      expect(screen.getByText('Financial & Cash Flow Analytics')).toBeInTheDocument();
    });
  });

  // 9. CSV Export Triggering
  it('triggers CSV download with report type and handles active export state', async () => {
    reportService.getOwnerDashboard.mockResolvedValue(mockDashboardData);
    reportService.exportReportCsv.mockResolvedValueOnce({
      filename: 'champions_club_dashboard_this_month.csv',
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
    });

    // Open export menu
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    // Click 'Unified Dashboard (All)'
    const option = screen.getByText('Unified Dashboard (All)');
    fireEvent.click(option);

    await waitFor(() => {
      expect(reportService.exportReportCsv).toHaveBeenCalledWith({
        report_type: 'dashboard',
        filter_type: 'this_month',
      });
    });
  });

  // 10. RBAC Protection
  it('enforces RBAC so non-owner roles are denied access', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      roles: [ROLES.MEMBER],
      user: { email: 'member@test.com', roles: [ROLES.MEMBER] },
    });

    render(
      <MemoryRouter initialEntries={['/owner/dashboard']}>
        <Routes>
          <Route path="/unauthorized" element={<div>Access Denied (403)</div>} />
          <Route
            path="/owner/dashboard"
            element={
              <RoleRoute allowedRoles={[ROLES.OWNER]}>
                <OwnerDashboardPage />
              </RoleRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Access Denied (403)')).toBeInTheDocument();
    expect(screen.queryByText('Financial & Cash Flow Analytics')).not.toBeInTheDocument();
  });
});
