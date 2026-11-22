# CHAMPIONS CLUB — FINAL REST API SPECIFICATION
## Comprehensive Endpoints, Request Schemas & Authorization Reference

Base URL: `/api/v1`

---

### 1. Authentication (`/auth`)
- **`POST /auth/register`**: Public registration. Accepts `{ email, password, full_name, phone }`. Creates `User` with role `member` (Prospective Member). Returns JWT token & user summary.
- **`POST /auth/login`**: Public OAuth2 form login. Accepts `username` (email) and `password`. Returns `{ access_token, token_type: "bearer" }`.
- **`POST /auth/logout`**: Authenticated session revocation. Increments `token_version` on the user record in database. Returns `{ detail: "Session revoked successfully" }`.
- **`GET /auth/me`**: Current user profile and assigned roles. Returns `{ id, email, full_name, phone, roles, is_active }`.
- **`PUT /auth/me`**: Update personal profile details (`full_name`, `phone`).

---

### 2. Members & Membership Plans (`/members`)
- **`GET /members/plans`**: List public plan tiers. Query param: `active_only` (default true). Returns `List[MembershipPlanResponse]`.
- **`POST /members/plans`**: Create plan tier. Owner only. Accepts `MembershipPlanCreate`.
- **`PUT /members/plans/{plan_id}`**: Update plan tier. Owner only. Accepts `MembershipPlanUpdate`.
- **`GET /members/me`**: Member self-service profile. Authenticated user. Resolves linked `Member` by `user_id` (with fallback to `email`). Returns `MemberResponse` with nested active plan.
- **`POST /members/me/subscribe`**: **Self-service online plan enrollment & mock checkout**. Authenticated user. Accepts `OnlineSubscriptionPurchaseRequest`:
  ```json
  {
    "plan_id": "uuid",
    "payment_method": "mock_card",
    "payment_reference": "MOCK-TXN-ABC1234"
  }
  ```
  Creates/links member, captures snapshot, creates active paid subscription, synchronizes expiry date, and returns `MemberSubscriptionResponse`.
- **`GET /members`**: Search member directory. Staff only (`owner`, `receptionist`). Query: `search`, `plan_id`, `is_active`.
- **`POST /members`**: Register new member. Staff only. Accepts `MemberCreate`.
- **`GET /members/{member_id}`**: Get member profile. Staff or own member.
- **`PUT /members/{member_id}`**: Update member profile. Staff only.
- **`POST /members/{member_id}/subscriptions`**: Purchase initial subscription. Staff only.
- **`POST /members/{member_id}/renew`**: Renew subscription. Staff only.
- **`POST /members/{member_id}/change-plan`**: Change plan tier. Staff only.
- **`GET /members/{member_id}/subscriptions`**: List subscription history. Staff or own member.

---

### 3. Sports Courts & Reservations (`/bookings` & `/courts`)
- **`GET /bookings/availability`**: Check 60-minute time slot availability across active courts from 06:00 to 22:00 IST in 30-minute intervals. Accepts query params: `date` or `target_date`, optional `court_id`. Public / Staff / Member.
- **`GET /bookings`**: Retrieve reservations. Query params: `date` or `target_date`, `court_id`, `status`. Staff see all; members see strictly own bookings.
- **`POST /bookings`**: Create reservation. Accepts `BookingCreate`:
  ```json
  {
    "court_id": "uuid",
    "start_time": "2026-11-22T08:00:00+05:30",
    "member_id": "uuid",
    "walk_in_name": "string",
    "walk_in_phone": "string"
  }
  ```
  Enforces member self-booking check, court conflict checks, operating hours (06:00-22:00), and calculates member discount automatically.
- **`POST /bookings/{booking_id}/cancel`**: Cancel reservation. Staff or booking owner.
- **`GET /courts`**: List courts. Query: `sport_type`, `is_active`.
- **`POST /courts`**: Create court facility. Owner only.
- **`PUT /courts/{court_id}`**: Update court facility. Owner only.

---

### 4. Friday Social Play (`/bookings/social-sessions`)
- **`GET /bookings/social-sessions`**: List social sessions. Query: `date`, `status`.
- **`POST /bookings/social-sessions`**: Schedule Friday social session. Staff only.
- **`POST /bookings/social-sessions/{session_id}/join`**: Join social session. Authenticated member with active subscription.
- **`POST /bookings/social-sessions/{session_id}/leave`**: Leave social session. Registered participant.
- **`POST /bookings/social-sessions/{session_id}/cancel`**: Cancel social session. Staff only.

---

### 5. Commerce, Pro-Shop & Cafeteria (`/shop`)
- **`GET /shop/categories`**: List product categories. Query: `module_type` (`shop` or `cafeteria`).
- **`GET /shop/products`**: List products. Query: `category_id`, `module_type`, `is_active`.
- **`POST /shop/products`**: Create product. Owner only.
- **`PUT /shop/products/{product_id}`**: Update product pricing and stock. Owner only for pricing; shop staff for stock.
- **`POST /shop/orders`**: Create POS or Member online order. Accepts `OrderReceiptCreate`.
- **`GET /shop/orders`**: List orders. Staff see all; members see strictly own orders.
- **`PATCH /shop/orders/{order_id}/status`**: Update kitchen order preparation status (`pending` -> `preparing` -> `ready` -> `served`). Staff only (`owner`, `shop_staff`, `cafeteria_staff`).

---

### 6. Human Resources & Payroll (`/employees`, `/hr`)
- **`GET /employees`**: Staff directory. Staff only (`owner`, `hr_staff`).
- **`POST /employees`**: Onboard employee. Staff only.
- **`GET /employees/departments`**: Department list.
- **`POST /employees/departments`**: Create department.
- **`GET /employees/attendance`**: Attendance logs.
- **`POST /employees/attendance`**: Clock-in / Clock-out.
- **`GET /employees/leaves`**: Leave applications.
- **`POST /employees/leaves`**: Submit leave request.
- **`PATCH /employees/leaves/{leave_id}`**: Approve / Reject leave. HR only.
- **`GET /employees/payroll`**: Monthly payroll summaries and payslips.
- **`POST /employees/payroll/generate`**: Generate payroll run. HR only.

---

### 7. Finance, Corporate & Billing (`/finance`, `/business-clients`)
- **`GET /business-clients`**: Corporate accounts directory. Staff only (`owner`, `account_staff`).
- **`POST /business-clients`**: Register corporate account. Staff only.
- **`GET /business-clients/me`**: Corporate self-service profile for authenticated corporate user.
- **`GET /business-clients/me/invoices`**: Invoices for authenticated corporate user.
- **`GET /finance/invoices`**: Invoices ledger. Staff see all; members and corporate see own.
- **`POST /finance/invoices`**: Create invoice with itemized lines and GST. Staff only.
- **`POST /finance/payments`**: Record payment receipt against invoice. Staff only.
- **`GET /finance/receipts`**: Official numbered payment receipts. Staff only.

---

### 8. Executive Analytics & Reporting (`/reports`)
- **`GET /reports/dashboard`**: Executive dashboard metrics (Revenue, Member growth, Occupancy). Owner only.
- **`GET /reports/finance`**: Comprehensive financial performance breakdown. Owner only.
- **`GET /reports/tax`**: GST tax liability summary. Owner only.
- **`GET /reports/export`**: Streamed CSV export of analytics reports. Owner only.
