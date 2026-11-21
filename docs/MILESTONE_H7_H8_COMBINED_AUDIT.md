# CHAMPIONS CLUB — COMBINED MILESTONE H7 + H8
## Pre-Implementation Architecture, API Contract & Security Audit
### Member & Corporate Self-Service Portals, End-to-End System Integration & Regression Testing

---

## 1. Architecture Findings & Current Repository State

### 1.1 Completed Milestones Baseline
- **Milestones A–G (Backend):** Fully functional modular monolith with PostgreSQL 18, SQLAlchemy 2.x, Pydantic v2, Alembic migrations, and JWT HS256 authentication with database-backed session token versioning.
- **Milestone H1 (Backend API Contract Audit):** Audited all 126 endpoints across 15 domains (`docs/MILESTONE_H_API_CONTRACT.md`).
- **Milestones H2 + H3 (Frontend Foundation & Design System):** React 19, Vite 6, Tailwind CSS v4, custom Design System, accessible modals, focus trapping, AuthContext session lifecycle, and responsive layout shell.
- **Milestone H4 (Owner Dashboard):** Live executive analytics across 6 operational subsystems with period presets and CSV streaming.
- **Milestones H5 + H6 (Operational Modules, HR, Finance & Administration):** Committed at `60e2b2c`. 10 domain services fully aligned with backend schemas; 22 operational workflows active; 11 Vitest test suites (56 tests) passing; Vite production build verified.

### 1.2 Frontend Self-Service Architecture Inspection
- **Member Portal (`/member`):**
  - Current File: `frontend/src/pages/member/MemberDashboardPage.jsx`
  - Current State: Static placeholder shell displaying mock badges, placeholder account labels, and inactive service links.
  - Required State: Fully interactive member workspace integrating:
    1. Active Membership & Plan Details (tier snapshot, start/expiry dates, court/pro-shop/cafeteria discount percentages, historical subscription ledger).
    2. Court Reservations (upcoming bookings, past booking history, 60-minute time slot booking modal with member discount deduction, and booking cancellation).
    3. Friday Social Play (my joined mixer sessions, roster inspection, one-click join/leave).
    4. Online Pro-Shop Orders (product catalog browsing, order placement with automatic member discount, order history, pending order cancellation).
    5. Billing & Invoices (personal invoices with line-item breakdowns, paid amounts, outstanding balances, and issue/due dates).
    6. Profile Management (self-service name and phone update with automatic member profile synchronization).
- **Corporate Client Portal (`/corporate`):**
  - Current File: `frontend/src/pages/corporate/CorporateDashboardPage.jsx`
  - Current State: Static placeholder shell with placeholder privileges.
  - Required State: Dedicated B2B corporate account workspace integrating:
    1. Corporate Account Profile (company name, contact person, registered email, phone, GSTIN tax ID, billing address).
    2. Corporate Financial Overview (total billed turnover, total amount paid, net outstanding receivables balance).
    3. Consolidated B2B Invoices Ledger (direct and custom corporate invoices, GST itemization, payment status, issue and due dates).
    4. Corporate Facilities & Event Reservations (information and booking requests).
- **Employee Self-Service (HR):**
  - Current Files: `frontend/src/pages/hr/AttendancePage.jsx`, `LeavesPage.jsx`, `PayrollPage.jsx`
  - Current State: Implemented in H6.
    - Attendance: Self-service clock-in/out station, personal shift history, and unlinked employee 404 warning.
    - Leaves: Personal leave application modal with date bounds, pending leave cancellation, and status ledger.
    - Payroll: Dedicated "My Personal Payslips" tab with snapshot component breakdown modals.

---

## 2. Comprehensive API Contract Mapping (Self-Service Domains)

This matrix maps every backend API endpoint across all 13 required self-service domains, verifying schema contracts, RBAC requirements, and frontend integration readiness.

### Domain 1: Member Profile & Self-Service
| Field | Specification |
|---|---|
| **HTTP Method & Route** | `GET /api/v1/members/me` |
| **Required Roles & Ownership** | Authenticated User (Bearer JWT). Automatically retrieves `Member` linked via `user_id == current_user.id`. Returns 404 if no member profile exists. |
| **Request Schema** | None (Header: `Authorization: Bearer <token>`) |
| **Response Schema** | `MemberResponse`: `{ id: UUID, user_id: UUID?, full_name: str, email: str, phone: str?, plan_id: UUID, start_date: date, expiry_date: date, is_active: bool, created_at: datetime, plan: MembershipPlanResponse? }` |
| **Query Parameters** | None |
| **Existing Service** | `memberService.getMyProfile()` |
| **Status** | Implemented in service; ready to wire into `MemberDashboardPage.jsx`. |

