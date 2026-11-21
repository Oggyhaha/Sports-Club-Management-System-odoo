# CHAMPIONS CLUB — MILESTONE H4 API MAPPING
## Backend Reporting API Contract & Dashboard Field Inventory

---

## 1. PRE-IMPLEMENTATION ENDPOINT AUDIT & MAPPING TABLE

| Dashboard Section | Actual Endpoint | Query Parameters | Response Fields | Access |
|---|---|---|---|---|
| **Executive Overview (Unified)** | `GET /api/v1/reports/dashboard` | `filter_type` (str: `today`, `this_week`, `this_month`, `this_year`, `custom`), `start_date` (opt date YYYY-MM-DD), `end_date` (opt date YYYY-MM-DD) | `period`, `financials`, `memberships`, `bookings`, `commerce`, `hr`, `tax` | **Owner Only** (`require_roles([RoleEnum.OWNER])`) |
| **Financial Analytics & Cash Flow** | `GET /api/v1/reports/finance/overview` | `filter_type`, `start_date`, `end_date` | `period`, `financials` (`invoices_issued_count`, `invoices_issued_value`, `outstanding_receivables`, `payments_received_count`, `gross_customer_collections`, `customer_refunds_count`, `customer_refunds_value`, `net_customer_collections`, `net_allocated_value`, `unallocated_customer_balance`, `payroll_disbursements_count`, `recorded_operating_expenses`, `estimated_operating_surplus`, `surplus_disclaimer`), `revenue_by_source` | **Owner Only** |
| **Membership Growth & Plans** | `GET /api/v1/reports/members/overview` | `filter_type`, `start_date`, `end_date` | `period`, `memberships` (`total_registered_members`, `active_members`, `inactive_members`, `active_subscriptions`, `expired_subscriptions`, `new_registrations_in_period`, `renewals_in_period`, `plan_distribution` [`plan_id`, `plan_name`, `active_member_count`]), `expiring_soon_count` | **Owner & Receptionist** |
| **Court Operations & Bookings** | `GET /api/v1/reports/bookings/overview` | `filter_type`, `start_date`, `end_date` | `period`, `bookings` (`total_bookings`, `confirmed_bookings`, `cancelled_bookings`, `cancellation_rate_percent`, `walk_in_bookings`, `walk_in_ratio_percent`, `social_play_sessions`, `social_play_participants`, `total_booked_hours`, `total_available_hours`, `overall_court_utilization_percent`, `court_details` [`court_id`, `court_name`, `sport_type`, `booked_hours`, `available_hours`, `utilization_percent`], `peak_hours` [`hour_slot`, `booking_count`]) | **Owner & Receptionist** |
| **Commerce & Inventory Health** | `GET /api/v1/reports/commerce/overview` | `filter_type`, `start_date`, `end_date` | `period`, `commerce` (`total_orders_count`, `shop_orders_count`, `cafeteria_orders_count`, `cancelled_orders_count`, `completed_orders_value`, `cancelled_orders_value`, `top_selling_products` [`product_id`, `product_name`, `module_type`, `total_units_sold`, `total_sales_value`], `low_stock_alerts_count`, `low_stock_products` [`product_id`, `product_name`, `sku`, `current_stock`, `reorder_threshold`]) | **Owner & Shop Staff** |
| **Workforce, Attendance & Payroll** | `GET /api/v1/reports/hr/overview` | `filter_type`, `start_date`, `end_date` | `period`, `hr` (`total_employees`, `active_employees`, `employees_on_leave`, `department_distribution` [`department_id`, `department_name`, `employee_count`], `attendance_records_count`, `present_records_count`, `leave_requests_count`, `approved_leaves_count`, `payroll_runs_in_period`, `payroll_total_net_payable`, `payroll_total_disbursed`, `payroll_outstanding_liability`) | **Owner & HR Staff** |
| **Statutory Output Tax Summary** | `GET /api/v1/reports/tax/summary` | `filter_type`, `start_date`, `end_date` | `period`, `commerce_tax` (`source`, `taxable_turnover`, `tax_collected`), `direct_invoicing_tax` (`source`, `taxable_turnover`, `tax_collected`), `total_taxable_turnover`, `total_output_tax_collected`, `statutory_notice` | **Owner Only** |
| **CSV Data Export** | `GET /api/v1/reports/export/csv` | `report_type` (`financial`, `membership`, `booking`, `commerce`, `hr`, `tax`, `dashboard`), `filter_type`, `start_date`, `end_date` | Streamed `text/csv` attachment with header `Content-Disposition: attachment; filename="champions_club_{report_type}_{filter_type}.csv"` | **Owner Only** |

---

## 2. METRIC SCOPE & TEMPORAL CLASSIFICATION

Every dashboard metric is explicitly classified by its temporal resolution to prevent misleading analytics:

