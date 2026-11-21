# Reporting & Analytics Architecture (Milestone G)

## 1. Architectural Overview

The reporting engine in **Champions Club Sports Club Management System** aggregates persisted relational data across all operational domains (Milestones A–F) into high-performance executive and departmental analytics without requiring secondary databases, ETL pipelines, or asynchronous batch workers.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI REST API Layer                          │
│     /reports/dashboard | /finance | /members | /bookings | /commerce   │
│                 /hr | /tax | /export/csv                               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │      Reporting Service        │
                    │   (backend/app/modules/       │
                    │        reports/service.py)    │
                    └───────┬───────────────┬───────┘
                            │               │
            ┌───────────────▼──────┐ ┌──────▼──────────────┐
            │   Calculations       │ │   SQL Query Engine  │
            │   - Period Bounds    │ │   - Aggregations    │
            │   - Quantization     │ │   - Deduplication   │
            │   - Utilization %    │ │   - Joins & Filters │
            └──────────────────────┘ └──────────────┬───────┘
                                                    │
                                     ┌──────────────▼──────────────┐
                                     │     PostgreSQL 18 DB        │
                                     │  (Invoices, Payments,       │
                                     │   Orders, Bookings, HR)     │
                                     └─────────────────────────────┘
```

---

## 2. Directory Structure

```text
backend/app/modules/reports/
├── __init__.py           # Exports reports_router
├── calculations.py       # Timezone-aware date resolver, decimal quantizers, utilization formulas
├── queries.py            # Optimized SQLAlchemy Core/ORM queries for all KPI domains
├── routes.py             # FastAPI REST endpoints with role-based access control (RBAC)
├── schemas.py            # Pydantic v2 schemas for all reports, filters, and metadata
└── service.py            # Domain service orchestrating calculations, queries, and CSV generation
```

---

## 3. Period Resolution & Timezone Integrity

All date ranges are anchored strictly to the club's local timezone (`Asia/Kolkata`, UTC+05:30):

| Filter Preset | Period Calculation | Local Time Range |
| :--- | :--- | :--- |
| `today` | Start: Current Date, End: Current Date | 00:00:00 to 23:59:59.999999 |
| `this_week` | Monday to Sunday of current week | Monday 00:00:00 to Sunday 23:59:59.999999 |
| `this_month` | Day 1 to Final Day of current month | 1st 00:00:00 to Last Day 23:59:59.999999 |
| `this_year` | Jan 1 to Dec 31 of current year | Jan 1 00:00:00 to Dec 31 23:59:59.999999 |
| `custom` | User-provided `start_date` and `end_date` | `start_date` 00:00:00 to `end_date` 23:59:59.999999 |

Calendar boundaries are converted to UTC datetime bounds for timestamped entities (`payments.received_at`, `orders.created_at`, `bookings.start_time`) while date-only entities (`invoices.issue_date`, `payroll_disbursements.disbursement_date`) query against the local calendar dates.

---

## 4. Query Engine Design

1. **Database Aggregations**: All numeric summations and counts are executed within PostgreSQL using `func.sum()`, `func.count()`, and conditional `case()` statements, preventing memory overhead in the application server.
2. **Deterministic Calculations**: Monetary figures use Python `Decimal` quantized to `Decimal("0.01")` to eliminate floating-point drift.
3. **Zero-Safe Arithmetic**: Percentage and utilization formulas guard against zero divisions (`total_count > 0` checks with fallback to `Decimal("0.00")`).

---

## 5. Security & RBAC Matrix

| Endpoint | Method | Allowed Roles | Forbidden Roles |
| :--- | :---: | :--- | :--- |
| `/reports/dashboard` | GET | `owner` | `receptionist`, `shop_staff`, `hr_staff`, `member`, `business_client` |
| `/reports/finance/overview` | GET | `owner` | `receptionist`, `shop_staff`, `hr_staff`, `member`, `business_client` |
| `/reports/tax/summary` | GET | `owner` | `receptionist`, `shop_staff`, `hr_staff`, `member`, `business_client` |
| `/reports/export/csv` | GET | `owner` | `receptionist`, `shop_staff`, `hr_staff`, `member`, `business_client` |
| `/reports/members/overview` | GET | `owner`, `receptionist` | `shop_staff`, `hr_staff`, `member`, `business_client` |
| `/reports/bookings/overview` | GET | `owner`, `receptionist` | `shop_staff`, `hr_staff`, `member`, `business_client` |
| `/reports/commerce/overview` | GET | `owner`, `shop_staff` | `receptionist`, `hr_staff`, `member`, `business_client` |
| `/reports/hr/overview` | GET | `owner`, `hr_staff` | `receptionist`, `shop_staff`, `member`, `business_client` |