| Field | Specification |
|---|---|
| **HTTP Method & Route** | `GET /api/v1/auth/me` |
| **Required Roles & Ownership** | Authenticated User (Bearer JWT). Returns user profile, roles list, and embedded `MemberSummary` (`plan_name`, `start_date`, `expiry_date`, `is_active`). |
| **Request Schema** | None |
| **Response Schema** | `UserMeResponse`: `{ id: UUID, email: str, full_name: str, phone: str?, is_active: bool, roles: List[str], created_at: datetime, member_profile: MemberSummary? }` |
| **Existing Service** | `authService.getCurrentUser()` |
| **Status** | Implemented and active in `AuthContext.jsx`. |

| Field | Specification |
|---|---|
| **HTTP Method & Route** | `PUT /api/v1/auth/me` |
| **Required Roles & Ownership** | Authenticated User (Bearer JWT). Updates user profile and **automatically synchronizes** `full_name` and `phone` to linked `Member` record. |
| **Request Schema** | `UserProfileUpdateRequest`: `{ full_name: Optional[str] (min 2, max 100), phone: Optional[str] (max 20) }` |
| **Response Schema** | `UserMeResponse` |
| **Existing Service** | `authService.updateProfile(data)` |
| **Status** | Implemented in service; ready for member self-service profile editor. |

---

### Domain 2: Membership Details, Renewal & Plan Changes
| Field | Specification |
|---|---|
| **HTTP Method & Route** | `GET /api/v1/members/{member_id}/subscriptions` |
| **Required Roles & Ownership** | `owner`, `receptionist`, or `member`. Object-level check: Member can only view their own subscription history (`member.user_id == current_user.id`); otherwise returns 403 Forbidden. |
| **Request Schema** | None |
| **Response Schema** | `List[MemberSubscriptionResponse]`: `[{ id: UUID, member_id: UUID, plan_id: UUID, start_date: date, end_date: date, price_paid: Decimal, plan_name_snapshot: str, duration_days_snapshot: int, court_discount_snapshot: Decimal, shop_discount_snapshot: Decimal, bar_discount_snapshot: Decimal, subscription_status: str, payment_status: str, created_at: datetime }]` |
| **Existing Service** | `memberService.getMemberSubscriptions(memberId)` |
| **Status** | Implemented in service; ready to display subscription history in member portal. |

| Field | Specification |
|---|---|
| **HTTP Method & Route** | `GET /api/v1/members/plans` |
| **Required Roles & Ownership** | Public catalog / Authenticated. |
| **Request Schema** | None |
| **Response Schema** | `List[MembershipPlanResponse]`: `[{ id: UUID, name: str, monthly_fee: Decimal, court_discount_percent: Decimal, shop_discount_percent: Decimal, bar_discount_percent: Decimal, duration_days: int?, description: str?, is_active: bool }]` |
| **Query Parameters** | `active_only: bool = True` |
| **Existing Service** | `memberService.getPlans(params)` |
| **Status** | Implemented in service; member can view available plans for potential upgrades. |

| Field | Specification |
|---|---|
| **HTTP Method & Route** | `POST /api/v1/members/{member_id}/renew` & `POST /api/v1/members/{member_id}/change-plan` |
| **Required Roles & Ownership** | **Staff only (`owner`, `receptionist`)**. Returns 403 Forbidden for members. |
| **Backend Limitation Note** | Direct payment processing for self-service subscription renewal without staff interaction is not in backend scope. The Member Portal must display clear front-desk renewal instructions and status indications. |

---

### Domain 3: Court Availability & Member Bookings
| Field | Specification |
|---|---|
| **HTTP Method & Route** | `GET /api/v1/bookings/availability` |
| **Required Roles & Ownership** | Public / Authenticated. |
| **Request Schema** | None |
| **Response Schema** | `List[CourtAvailabilityResponse]`: `[{ date: date, court_id: UUID, court_name: str, sport_type: str, hourly_rate: Decimal, walk_in_rate: Decimal?, slots: [{ start_time: datetime, end_time: datetime, is_available: bool, booking_id: UUID?, session_type: str? }] }]` |
| **Query Parameters** | `date: date` (alias `target_date`), `court_id: Optional[UUID]` |
| **Existing Service** | `bookingService.checkAvailability(date, courtId)` |
| **Status** | Implemented in service; reusable via `CourtScheduleMatrix.jsx`. |