### A. Period-Based Metrics (Bounded strictly by `start_date` & `end_date`)
- **Financial Inflows & Receivables:**
  - `invoices_issued_count` & `invoices_issued_value`: Invoices created during the period.
  - `payments_received_count` & `gross_customer_collections`: Customer payments successfully completed in the period.
  - `customer_refunds_count` & `customer_refunds_value`: Refunds approved and processed during the period.
  - `net_customer_collections`: `gross_customer_collections - customer_refunds_value`.
  - `net_allocated_value`: Total amount allocated to invoices in the period minus allocation reversals.
- **Operating Expenses & Surplus:**
  - `payroll_disbursements_count` & `recorded_operating_expenses`: Actual staff payroll disbursements executed in the period.
  - `estimated_operating_surplus`: `net_customer_collections - recorded_operating_expenses`.
- **Memberships:**
  - `new_registrations_in_period`: Member accounts created during the period.
  - `renewals_in_period`: Subscription extensions / renewals activated during the period.
- **Courts & Bookings:**
  - `total_bookings`, `confirmed_bookings`, `cancelled_bookings`, `cancellation_rate_percent`.
  - `walk_in_bookings`, `walk_in_ratio_percent`.
  - `social_play_sessions`, `social_play_participants`.
  - `total_booked_hours`, `total_available_hours`, `overall_court_utilization_percent`.
  - `court_details` (utilization breakdown per court).
  - `peak_hours` (frequency distribution by hour).
- **Commerce:**
  - `total_orders_count`, `shop_orders_count`, `cafeteria_orders_count`, `cancelled_orders_count`.
  - `completed_orders_value`, `cancelled_orders_value`.
  - `top_selling_products` (top products sold in period).
- **Workforce / HR:**
  - `attendance_records_count`, `present_records_count`.
  - `leave_requests_count`, `approved_leaves_count`.
  - `payroll_runs_in_period`, `payroll_total_net_payable`, `payroll_total_disbursed`.
- **Tax Liability:**
  - `commerce_tax`, `direct_invoicing_tax`, `total_taxable_turnover`, `total_output_tax_collected`.

### B. Current Snapshot Metrics (As of report execution timestamp)
- **Financial Balances:**
  - `outstanding_receivables`: Total unpaid balance due across open invoices.
  - `unallocated_customer_balance`: Current liquid credit held on customer accounts not yet allocated to invoices.
- **Membership Status:**
  - `active_members`: Members whose current active subscriptions have not expired.
  - `inactive_members`: Members without an active subscription.
  - `active_subscriptions`: Authoritative active subscription records.
  - `expired_subscriptions`: Historical subscriptions past their expiry date.
  - `plan_distribution`: Member count enrolled in each active membership tier.
- **Inventory Stock:**
  - `low_stock_alerts_count`: Count of active products where `current_stock <= reorder_threshold`.
  - `low_stock_products`: Detailed product stock and reorder thresholds.
- **Human Resources:**
  - `active_employees`: Current employees with employment status `active`.
  - `employees_on_leave`: Employees with an approved leave spanning the current date.
  - `department_distribution`: Current employee headcount grouped by department.
  - `payroll_outstanding_liability`: Outstanding unpaid payroll balance across all payroll runs.

### C. All-Time Cumulative Values
- `total_registered_members`: Total member records ever created in the club database.
- `total_employees`: Total employee profiles in the system.

---

## 3. IDENTIFIED LIMITATIONS & METHODOLOGY SAFEGUARDS

1. **Court Utilization Denominator (Historical Court Availability Limitation):**
   - *Methodology:* `total_available_hours = active_courts_count * days_in_period * 16.0` (Operating window: 06:00 to 22:00 IST).
   - *Limitation:* The calculation uses the **current count of active courts**. If courts were added, activated, or deactivated during the selected period, the denominator reflects the present facility state.
   - *UI Requirement:* A methodology note or tooltip must explicitly state this formula and denominator assumption.
2. **Estimated Operating Surplus Scope:**
   - *Methodology:* `net_customer_collections - recorded_operating_expenses` (where operating expenses = actual payroll disbursements).
   - *Mandatory Disclaimer:* Must show exact text:
     > *"Estimated operating surplus based on recorded customer collections less staff payroll disbursements. Excludes unrecorded facility rent, utilities, equipment depreciation, and statutory tax obligations."*
   - *Prohibition:* Must never be presented or labeled as "Net Profit", "EBITDA", or "Operating Profit".
3. **No Fabricated Renewal Rates or Heatmaps:**
   - The backend does not compute a renewal rate percentage (only returns `renewals_in_period` integer). The frontend will display the exact integer count and will not fabricate an arbitrary percentage.
   - The backend returns `peak_hours: List[PeakHourStat]` (hourly booking counts), not a 7x24 weekly matrix. The visualization will be rendered as an hourly bar distribution, not an imaginary heatmap.
4. **Single-Request Unified Architecture:**
   - `GET /api/v1/reports/dashboard` aggregates all 6 subsystems in 1 database session query set. The frontend will consume this unified endpoint as its primary data source, eliminating 6 duplicate roundtrips.
