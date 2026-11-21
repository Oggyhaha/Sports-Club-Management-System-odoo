# Milestone G — Pre-Implementation Architectural & Financial Audit
## Reporting, Financial Analytics, Tax Reporting & Owner Dashboard

**Project:** Champions Club Sports Club Management System  
**Date:** November 2026  
**Status:** Pre-Implementation Architectural & Financial Audit Approved  
**Author:** Senior Backend Architect, Financial Data & Analytics Engineer  

---

## 1. Executive Summary

Milestone G delivers a unified, production-grade reporting and financial analytics engine for the Champions Club modular monolith. Drawing upon the foundational domains established in Milestones A through F, this module synthesizes operational, commercial, workforce, and financial data into authoritative reports and a real-time Owner Dashboard.

In accordance with strict non-negotiable financial engineering rules:
- **No Fabricated or Hardcoded Data:** All metrics originate from persisted PostgreSQL source records.
- **Strict Cash vs. Accrual Separation:** Issued invoice values, customer cash collections, payment allocations, and outstanding receivables are distinctly computed.
- **No Double Counting:** Commerce orders linked to invoices are deduplicated in tax and sales aggregation.
- **Accurate Expense Classification:** Employee payroll disbursements are treated as operating expenses/liabilities, completely decoupled from customer revenue inflows.
- **Honest Profit & Surplus Labeling:** Partial financial calculations are explicitly termed *"Estimated Operating Surplus based on recorded transactions"* with full disclosure of covered and excluded ledger accounts.
- **High-Performance Aggregations:** Utilizes PostgreSQL SQL aggregation functions (`SUM`, `COUNT`, `DATE_TRUNC`, `FILTER`) rather than loading raw transactions into memory.

---

## 2. Audit of Existing Codebase & Schema Relationships

### 2.1 Domain Models & Database Tables
The application contains 39 SQLAlchemy 2.x mapped entities across 7 modules:

| Domain Module | Primary Tables | Financial & Operational Relevance |
|---|---|---|
| **Auth** (`app.modules.auth`) | `users`, `roles`, `user_roles`, `invitations` | Access control context for Owner, HR, Receptionist, Shop Staff, Members, and Business Clients. |
| **Members** (`app.modules.members`) | `membership_plans`, `members`, `member_subscriptions` | Membership tiers, historical subscription fee snapshots, expiry dates. |
| **Courts & Bookings** (`app.modules.courts`, `app.modules.bookings`) | `courts`, `bookings`, `social_play_sessions`, `social_play_participants` | Court hourly rates, walk-in fees, booking durations (60 mins), cancellation audits, social play fees. |
| **Commerce & Inventory** (`app.modules.shop`, `app.modules.cafeteria`) | `product_categories`, `products`, `orders`, `order_items`, `inventory_movements`, `order_status_history` | Retail POS and cafeteria order totals, line item discounts, tax snapshots, stock levels, reorder alerts. |
| **Finance** (`app.modules.finance`) | `business_clients`, `invoices`, `invoice_items`, `payments`, `payment_allocations`, `payment_allocation_reversals`, `receipts`, `payment_refunds` | Receivables ledger, issued invoices, successful payments, net allocations, amount-based reversals, refunds. |
| **HR & Payroll** (`app.modules.employees`) | `departments`, `designations`, `employees`, `attendances`, `leave_requests`, `salary_structures`, `salary_assignments`, `payroll_periods`, `payroll_runs`, `payroll_entries`, `payroll_entry_components`, `payslips`, `payroll_disbursements` | Workforce headcount, attendance check-ins, leave status, payroll run liabilities, actual payroll disbursements. |

---

## 3. Financial Source-of-Truth & Accounting Definitions

### 3.1 Cash Flow vs. Receivables

| Concept | Definition & Query Source | Inclusion / Exclusion Criteria |
|---|---|---|
| **Invoice Value (Issued Receivables)** | Total face value of invoices issued during the period: $\sum \text{invoices.total\_amount}$. | Excludes `draft`, `cancelled`, and `void` invoices. Filters by `issue_date` within reporting period. |
| **Outstanding Receivables** | Remaining unpaid balance across open invoices: $\sum (\text{invoice.total\_amount} - \text{invoice.amount\_paid})$. | Only includes invoices with `invoice_status` in (`issued`, `partially_paid`). |
| **Customer Payments Received (Gross Cash)** | Actual cash received into club accounts during period: $\sum \text{payments.amount}$. | Only payments with `payment_status == 'successful'` and `received_at` within period. |
| **Customer Refunds** | Cash returned to customers from unallocated payment balances: $\sum \text{payment_refunds.amount}$. | Filters by `created_at` within reporting period. |
| **Net Customer Collections** | Net cash collected from customers: $\text{Payments Received} - \text{Customer Refunds}$. | Represents true net liquid cash inflow from customer operations. Does **not** deduct allocation reversals (which reallocate credit, not refund cash). |
| **Allocated Payment Value** | Funds distributed to legally settle invoices: $\sum \text{allocations.allocated\_amount} - \sum \text{reversals.amount}$. | Authoritative double-entry settlement against invoice obligations. |
| **Unallocated Payment Balance** | Customer credits held in escrow or prepayments: $\text{Payments Received} - \text{Allocated Value} - \text{Refunds}$. | Customer cash held but not yet matched to an invoice. |