| Field | Specification |
|---|---|
| **HTTP Method & Route** | `POST /api/v1/bookings` |
| **Required Roles & Ownership** | `owner`, `receptionist`, or `member`. Object-level check: Member can **only** book for their own linked member profile (`booking_in.member_id == current_user.member_profile.id`); otherwise returns 403 Forbidden. Enforces 60-minute duration, 30-minute boundary alignment, operating hours (06:00–22:00 IST), and member row quota locks. Automatically applies member plan court discount. |
| **Request Schema** | `BookingCreate`: `{ member_id: UUID, court_id: UUID, start_time: datetime, notes: Optional[str] }` |
| **Response Schema** | `BookingResponse`: `{ id: UUID, member_id: UUID, court_id: UUID, start_time: datetime, end_time: datetime, calculated_fee: Decimal, status: str, court: CourtResponse, member: MemberResponse }` |
| **Existing Service** | `bookingService.createBooking(data)` |
| **Status** | Implemented in service; member booking form ready to wire into member portal. |

---

### Domain 4: Booking History & Cancellation
| Field | Specification |
|---|---|
| **HTTP Method & Route** | `GET /api/v1/bookings` |
| **Required Roles & Ownership** | `owner`, `receptionist`, or `member`. **Backend Enforcement:** When caller has only `member` role, backend strictly overrides query parameters to force `member_id = current_user.member_profile.id`. Members cannot view other members' bookings. |
| **Request Schema** | None |
| **Response Schema** | `List[BookingResponse]` |
| **Query Parameters** | `date: Optional[date]`, `status: Optional[str]`, `court_id: Optional[UUID]` |
| **Existing Service** | `bookingService.getBookings(params)` |
| **Status** | Implemented in service; member bookings list ready for display. |

| Field | Specification |
|---|---|
| **HTTP Method & Route** | `POST /api/v1/bookings/{booking_id}/cancel` |
| **Required Roles & Ownership** | `owner`, `receptionist`, or `member`. Object-level check: Member can only cancel their own reservation (`booking.member_id == current_user.member_profile.id`); otherwise returns 403 Forbidden. Frees up availability slot immediately. |
| **Request Schema** | None |
| **Response Schema** | `BookingResponse` (status updated to `'cancelled'`, `cancelled_at` set) |
| **Existing Service** | `bookingService.cancelBooking(bookingId)` |
| **Status** | Implemented in service; cancellation action ready for member portal. |

---

### Domain 5: Friday Social Play
| Field | Specification |
|---|---|
| **HTTP Method & Route** | `GET /api/v1/bookings/social-sessions` |
| **Required Roles & Ownership** | Public / Authenticated. |
| **Response Schema** | `List[SocialPlaySessionResponse]`: `[{ id: UUID, court_id: UUID, title: str, start_time: datetime, end_time: datetime, max_capacity: int, active_participants_count: int, fee_per_participant: Decimal, status: str, court: CourtResponse }]` |
| **Existing Service** | `bookingService.getSocialSessions(params)` |
| **Status** | Implemented in service. |

| Field | Specification |
|---|---|
| **HTTP Method & Route** | `POST /api/v1/bookings/social-sessions/{session_id}/join` |
| **Required Roles & Ownership** | `owner`, `receptionist`, or `member`. For members, backend forces `target_member_id = current_user.member_profile.id`. Enforces `active_participants_count < max_capacity` and prevents duplicate registrations. |
| **Response Schema** | `SocialPlayParticipantResponse`: `{ id: UUID, session_id: UUID, member_id: UUID, status: str, registered_at: datetime }` |
| **Existing Service** | `bookingService.joinSocialSession(sessionId)` |
| **Status** | Implemented in service; one-click join ready. |

| Field | Specification |
|---|---|
| **HTTP Method & Route** | `POST /api/v1/bookings/social-sessions/{session_id}/leave` |
| **Required Roles & Ownership** | `owner`, `receptionist`, or `member`. For members, forces `target_member_id = current_user.member_profile.id`. Marks participant status as `'cancelled'` and frees session capacity. |
| **Response Schema** | `SocialPlayParticipantResponse` |
| **Existing Service** | `bookingService.leaveSocialSession(sessionId)` |
| **Status** | Implemented in service; one-click leave ready. |

---

