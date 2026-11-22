# Champions Club — Enterprise ERP Platform Architecture & Implementation Plan

## Executive Vision
Champions Club is an enterprise-grade, multi-tenant Sports Club Management System designed for racquet clubs, athletic facilities, and multi-sport complexes. The system replaces legacy paper logs and uncoordinated spreadsheets with an integrated, high-availability ERP.

## Technology Stack Architecture
- **Backend Core**: Python 3.12+, FastAPI, SQLAlchemy 2.0 (Async/Sync ORM), Pydantic v2 validation.
- **Relational Database**: PostgreSQL 18 with connection pooling, foreign keys, transaction boundaries, and Alembic database migrations.
- **Frontend Core**: React 19, JavaScript (ES2024), Vite build system, Tailwind CSS design system, Lucide React icons.
- **Security & Authorization**: OAuth2 Password Bearer flow, JWT authentication with role claims and token revocation, Role-Based Access Control (RBAC) supporting 8 enterprise roles.
- **Automated Testing & Quality**: Pytest with transactional test database isolation for backend; Vitest and React Testing Library for frontend component and integration testing.

## Domain Modules & Architecture Breakdown

### 1. Identity, Authentication & RBAC Foundation
- Multi-role permission matrix: `owner`, `receptionist`, `shop_staff`, `cafeteria_staff`, `hr_manager`, `account_staff`, `corporate_client`, `member`.
- Secure JWT authentication with server-side revocation on logout (`token_version`).
- Owner-managed cryptographic single-use invitation tokens (48-hour expiration) for staff onboarding.

### 2. Membership Plans & Member Subscriptions
- Configurable membership tiers (e.g., Gold Elite, Silver Regular, Junior) with duration periods and cross-department discount percentages (courts, pro-shop, cafeteria).
- Member registration, life-cycle tracking, renewal pricing, status management, and walk-in customer support.

### 3. Court Operations & Reservation Engine
- Multi-sport court directory (Badminton, Tennis, Squash).
- Visual court availability matrix (06:00 to 22:00 IST operating schedule).
- ACID-compliant booking validation: strict 60-minute session blocks on 30-minute intervals, maximum 2 active bookings/day per member, conflict detection preventing double-booking, and automatic tier discounts.

### 4. Friday Social Mixer Tournament Engine
- Community doubles social play management with automatic pairing, bracket coordination, and capacity limits.

### 5. Retail Pro-Shop POS & Shared Stock Inventory
- Point of Sale (POS) terminal with instant stock deductions.
- Multi-category product catalog with barcode/SKU tracking, reorder alert thresholds, and immutable audit logs of stock movements.

### 6. Cafeteria Management & Kitchen Display System (KDS)
- Food & beverage menu catalog with category filters and dietary tags.
- Live kitchen order tickets with status transitions (`SUBMITTED` → `PREPARING` → `READY` → `COMPLETED`).
- Table orders and takeaway counter service.

### 7. Human Resources & Biometric Attendance
- Organization hierarchy: departments, designations, employee directory, and employment status.
- Biometric-aligned attendance tracking (check-in/check-out timestamp logging).
- Leave management workflows: employee requests, manager approval/rejection, balance tracking.
- Salary structures and payroll run generation with gross pay, allowances, deductions, and net payslips.

### 8. Corporate Accounts, Invoicing & Finance
- Business client directory with credit terms, corporate billing rosters, and GSTIN registration.
- Dual-tax GST invoice engine (CGST + SGST or IGST), payment recording, and PDF invoice receipts.

### 9. Executive Owner Analytics Dashboard
- Real-time KPIs: total revenue, cash-up reconciliation, active membership count, court utilization rates, and department performance breakdowns.

### 10. Self-Service Portals & Public Landing Page
- **Public Showcase**: High-conversion landing page presenting arenas, amenities, membership options, mixer events, and enterprise ERP capabilities.
- **Member Self-Service**: Booking history, court reservations, active membership plans, and digital pass.
- **Corporate Portal**: Company invoices, employee roster, payment receipts, and billing history.