### 3.2 Operating Expenses & Surplus Definition
- **Recorded Operating Expenses:** $\sum \text{payroll_disbursements.amount}$ disbursed to staff during the period.
- **Estimated Operating Surplus based on recorded transactions:**
  $$\text{Estimated Surplus} = \text{Net Customer Collections} - \text{Recorded Operating Expenses}$$
- **Disclosure of Coverage:**
  - *Included Inflows:* Shop counter cash, cafeteria sales payments, subscription purchases, corporate business client payments.
  - *Included Outflows:* Staff payroll bank transfers, cash disbursements.
  - *Excluded Outflows (Unrecorded in DB):* Utility bills, court maintenance contracts, property rent, equipment depreciation, and statutory business taxes.

---

## 4. Tax Reporting Architecture & Deduplication

1. **Commerce Output Tax (POS & Cafeteria):**
   - Source: `orders.tax_amount` where `order_status != 'cancelled'`.
   - Captures GST collected across pro-shop equipment and food/beverage counter orders.
2. **Direct Invoicing Output Tax (Corporate & Direct Contracts):**
   - Source: `invoices.tax_amount` where `order_id IS NULL` and `invoice_status.notin_(['cancelled', 'void', 'draft'])`.
3. **Deduplication Safeguard:**
   - Invoices generated from shop or cafeteria orders reference `order_id`. Tax on these orders is counted once under Commerce Tax; they are explicitly excluded from Direct Invoicing Tax to prevent duplicate GST liability reporting.
4. **Statutory Limitation Notice:**
   - The report summarizes taxable turnover and output tax. It does not constitute a legal GSTR-1 or GSTR-3B tax filing without external input tax credit (ITC) ledgers.

---

## 5. Operational Metrics & Utilization Formulations

### 5.1 Court Utilization
- **Operating Window:** 06:00 to 22:00 in timezone `Asia/Kolkata` = **16 available hours per court per day**.
- **Formula:**
  $$\text{Utilization \%} = \frac{\sum (\text{Duration of Confirmed Bookings in Hours})}{\text{Active Courts Count} \times \text{Days in Period} \times 16} \times 100$$
- Cancelled bookings are excluded from utilization numerator and tracked separately as cancellation rate:
  $$\text{Cancellation Rate \%} = \frac{\text{Cancelled Bookings}}{\text{Total Bookings Logged}} \times 100$$

### 5.2 Workforce & Attendance
- **Active Headcount:** Employees with `employment_status == 'active'`.
- **Attendance Rate:** Total present or half-day records divided by active headcount times working days.

---

## 6. Proposed Reporting Architecture & Module Structure

Create `backend/app/modules/reports/`:
```text
backend/app/modules/reports/
├── __init__.py           # Package exports
├── schemas.py            # Pydantic v2 validation contracts for all reports
├── queries.py            # Optimized SQLAlchemy raw & ORM aggregation queries
├── calculations.py       # Financial formulas, surplus derivation, utilization math
├── service.py            # Reporting domain orchestration and date range resolvers
└── routes.py             # FastAPI REST endpoints with RBAC guards under /api/v1/reports/
```

### API Endpoint Plan
- `GET /api/v1/reports/dashboard`: Unified Owner Dashboard with period filters (`today`, `this_week`, `this_month`, `this_year`, `custom`).
- `GET /api/v1/reports/finance/overview`: Comprehensive revenue, collections, allocations, receivables, and operating expenses.
- `GET /api/v1/reports/members/overview`: Membership acquisition, plan distributions, renewals, and upcoming expirations.
- `GET /api/v1/reports/bookings/overview`: Court utilization, peak hours, cancellations, and walk-in ratios.
- `GET /api/v1/reports/commerce/overview`: Shop sales, cafeteria sales, product performance, and low-stock alerts.
- `GET /api/v1/reports/hr/overview`: Staff headcount, attendance ratios, leave stats, and payroll obligations vs. disbursements.
- `GET /api/v1/reports/tax/summary`: Output GST summary deduplicating orders and direct invoices.
- `GET /api/v1/reports/export/csv`: Export capability for financial ledgers, bookings, and inventory reports.

---

## 7. RBAC & Data Privacy Matrix

| Role | Dashboard | Finance Reports | Tax Summary | Member Reports | Booking Reports | Commerce Reports | HR & Payroll Reports |
|---|---|---|---|---|---|---|---|
| **Owner** | Full | Full | Full | Full | Full | Full | Full |
| **HR Staff** | Forbidden | Forbidden | Forbidden | Forbidden | Forbidden | Forbidden | Full |
| **Shop Staff** | Forbidden | Forbidden | Forbidden | Forbidden | Forbidden | Full (Commerce) | Forbidden |
| **Receptionist** | Forbidden | Forbidden | Forbidden | Full (Members) | Full (Bookings) | Forbidden | Forbidden |
| **Member** | Forbidden | Forbidden | Forbidden | Forbidden | Forbidden | Forbidden | Forbidden |
| **Business Client** | Forbidden | Forbidden | Forbidden | Forbidden | Forbidden | Forbidden | Forbidden |

---

## 8. Testing Strategy
- Automated tests isolated strictly in `champions_club_test`.
- Test suite: `backend/tests/test_reports.py`.
- Regression verification across Milestones A through G.