### Domain 6: Member Shop Orders & Order History
| Field | Specification |
|---|---|
| **HTTP Method & Route** | `POST /api/v1/shop/orders` |
| **Required Roles & Ownership** | Authenticated User. When called by a `member`, backend **automatically** resolves `member_id = current_user.member_profile.id`, sets `is_online=True`, `order_type="shop"`, deducts inventory stock under row locks, applies member shop discount, and snapshots item prices. |
| **Request Schema** | `OrderCreate`: `{ items: List[OrderItemCreate: { product_id: UUID, quantity: int }], notes: Optional[str] }` |
| **Response Schema** | `OrderResponse`: `{ id: UUID, order_number: str, order_type: str, customer_type: str, member_id: UUID?, subtotal: Decimal, discount_amount: Decimal, tax_amount: Decimal, total_amount: Decimal, order_status: str, is_online: bool, created_at: datetime, items: List[OrderItemResponse] }` |
| **Existing Service** | `shopService.createOrder(data)` |
| **Status** | Implemented in service; ready for member catalog shopping and checkout. |

| Field | Specification |
|---|---|
| **HTTP Method & Route** | `GET /api/v1/shop/orders` |
| **Required Roles & Ownership** | Authenticated User. When called by a `member`, backend **automatically restricts** results to `member_id == current_user.member_profile.id`. |
| **Response Schema** | `List[OrderResponse]` |
| **Query Parameters** | `order_status: Optional[str]` |
| **Existing Service** | `shopService.getOrders(params)` |
| **Status** | Implemented in service; member order ledger ready. |

| Field | Specification |
|---|---|
| **HTTP Method & Route** | `POST /api/v1/shop/orders/{order_id}/cancel` |
| **Required Roles & Ownership** | Authenticated User. Member can only cancel their own order (`order.member_id == current_user.member_profile.id`) and **only when `order_status == 'pending'`**. Restores inventory stock. |
| **Request Schema** | `OrderCancelRequest`: `{ reason: Optional[str] }` |
| **Response Schema** | `OrderResponse` (status updated to `'cancelled'`) |
| **Existing Service** | `shopService.cancelOrder(orderId, reason)` |
| **Status** | Implemented in service. |

---

### Domain 7: Cafeteria Order History & Menu
| Field | Specification |
|---|---|
| **HTTP Method & Route** | `GET /api/v1/cafeteria/menu` |
| **Required Roles & Ownership** | Public / Authenticated. |
| **Response Schema** | `List[ProductPublicResponse]` (cafeteria food and beverage items with `is_in_stock`) |
| **Existing Service** | `cafeteriaService.getMenu()` |
| **Status** | Implemented in service; accessible from `/cafeteria/menu`. |

| Field | Specification |
|---|---|
| **HTTP Method & Route** | `GET /api/v1/cafeteria/orders` |
| **Required Roles & Ownership** | **Staff only (`CAFETERIA_STAFF_ROLES`)**. Members cannot query raw cafeteria kitchen tickets. |
| **Backend Architecture Note** | Cafeteria orders are counter-placed by kitchen staff. If an invoice is generated for a member's cafeteria tab, the member sees it via `GET /invoices`. |

---

### Domains 8–10: Employee Self-Service (Attendance, Leave, Payslips)
| Subsystem | Endpoints | Schema & Roles | Status |
|---|---|---|---|
| **Attendance** | `GET /api/v1/attendance/me`<br>`POST /api/v1/attendance/check-in`<br>`POST /api/v1/attendance/check-out` | Authenticated Employee. Clock-in and clock-out with shift tracking. | Fully implemented in `AttendancePage.jsx`. |
| **Leaves** | `GET /api/v1/leaves/me`<br>`POST /api/v1/leaves`<br>`POST /api/v1/leaves/{id}/cancel` | Authenticated Employee. Application submission (`LeaveCreate`) with calendar bounds; self-service cancellation for pending leaves. | Fully implemented in `LeavesPage.jsx`. |
| **Payslips** | `GET /api/v1/payroll/me/payslips`<br>`GET /api/v1/payroll/me/payslips/{id}` | Authenticated Employee. List and view itemized salary component snapshots. | Fully implemented in `PayrollPage.jsx`. |

---

