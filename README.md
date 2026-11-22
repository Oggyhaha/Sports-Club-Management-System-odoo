# Champions Club — Enterprise Sports Club Management System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.0-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Pytest Tests](https://img.shields.io/badge/Backend%20Tests-155%20Passed%20(100%25)-brightgreen.svg)]()
[![Vitest Tests](https://img.shields.io/badge/Frontend%20Tests-73%20Passed%20(100%25)-brightgreen.svg)]()

Champions Club is a production-grade, multi-tenant Sports Club Management ERP engineered for racquet clubs, athletics centers, and premier recreational sports facilities. The platform consolidates court operations, point-of-sale retail, cafeteria kitchen management, human resources, payroll calculation, corporate invoicing, and member self-service into an intuitive, high-availability architecture.

---

## System Architecture

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                      Client Layer (React 19 + Vite)                            │
│  - Public Landing Page                                                         │
│  - Executive Owner Dashboard & Analytics                                       │
│  - Reception Court Availability Matrix & Walk-In Intake                         │
│  - Retail POS Terminal & Inventory Movement Audits                             │
│  - Cafeteria Kitchen Display System (KDS) Queue                                │
│  - HR Employee Directory, Attendance Logs, Leave & Payroll Runs                │
│  - Finance GST Invoicing, Business Clients & Receipts                          │
│  - Member & Corporate Self-Service Portals                                     │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │ HTTP / REST (Axios + JWT Bearer)
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                     FastAPI Application Gateway & Router Layer                 │
│  - CORS Middleware & Centralized Error Handlers                                │
│  - OAuth2 Password Bearer Authentication with Server-Side Revocation           │
│  - Strict Role-Based Access Control (RBAC) across 8 Distinct Roles             │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                        Validation Layer (Pydantic v2)                          │
│  - Strict input schemas, sanitization, and output serialization                │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                    Domain Service Layer (ACID Transactions)                    │
│  - Court Conflict Detection & Quota Enforcement                                │
│  - Multi-tier Membership Discount Engine                                       │
│  - Shared Stock Inventory Tracking with Automatic Movement Logging             │
│  - Kitchen Order Ticket Lifecycle State Machine                                │
│  - Biometric Attendance & Payroll Formula Calculation Engine                   │
│  - Dual-tax GST Invoicing and Ledger Allocation Engine                         │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                     Persistence Layer (SQLAlchemy 2.0 ORM)                     │
│  - 25 Relational Tables with Foreign Key Constraints & Cascades                │
│  - Alembic Database Migrations                                                 │
│  - PostgreSQL 18 with Connection Pooling                                       │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Domain Capabilities

### 1. Executive Operations & Owner Analytics
- **Live Cash-Up & Financial Health:** Real-time visibility into daily revenue streams across membership dues, court reservations, pro-shop retail sales, and cafeteria orders.
- **Facility Utilization Metrics:** Hourly booking density heatmaps, court utilization rates, and peak hour capacity tracking.
- **Membership Growth Tracking:** Active subscriber counts, churn analysis, and tier distribution (Gold Elite, Silver Regular, Junior).

### 2. Reception & Court Availability Matrix
- **Visual Schedule Grid:** 06:00 to 22:00 IST court matrix displaying badminton, tennis, and squash availability with immediate booking status indicators.
- **Walk-in & Member Reservations:** Fast-path reservation modal supporting member lookups with automated membership discounts.
- **Conflict Prevention Engine:** Server-enforced validation ensuring strict 60-minute session blocks on 30-minute boundaries, a maximum of 2 active bookings per day per member, and immediate prevention of overlapping court slots.

### 3. Community Friday Social Mixer
- **Event Coordination:** Automated player check-ins, skill-balanced doubles pairings, and court rotations for Friday community sessions.

### 4. Retail Pro-Shop Point of Sale (POS) & Inventory
- **Barcode & SKU Terminal:** Fast barcode-friendly checkout interface supporting cash, card, UPI, and member charge accounts.
- **Shared Stock Inventory Control:** Automated stock deductions on checkout, reorder thresholds, low-stock warnings, and immutable stock movement audits (`PURCHASE`, `SALE`, `ADJUSTMENT`).

### 5. Cafeteria Operations & Kitchen Display System (KDS)
- **Digital Menu & Order Placement:** Categorized beverage and snack catalog with dietary tags.
- **Real-Time KDS Queue:** Color-coded kitchen tickets with operational status transitions (`SUBMITTED` → `PREPARING` → `READY` → `COMPLETED`).

### 6. Human Resources, Attendance & Payroll
- **Staff Directory:** Department management, designations, emergency contacts, and active employee tracking.
- **Biometric Attendance Tracking:** Daily check-in and check-out timestamp records with shift coordination.
- **Leave Management:** Employee leave requests with approval/rejection workflows and balance tracking.
- **Salary Structures & Payroll Engine:** Configurable basic salary, allowances, deductions, and automated monthly payroll calculation with PDF-ready pay slips.

### 7. Corporate Accounts & GST Invoicing
- **Corporate Client Billing:** Credit limit management, designated billing contacts, and employee roster linking.
- **Compliant GST Invoicing:** Dual-tax invoices (CGST + SGST or IGST) with itemized service charges, payment receipt generation, and balance reconciliation.

### 8. Member & Corporate Self-Service Portals
- **Member Workspace:** Digital membership pass, court booking management, tier renewal options, and expense history.
- **Corporate Portal:** Company employee rosters, unified billing invoices, and payment tracking.

---

## Technology Stack

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Backend Framework** | FastAPI | 0.115+ | High-throughput asynchronous REST API |
| **ORM** | SQLAlchemy | 2.0+ | Typed domain models & transactional integrity |
| **Data Validation** | Pydantic | 2.x | Request/response schema contracts |
| **Relational Database** | PostgreSQL | 18+ | Primary relational datastore |
| **Database Migrations**| Alembic | 1.14+ | Schema version control & migrations |
| **Frontend Framework** | React | 19.0 | Reactive component architecture |
| **Build Tool** | Vite | 6.x | Fast ESM dev server and optimized production bundle |
| **Styling** | Tailwind CSS | 3.4+ | Enterprise design system and typography |
| **Icons** | Lucide React | Latest | Modern SVG icon suite |
| **HTTP Client** | Axios | 1.7+ | Configured with JWT interceptors & error handlers |
| **Backend Testing** | Pytest | 8.x | 155 comprehensive automated tests |
| **Frontend Testing** | Vitest & RTL | 3.x | 73 component & workflow integration tests |

---

## Verified Demo Credentials

All demo accounts share the standard master password: **`Champions2026!`**

| Role | Name | Email | Default Workspace |
|---|---|---|---|
| **Club Owner** | Arjun Mehta | `arjun.mehta@championsclub.com` | `/owner/dashboard` |
| **Receptionist** | Front Desk | `reception@championsclub.com` | `/bookings/availability` |
| **Shop Staff** | Ramesh Kumar | `shop@championsclub.com` | `/shop/pos` |
| **Cafeteria Staff** | Sunita Rao | `cafeteria@championsclub.com` | `/cafeteria/kitchen` |
| **HR Manager** | Priya Sharma | `priya.sharma@championsclub.com` | `/hr/employees` |
| **Finance Staff** | Suresh Patel | `accounts@championsclub.com` | `/finance/invoices` |
| **Corporate Client** | Acme Technologies | `acme.corp@championsclub.com` | `/corporate/portal` |
| **Club Member** | Virat Kohli | `virat.kohli@championsclub.com` | `/member/portal` |

---

## Local Setup & Quickstart Guide

This application is designed for local evaluation. No cloud or third-party external services are required.

### Prerequisites
- Python 3.12 or newer
- Node.js 18 or newer & npm
- PostgreSQL 14+ running locally on port `5432`

### 1. Database Configuration
Create a local PostgreSQL database named `champions_club`:

```sql
CREATE DATABASE champions_club;
```

Update your `.env` file in the project root:
```env
DATABASE_URL="postgresql+psycopg://postgres:<your_password>@localhost:5432/champions_club"
SECRET_KEY="champions-club-enterprise-production-secure-jwt-key-2026"
```

### 2. Backend Setup
From the project root:

```powershell
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed initial operational data
python -m app.core.seed_data

# Start FastAPI development server (runs at http://127.0.0.1:8000)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Interactive Swagger API documentation will be available at:
`http://127.0.0.1:8000/docs`

### 3. Frontend Setup
In a second terminal:

```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite development server (runs at http://localhost:5173)
npm run dev
```

Visit `http://localhost:5173` to explore the public landing page and access the role-based portals.

---

## Live Database Inspection

To verify the database state, tables, and live seed records, an automated inspector script is included at the project root:

```powershell
python inspect_data.py
```

The inspector audits all 25 database tables and reports total record counts:
- `users`, `membership_plans`, `members`
- `courts`, `bookings`, `social_sessions`, `social_participants`
- `shop_categories`, `shop_products`, `orders`, `order_items`, `inventory_movements`
- `departments`, `designations`, `employees`, `attendance`, `leave_requests`, `salary_structures`, `payroll_runs`, `payslips`
- `business_clients`, `invoices`, `invoice_items`, `payments`, `receipts`

---

## Automated Quality Assurance & Testing

### Backend Test Suite (Pytest)
The backend includes 155 automated tests covering route authorization, booking constraints, transaction integrity, and edge cases:

```powershell
cd backend
pytest tests/
```
**Result:** `155 passed in ~3.8 seconds (100% pass rate)`

### Frontend Test Suite (Vitest)
The frontend includes 73 component and integration tests verifying form validation, role routing, navigation guards, and state management:

```powershell
cd frontend
npm run test
```
**Result:** `12 test files passed, 73 tests passed (100% pass rate)`

### Production Build Verification
Verify the production build compilation:

```powershell
cd frontend
npm run build
```
**Result:** `Vite build completed with 0 errors`

---

## Security & Compliance Architecture
1. **Password Security:** Cryptographic password hashing using `bcrypt` via Passlib.
2. **Stateless JWTs with Revocation:** 30-minute expiration with a database `token_version` counter ensuring immediate session invalidation on logout.
3. **Defense-in-Depth RBAC:** Dual-layer authorization enforced both at the FastAPI route dependency level (`require_roles`) and via React Route Guards (`RoleRoute`).
4. **Data Isolation:** Object-level authorization prevents users from accessing or modifying records belonging to other members or organizations.
5. **ACID Transaction Boundaries:** Explicit rollback handlers on all critical state mutations (booking slots, inventory stock levels, and payroll generation).

---

## License
Proprietary & Confidential — Champions Club Enterprise Sports Management System. All rights reserved.
