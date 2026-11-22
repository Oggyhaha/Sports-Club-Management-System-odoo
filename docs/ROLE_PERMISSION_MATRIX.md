# CHAMPIONS CLUB — ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSION MATRIX
## Master Architectural Reference for All 8 Roles

| Module / Operation | Owner | Receptionist | Member | Prospective Member | Shop Staff | Cafeteria Staff | HR Staff | Account Staff | Corporate Client |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Authentication & Profile** |
| Register User (`/auth/register`) | Public | Public | Public | Public | Public | Public | Public | Public | Public |
| Login (`/auth/login`) | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Revoke Session / Sign Out (`/auth/logout`) | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| View / Update Personal Profile (`/auth/me`) | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **Executive & Financial Reports** |
| Executive Dashboard (`/owner/dashboard`) | Yes | No | No | No | No | No | No | No | No |
| Financial Performance Analytics (`/reports/finance`) | Yes | No | No | No | No | No | No | No | No |
| GST Tax Summary & Audit (`/reports/tax`) | Yes | No | No | No | No | No | No | No | No |
| CSV / Excel Export | Yes | No | No | No | No | No | No | No | No |
| **Reception & Court Operations** |
| Shift Coordination Schedule (`/reception`) | Yes | Yes | No | No | No | No | No | No | No |
| Court Availability Matrix (`/bookings/availability`) | Yes | Yes | Yes (Read) | Yes (Read) | No | No | No | No | No |
| Book Court for Walk-in (`POST /bookings`) | Yes | Yes | No | No | No | No | No | No | No |
| Book Court for Club Member (`POST /bookings`) | Yes | Yes | Self Only | Self (Once Active) | No | No | No | No | No |
| Cancel Booking (`POST /bookings/{id}/cancel`) | Yes | Yes | Own Only | No | No | No | No | No | No |
| Courts Directory & Management (`/courts`) | Yes | Yes | View Only | View Only | No | No | No | No | No |
| Friday Social Play Sessions (`/social-play`) | Yes | Yes | Yes | Yes | Yes (View) | Yes (View) | No | No | No |
| Join / Leave Friday Social (`POST /social-sessions/...`) | Yes | Yes | Yes | Yes (Active) | No | No | No | No | No |
| **Membership & Subscriptions** |
| Member Directory (`/members`) | Yes | Yes | No | No | No | No | No | No | No |
| Create Member (`POST /members`) | Yes | Yes | No | No | No | No | No | No | No |
| Edit Member Profile (`PUT /members/{id}`) | Yes | Yes | Self Contact | Self Contact | No | No | No | No | No |
| View Catalog Plans (`GET /members/plans`) | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Create / Edit Plan Tiers (`POST /members/plans`) | Yes | No | No | No | No | No | No | No | No |
| Online Plan Purchase & Mock Gateway (`POST /members/me/subscribe`) | Yes | Yes | Yes | Yes | No | No | No | No | No |
| Staff Subscription Purchase (`POST /members/{id}/subscriptions`) | Yes | Yes | No | No | No | No | No | No | No |
| Staff Subscription Renewal / Change Plan | Yes | Yes | No | No | No | No | No | No | No |
| Member Self-Service Portal (`/member`) | Yes | No | Yes | Yes | No | No | No | No | No |
| **Commerce & Pro-Shop** |
| POS Register Checkout (`/shop/pos`) | Yes | No | No | No | Yes | No | No | No | No |
| Inventory Stock Adjustment (`/shop/inventory`) | Yes | No | No | No | Yes | No | No | No | No |
| Product Catalog Viewing (`/shop/products`) | Yes | Yes | Yes | Yes | Yes | Yes | No | No | No |
| Online Pro-Shop Member Order (`POST /shop/orders`) | Yes | No | Yes | Yes | No | No | No | No | No |
| Order Receipts Audit (`/shop/orders`) | Yes | No | Own Orders | Own Orders | Yes | No | No | No | No |
| **Cafeteria & Dining** |
| Kitchen Display Queue (`/cafeteria/kitchen`) | Yes | Yes | No | No | Yes | Yes | No | No | No |
| Update Order Preparation Status (`PATCH /shop/orders/...`) | Yes | No | No | No | Yes | Yes | No | No | No |
| Cafeteria Menu (`/cafeteria/menu`) | Yes | Yes | Yes | Yes | Yes | Yes | No | No | No |
| **Human Resources & Payroll** |
| Staff Employee Directory (`/hr/employees`) | Yes | No | No | No | No | No | Yes | No | No |
| Department & Designation Setup (`/hr/departments`) | Yes | No | No | No | No | No | Yes | No | No |
| Attendance Tracking & Check-in (`/hr/attendance`) | Yes | Staff View | No | No | Staff View | Staff View | Yes | No | No |
| Leave Requests & Approval (`/hr/leaves`) | Yes | Staff Submit | No | No | Staff Submit | Staff Submit | Yes (Approve) | No | No |
| Salary Structures Configuration (`/hr/salary-structures`)| Yes | No | No | No | No | No | Yes | No | No |
| Monthly Payroll Generation & Processing (`/hr/payroll`) | Yes | No | No | No | No | No | Yes | No | No |
| Personal Payslips Review (`/hr/payslips`) | Yes | Yes (Own) | No | No | Yes (Own) | Yes (Own) | Yes (Own) | Yes (Own) | No |
| **Finance, Invoicing & Corporate Accounts** |
| Invoices Ledger (`/finance/invoices`) | Yes | Yes | Own Invoices | Own Invoices | No | No | No | Yes | Own Invoices |
| Record Invoice Payments (`/finance/payments`) | Yes | Yes | No | No | No | No | No | Yes | No |
| Official Cash/Bank Receipts (`/finance/receipts`) | Yes | Yes | No | No | Yes | No | No | Yes | No |
| Corporate Business Accounts (`/finance/clients`) | Yes | No | No | No | No | No | No | Yes | No |
| Corporate Self-Service Portal (`/corporate`) | Yes | No | No | No | No | No | No | No | Yes |

---

### Object-Level Authorization Rules
1. **Members**:
   - May only retrieve or cancel bookings where `booking.member_id == current_user.member_profile.id`.
   - May only access subscriptions, orders, and invoices linked to their own account.
2. **Corporate Clients**:
   - May only query invoices, payments, and account balances linked to their `business_client.id`.
3. **Employees**:
   - May only view payslips and attendance records tied to their linked `employee.id`.