### Domains 11–13: Corporate Client Self-Service (Profile, Invoices, Balances)
| Field | Specification |
|---|---|
| **HTTP Method & Route** | `GET /api/v1/business-clients/me` |
| **Required Roles & Ownership** | Authenticated Corporate User (`business_client`). Retrieves `BusinessClient` where `user_id == current_user.id`. Returns 404 if unlinked. |
| **Request Schema** | None |
| **Response Schema** | `BusinessClientResponse`: `{ id: UUID, company_name: str, contact_person: str, email: str, phone: str?, tax_id_gstin: str?, billing_address: str?, is_active: bool, created_at: datetime }` |
| **Existing Service** | **Missing method in `financeService.js`**. Currently only has `getClients()` and `getClientById(id)`. |
| **Action** | Add `getMyClientProfile()` to `financeService.js`. |

| Field | Specification |
|---|---|
| **HTTP Method & Route** | `GET /api/v1/business-clients/me/invoices` |
| **Required Roles & Ownership** | Authenticated Corporate User (`business_client`). Retrieves all invoices issued to the client's organization. |
| **Response Schema** | `List[InvoiceResponse]`: `[{ id: UUID, invoice_number: str, currency: str, subtotal: Decimal, discount_amount: Decimal, tax_amount: Decimal, total_amount: Decimal, amount_paid: Decimal, outstanding_amount: Decimal, invoice_status: str, issue_date: date, due_date: date, notes: str?, items: List[InvoiceItemResponse] }]` |
| **Query Parameters** | `invoice_status: Optional[str]` |
| **Existing Service** | **Missing method in `financeService.js`**. (Note: `GET /invoices` also auto-filters to corporate client, but direct endpoint is cleanest). |
| **Action** | Add `getMyClientInvoices(params)` to `financeService.js`. |

| Field | Specification |
|---|---|
| **HTTP Method & Route** | `GET /api/v1/invoices/{invoice_id}` |
| **Required Roles & Ownership** | Staff or linked Corporate Client (`inv.business_client.user_id == current_user.id`). Returns 403 Forbidden for other clients. |
| **Response Schema** | `InvoiceResponse` with full line items. |
| **Existing Service** | `financeService.getInvoiceById(invoiceId)` |
| **Status** | Implemented in service; ready for invoice detail modal. |

| Field | Specification |
|---|---|
| **HTTP Method & Route** | Payment & Allocation Visibility |
| **Required Roles & Ownership** | Payments ledger (`GET /payments`) is staff-only (`FINANCE_STAFF_ROLES`). However, corporate clients view payment results via double-entry derived fields on invoices: `amount_paid` (sum of allocations minus reversals), `total_amount`, and `outstanding_amount`. Receipts can be viewed by ID via `GET /receipts/{id}`. |
| **Status** | Invoices provide complete double-entry settlement visibility for corporate users. |

---

## 3. RBAC & Security Audit

### 3.1 Object-Level Isolation & Privacy Boundaries
- **Member Boundary:**
  - Members are restricted to their own linked member profile (`user.member_profile`).
  - `GET /members`: Staff only (`owner`, `receptionist`). Members receive 403.
  - `GET /members/{id}`: Members viewing another member's ID receive 403 Forbidden.
  - `GET /bookings`: Members automatically receive only their own bookings; backend ignores client-supplied `member_id` query param.
  - `POST /bookings`: Members can only pass their own `member_id`. Supplying another ID returns 403 Forbidden.
  - `POST /bookings/{id}/cancel`: Members can only cancel their own booking. Attempting to cancel another's returns 403 Forbidden.
  - `POST /shop/orders`: Members can only create orders for their own member profile.
  - `GET /shop/orders`: Members only receive their own orders.
  - `POST /shop/orders/{id}/cancel`: Members can only cancel their own order and only if `pending`.
- **Corporate Client Boundary:**
  - Corporate users are linked to `business_clients` via `user_id`.
  - `GET /business-clients`: Owner only. Corporate clients receive 403 Forbidden.
  - `GET /business-clients/{id}`: Returns 403 Forbidden if `client.user_id != current_user.id` (unless Owner).
  - `GET /business-clients/me/invoices`: Returns only invoices where `business_client_id == client.id`.
  - `GET /invoices`: Automatically filters to client's organization.
  - `GET /invoices/{id}`: Returns 403 Forbidden if invoice belongs to another company.
- **Employee Boundary:**
  - Employees only access their own attendance (`/attendance/me`), leaves (`/leaves/me`), and payslips (`/payroll/me/payslips`).
  - Administrative queues (`/hr/employees`, `/hr/departments`, `/hr/salary-structures`, `/hr/payroll` admin) require `owner` or `hr_staff`.
- **Administrative Restriction:**
  - Price editing and tax rate modifications on products are Owner-only.
  - Plan creation and modification are Owner-only.
  - Corporate client creation and editing are Owner-only.
  - Payment refund and allocation reversal are Owner-only.
  - Invoice cancellation is Owner-only.
- **JWT Authentication:**
  - HS256 tokens with 30-minute expiry from issuance.
  - Validates `token_version` on every request against PostgreSQL `users.token_version`. Logout instantly increments version and revokes session.

### 3.2 Security Gaps & Identified Fixes
1. **Frontend Route Guards for Self-Service:**
   - In `frontend/src/routes/index.jsx`, `/bookings` is currently restricted to `[ROLES.OWNER, ROLES.RECEPTIONIST]`. Members should either be permitted on `/bookings` (which already auto-filters on the backend) or the member dashboard should provide a dedicated "My Bookings" tab.
   - `/finance/invoices` is currently permitted for `[ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.BUSINESS_CLIENT]`. Members also have an invoice viewing permission on the backend (`GET /invoices`). Adding `ROLES.MEMBER` to `/finance/invoices` gives members direct access to their invoice repository.
2. **Missing Finance Service Methods:**
   - `financeService.js` lacks `getMyClientProfile()` and `getMyClientInvoices()`. Adding these ensures clean self-service calls without requiring staff-scoped client ID lookups.

---

## 4. Existing Functionality Reuse Strategy

To avoid duplication, the self-service portals will directly reuse existing components:

| Capability | Reusable Asset | How Reused in H7 |
|---|---|---|
| **Court Availability & Schedule** | `CourtScheduleMatrix.jsx`<br>`bookingService.checkAvailability` | Embedded directly in Member Portal for live slot selection. |
| **Court Booking Placement** | `CreateBookingModal.jsx`<br>`bookingService.createBooking` | Pre-fills `member_id` with logged-in member; calculates discounted rate. |
| **Social Play Join / Leave** | `bookingService.joinSocialSession`<br>`bookingService.leaveSocialSession` | Embedded in Member Portal with live participant counts and roster modal. |
| **Shop Catalog & Checkout** | `shopService.getProducts`<br>`shopService.createOrder` | Member online shop tab with cart, discount application, and order placement. |
| **Invoices Table & Detail** | `InvoicesPage.jsx` components<br>`financeService.getInvoices` | Reused for Member Invoices tab and Corporate Invoices view. |
| **Profile Editing** | `authService.updateProfile` | Shared profile modal updating name and phone via `PUT /auth/me`. |
| **Status Indicators** | `StatusBadge.jsx` | Renders all booking, subscription, order, and invoice statuses. |
| **Action Confirmations** | `ConfirmationDialog.jsx` | Reused for booking cancellations, order cancellations, and leave cancellations. |
| **Layout & Shell** | `DashboardLayout.jsx`, `PageHeader.jsx`, `Card.jsx`, `Button.jsx`, `Modal.jsx` | Full design system consistency across both portals. |

---

## 5. Integration Risks & Mitigation Plan

| Risk | Cause | Impact | Mitigation Strategy |
|---|---|---|---|
| **Unlinked Member Account (404)** | User registered but staff has not yet linked a `Member` row with `user_id`. | `GET /members/me` returns 404. | Display an informative alert banner: "Your user account is not linked to a club member profile. Please contact the front desk." Prevent booking form crash. |
| **Unlinked Corporate Account (404)** | User invited as `business_client` but no `business_clients` row linked with `user_id`. | `GET /business-clients/me` returns 404. | Display an informative alert banner: "Your corporate account profile is pending activation. Please contact club administration." |
| **Expired Membership Booking Attempt** | Member's plan expired; attempts to book court at member rate. | Backend raises 400 Bad Request ("Member subscription is expired"). | UI indicates subscription status clearly; catches error detail in toast. |
| **Social Session Capacity Race** | Last spot taken concurrently by another member. | Backend atomic transaction rejects with 400 ("Session capacity is full"). | UI displays friendly error toast; refreshes session list immediately. |
| **Online Shop Stock Exhaustion** | Member orders item while inventory drops to 0. | Backend `create_order` raises 400 ("Insufficient inventory stock"). | POS and online catalog check `is_in_stock` / `current_stock`; toast error informs user. |
| **Timezone Booking Offset** | Client browser timezone differs from facility 06:00–22:00 IST. | 400 Bad Request ("Booking start time must be between 06:00 and 22:00"). | Formats timestamps explicitly with `+05:30` (IST offset) using `toLocalISTISOString`. |
