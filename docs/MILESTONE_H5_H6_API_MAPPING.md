# CHAMPIONS CLUB — COMBINED MILESTONE H5 + H6 API MAPPING
## Operational Modules, Human Resources, Payroll, Finance & Administration

**Document Status:** Production Verified Mapping  
**Backend:** FastAPI, PostgreSQL 18, SQLAlchemy 2.x  
**Frontend:** React 19, Vite, Tailwind CSS v4, Lucide React, Axios  

---

## 1. Domain-to-Endpoint Mapping Table

| Domain & Feature | Method & Endpoint | Request Schema | Response Schema | Query Parameters | Required Roles | State Transitions & Validations | Frontend Page & Component |
|---|---|---|---|---|---|---|---|
| **Members: Plans List** | `GET /api/v1/members/plans` | None | `List[MembershipPlanResponse]` | None | `owner`, `receptionist`, `member` | Active & inactive plans | `pages/members/MembershipPlansPage.jsx` |
| **Members: Plan Create** | `POST /api/v1/members/plans` | `MembershipPlanCreate` | `MembershipPlanResponse` | None | `owner` | Price >= 0, court discount [0, 100] | `pages/members/MembershipPlansPage.jsx` (Modal) |
| **Members: Plan Update** | `PUT /api/v1/members/plans/{id}` | `MembershipPlanUpdate` | `MembershipPlanResponse` | None | `owner` | Name uniqueness, price >= 0 | `pages/members/MembershipPlansPage.jsx` (Modal) |
| **Members: Directory** | `GET /api/v1/members` | None | `List[MemberResponse]` | `search`, `status` | `owner`, `receptionist` | Filter by search query and active status | `pages/members/MembersPage.jsx` |
| **Members: Member Create** | `POST /api/v1/members` | `MemberCreate` | `MemberResponse` | None | `owner`, `receptionist` | Valid email, phone, optional plan_id | `pages/members/MembersPage.jsx` (Modal) |
| **Members: Member Detail** | `GET /api/v1/members/{id}` | None | `MemberResponse` | None | `owner`, `receptionist` | Member profile lookup | `pages/members/MemberDetailPage.jsx` |
| **Members: Subscriptions** | `GET /api/v1/members/{id}/subscriptions` | None | `List[MemberSubscriptionResponse]` | None | `owner`, `receptionist` | Subscription history ledger | `pages/members/MemberDetailPage.jsx` |
| **Members: Subscription Purchase** | `POST /api/v1/members/{id}/subscriptions` | `SubscriptionPurchaseRequest` | `MemberSubscriptionResponse` | None | `owner`, `receptionist` | Valid plan_id, continuous renewal bounds | `pages/members/MemberDetailPage.jsx` (Modal) |
| **Members: Subscription Renew** | `POST /api/v1/members/{id}/renew` | `SubscriptionRenewRequest` | `MemberSubscriptionResponse` | None | `owner`, `receptionist` | Extends from current expiry | `pages/members/MemberDetailPage.jsx` (Modal) |
| **Courts: Directory** | `GET /api/v1/courts` | None | `List[CourtResponse]` | `is_active` | `owner`, `receptionist`, `member` | Active sports facilities | `pages/courts/CourtsPage.jsx` |
| **Courts: Create Court** | `POST /api/v1/courts` | `CourtCreate` | `CourtResponse` | None | `owner` | Unique name, hourly_rate >= 0, walk_in_rate >= 0 | `pages/courts/CourtsPage.jsx` (Modal) |
| **Courts: Update Court** | `PUT /api/v1/courts/{id}` | `CourtUpdate` | `CourtResponse` | None | `owner` | Rates >= 0, status toggle | `pages/courts/CourtsPage.jsx` (Modal) |
| **Bookings: Availability** | `GET /api/v1/bookings/availability` | None | `CourtAvailabilityResponse` | `target_date`, `court_id` | `owner`, `receptionist`, `member` | 06:00–22:00 IST slots (30-min steps) | `components/reception/CourtScheduleMatrix.jsx` |
| **Bookings: Create (Staff/Walk-In)** | `POST /api/v1/bookings` | `BookingCreate` | `BookingResponse` | None | `owner`, `receptionist`, `member` | Strict temporal overlap rejection, duration 60m | `components/reception/CreateBookingModal.jsx` |
| **Bookings: List** | `GET /api/v1/bookings` | None | `List[BookingResponse]` | `target_date`, `court_id`, `status` | `owner`, `receptionist` | `confirmed` vs `cancelled` | `pages/bookings/BookingsPage.jsx` |
| **Bookings: Cancel** | `POST /api/v1/bookings/{id}/cancel` | None | `BookingResponse` | None | `owner`, `receptionist`, `member` | Releases slot, updates status to `cancelled` | `pages/bookings/BookingsPage.jsx` (Confirm) |
| **Social Play: Sessions** | `GET /api/v1/bookings/social-sessions` | None | `List[SocialPlaySessionResponse]` | None | `owner`, `receptionist`, `member` | Scheduled communal sessions | `pages/social-play/SocialPlayPage.jsx` |
| **Social Play: Create Session** | `POST /api/v1/bookings/social-sessions` | `SocialPlaySessionCreate` | `SocialPlaySessionResponse` | None | `owner`, `receptionist` | Court reservation, max capacity, time range | `pages/social-play/SocialPlayPage.jsx` (Modal) |
| **Social Play: Cancel Session** | `POST /api/v1/bookings/social-sessions/{id}/cancel` | None | `SocialPlaySessionResponse` | None | `owner`, `receptionist` | Voids session and releases participants | `pages/social-play/SocialPlayPage.jsx` (Confirm) |
| **Social Play: Join** | `POST /api/v1/bookings/social-sessions/{id}/join` | None | `SocialPlayParticipantResponse` | None | `owner`, `receptionist`, `member` | Capacity check, duplicate entry rejection | `pages/social-play/SocialPlayPage.jsx` |
| **Social Play: Leave** | `POST /api/v1/bookings/social-sessions/{id}/leave` | None | `Dict[str, str]` | None | `owner`, `receptionist`, `member` | Frees session slot | `pages/social-play/SocialPlayPage.jsx` |
| **Shop: Categories** | `GET /api/v1/shop/categories` | None | `List[CategoryResponse]` | None | `owner`, `shop_staff`, `member` | Product taxonomy | `pages/shop/ShopProductsPage.jsx` |
| **Shop: Category Create** | `POST /api/v1/shop/categories` | `CategoryCreate` | `CategoryResponse` | None | `owner`, `shop_staff` | Unique category name | `pages/shop/ShopProductsPage.jsx` (Modal) |
| **Shop: Products** | `GET /api/v1/shop/products` | None | `List[ProductResponse]` | `category_id`, `is_active` | `owner`, `shop_staff`, `member` | Retail catalog with inventory snapshots | `pages/shop/ShopProductsPage.jsx` |
| **Shop: Product Create** | `POST /api/v1/shop/products` | `ProductCreate` | `ProductResponse` | None | `owner`, `shop_staff` | Unique SKU, price >= 0, tax_rate [0, 100] | `pages/shop/ShopProductsPage.jsx` (Modal) |
| **Shop: Product Update** | `PUT /api/v1/shop/products/{id}` | `ProductUpdate` | `ProductResponse` | None | `owner`, `shop_staff` | Price, threshold, active status | `pages/shop/ShopProductsPage.jsx` (Modal) |
| **Shop: Inventory Levels** | `GET /api/v1/shop/inventory` | None | `List[InventoryItemResponse]` | None | `owner`, `shop_staff` | Current stock vs reorder threshold | `pages/shop/ShopInventoryPage.jsx` |
| **Shop: Stock Adjustment** | `POST /api/v1/shop/inventory/adjust` | `StockAdjustmentRequest` | `InventoryMovementResponse` | None | `owner`, `shop_staff` | Audited quantity diff, non-empty reason | `pages/shop/ShopInventoryPage.jsx` (Modal) |
| **Shop: Stock Restock** | `POST /api/v1/shop/inventory/restock` | `StockRestockRequest` | `InventoryMovementResponse` | None | `owner`, `shop_staff` | Positive quantity received | `pages/shop/ShopInventoryPage.jsx` (Modal) |
| **Shop: Movements History** | `GET /api/v1/shop/inventory/movements` | None | `List[InventoryMovementResponse]` | `product_id` | `owner`, `shop_staff` | Stock movement audit trail | `pages/shop/ShopInventoryPage.jsx` |
| **Shop: POS Order Create** | `POST /api/v1/shop/orders` | `OrderCreate` | `OrderResponse` | None | `owner`, `shop_staff`, `member` | Atomic stock check, member discount snapshot | `pages/shop/ShopPosPage.jsx` |
| **Shop: Orders List** | `GET /api/v1/shop/orders` | None | `List[OrderResponse]` | `status`, `order_type` | `owner`, `shop_staff` | Orders ledger | `pages/shop/ShopOrdersPage.jsx` |
| **Shop: Order Cancel** | `POST /api/v1/shop/orders/{id}/cancel` | None | `OrderResponse` | None | `owner`, `shop_staff` | Restores inventory stock quantities | `pages/shop/ShopOrdersPage.jsx` (Confirm) |
| **Cafeteria: Menu Items** | `GET /api/v1/cafeteria/menu` | None | `List[ProductResponse]` | `is_active` | `owner`, `shop_staff`, `receptionist`, `member` | Kitchen & beverage menu items | `pages/cafeteria/CafeteriaMenuPage.jsx` |
| **Cafeteria: Order Create** | `POST /api/v1/cafeteria/orders` | `OrderCreate` | `OrderResponse` | None | `owner`, `shop_staff`, `receptionist`, `member` | Enqueues order with initial status `pending` | `pages/cafeteria/CafeteriaMenuPage.jsx` (Modal) |
| **Cafeteria: Kitchen Queue** | `GET /api/v1/cafeteria/orders` | None | `List[OrderResponse]` | `status` | `owner`, `shop_staff`, `receptionist` | Active kitchen tickets | `pages/cafeteria/CafeteriaKitchenPage.jsx` |
| **Cafeteria: Status Transition** | `PATCH /api/v1/cafeteria/orders/{id}/status` | `OrderStatusUpdate` | `OrderResponse` | None | `owner`, `shop_staff` | `pending` -> `preparing` -> `ready` -> `completed` | `pages/cafeteria/CafeteriaKitchenPage.jsx` (Action) |
| **Cafeteria: Order Cancel** | `POST /api/v1/cafeteria/orders/{id}/cancel` | None | `OrderResponse` | None | `owner`, `shop_staff` | Restores food ingredient inventory | `pages/cafeteria/CafeteriaKitchenPage.jsx` (Confirm) |
| **HR: Departments** | `GET /api/v1/departments` | None | `List[DepartmentResponse]` | None | `owner`, `hr_staff` | Organization departments | `pages/hr/DepartmentsPage.jsx` |
| **HR: Department Create** | `POST /api/v1/departments` | `DepartmentCreate` | `DepartmentResponse` | None | `owner`, `hr_staff` | Unique department name | `pages/hr/DepartmentsPage.jsx` (Modal) |
| **HR: Department Update** | `PUT /api/v1/departments/{id}` | `DepartmentUpdate` | `DepartmentResponse` | None | `owner`, `hr_staff` | Department rename | `pages/hr/DepartmentsPage.jsx` (Modal) |
| **HR: Designations** | `GET /api/v1/designations` | None | `List[DesignationResponse]` | `department_id` | `owner`, `hr_staff` | Job titles and departments | `pages/hr/DepartmentsPage.jsx` |
| **HR: Designation Create** | `POST /api/v1/designations` | `DesignationCreate` | `DesignationResponse` | None | `owner`, `hr_staff` | Unique title within department | `pages/hr/DepartmentsPage.jsx` (Modal) |
| **HR: Employee Directory** | `GET /api/v1/employees` | None | `List[EmployeeResponse]` | `department_id`, `employment_status` | `owner`, `hr_staff` | Staff directory | `pages/hr/EmployeesPage.jsx` |
| **HR: Employee Create** | `POST /api/v1/employees` | `EmployeeCreate` | `EmployeeResponse` | None | `owner`, `hr_staff` | Unique employee_code, valid email | `pages/hr/EmployeesPage.jsx` (Modal) |
| **HR: Employee Update** | `PUT /api/v1/employees/{id}` | `EmployeeUpdate` | `EmployeeResponse` | None | `owner`, `hr_staff` | Update profile, department, designation | `pages/hr/EmployeesPage.jsx` (Modal) |
| **HR: Employee Status** | `PATCH /api/v1/employees/{id}/status` | `EmployeeStatusUpdate` | `EmployeeResponse` | None | `owner`, `hr_staff` | `active`, `on_leave`, `resigned`, `terminated` | `pages/hr/EmployeesPage.jsx` (Modal) |
| **Attendance: List** | `GET /api/v1/attendance` | None | `List[AttendanceResponse]` | `attendance_date`, `employee_id` | `owner`, `hr_staff` | Attendance logs | `pages/hr/AttendancePage.jsx` |
| **Attendance: Check-In** | `POST /api/v1/attendance/check-in` | `AttendanceCheckInRequest` | `AttendanceResponse` | None | All Staff | Records clock-in timestamp | `pages/hr/AttendancePage.jsx` (Action) |
| **Attendance: Check-Out** | `POST /api/v1/attendance/check-out` | `AttendanceCheckOutRequest` | `AttendanceResponse` | None | All Staff | Computes total working hours | `pages/hr/AttendancePage.jsx` (Action) |
| **Attendance: Correction** | `PUT /api/v1/attendance/{id}/correct` | `AttendanceCorrectionRequest` | `AttendanceResponse` | None | `owner`, `hr_staff` | Mandatory audit correction_reason | `pages/hr/AttendancePage.jsx` (Modal) |
| **Leaves: Queue** | `GET /api/v1/leaves` | None | `List[LeaveResponse]` | `status`, `employee_id` | `owner`, `hr_staff` | Leave applications queue | `pages/hr/LeavesPage.jsx` |
| **Leaves: Apply** | `POST /api/v1/leaves` | `LeaveApplyRequest` | `LeaveResponse` | None | All Staff | Overlap conflict rejection, end_date >= start_date | `pages/hr/LeavesPage.jsx` (Modal) |
| **Leaves: Approve** | `POST /api/v1/leaves/{id}/approve` | `LeaveReviewRequest` | `LeaveResponse` | None | `owner`, `hr_staff` | Transitions `pending` -> `approved` | `pages/hr/LeavesPage.jsx` (Modal) |
| **Leaves: Reject** | `POST /api/v1/leaves/{id}/reject` | `LeaveReviewRequest` | `LeaveResponse` | None | `owner`, `hr_staff` | Transitions `pending` -> `rejected` | `pages/hr/LeavesPage.jsx` (Modal) |
| **Leaves: Cancel** | `POST /api/v1/leaves/{id}/cancel` | None | `LeaveResponse` | None | Employee / Staff | Cancels own pending leave | `pages/hr/LeavesPage.jsx` (Confirm) |
| **Payroll: Salary Structures** | `GET /api/v1/payroll/salary-structures` | None | `List[SalaryStructureResponse]` | `is_active` | `owner`, `hr_staff` | Structures and components | `pages/hr/SalaryStructuresPage.jsx` |
| **Payroll: Structure Create** | `POST /api/v1/payroll/salary-structures` | `SalaryStructureCreate` | `SalaryStructureResponse` | None | `owner`, `hr_staff` | Earnings and deductions definitions | `pages/hr/SalaryStructuresPage.jsx` (Modal) |
| **Payroll: Salary Assign** | `POST /api/v1/payroll/employees/{id}/salary` | `SalaryAssignmentCreate` | `SalaryAssignmentResponse` | None | `owner`, `hr_staff` | Assigns base salary & structure | `pages/hr/SalaryStructuresPage.jsx` (Modal) |
| **Payroll: Periods** | `GET /api/v1/payroll/periods` | None | `List[PayrollPeriodResponse]` | None | `owner`, `hr_staff` | Monthly payroll calendar intervals | `pages/hr/PayrollPage.jsx` |
| **Payroll: Period Create** | `POST /api/v1/payroll/periods` | `PayrollPeriodCreate` | `PayrollPeriodResponse` | None | `owner`, `hr_staff` | Non-overlapping month date range | `pages/hr/PayrollPage.jsx` (Modal) |
| **Payroll: Runs** | `GET /api/v1/payroll/runs` | None | `List[PayrollRunResponse]` | None | `owner`, `hr_staff` | `draft`, `under_review`, `processed`, `paid` | `pages/hr/PayrollPage.jsx` |
| **Payroll: Run Create** | `POST /api/v1/payroll/runs` | `PayrollRunCreate` | `PayrollRunResponse` | None | `owner`, `hr_staff` | Computes draft salaries from structures | `pages/hr/PayrollPage.jsx` (Action) |
| **Payroll: Run Review** | `POST /api/v1/payroll/runs/{id}/review` | None | `PayrollRunResponse` | None | `owner`, `hr_staff` | Transitions `draft` -> `under_review` | `pages/hr/PayrollPage.jsx` (Action) |
| **Payroll: Run Process** | `POST /api/v1/payroll/runs/{id}/process` | None | `PayrollRunResponse` | None | `owner`, `hr_staff` | **Irreversible:** issues employee payslips | `pages/hr/PayrollPage.jsx` (Confirm) |
| **Payroll: Entries** | `GET /api/v1/payroll/runs/{id}/entries` | None | `List[PayrollEntryResponse]` | None | `owner`, `hr_staff` | Staff payslip records in run | `pages/hr/PayrollPage.jsx` |
| **Payroll: Disburse Entry** | `POST /api/v1/payroll/entries/{id}/disburse` | `PayrollDisbursementCreate` | `PayrollDisbursementResponse` | None | `owner`, `hr_staff` | Enforces remaining balance, prevents overpayment | `pages/hr/PayrollPage.jsx` (Modal) |
| **Finance: Clients List** | `GET /api/v1/business-clients` | None | `List[BusinessClientResponse]` | None | `owner` | B2B accounts directory | `pages/finance/BusinessClientsPage.jsx` |
| **Finance: Client Create** | `POST /api/v1/business-clients` | `BusinessClientCreate` | `BusinessClientResponse` | None | `owner` | GSTIN, company name, credit terms | `pages/finance/BusinessClientsPage.jsx` (Modal) |
| **Finance: Client Update** | `PUT /api/v1/business-clients/{id}` | `BusinessClientUpdate` | `BusinessClientResponse` | None | `owner` | Update billing address, credit limits | `pages/finance/BusinessClientsPage.jsx` (Modal) |
| **Finance: Invoices List** | `GET /api/v1/invoices` | None | `List[InvoiceResponse]` | `status`, `client_id` | `owner`, `business_client` | Invoices repository | `pages/finance/InvoicesPage.jsx` |
| **Finance: Direct Invoice Create** | `POST /api/v1/invoices` | `InvoiceCreate` | `InvoiceResponse` | None | `owner` | Line items with quantity, unit_price, tax_rate | `pages/finance/InvoicesPage.jsx` (Modal) |
| **Finance: Invoice Cancel** | `POST /api/v1/invoices/{id}/cancel` | None | `InvoiceResponse` | None | `owner` | Marks unpaid invoice cancelled | `pages/finance/InvoicesPage.jsx` (Confirm) |
| **Finance: Payments List** | `GET /api/v1/payments` | None | `List[PaymentResponse]` | `customer_type` | `owner`, `receptionist` | Payment records ledger | `pages/finance/PaymentsPage.jsx` |
| **Finance: Record Payment** | `POST /api/v1/payments` | `PaymentCreate` | `PaymentResponse` | None | `owner`, `receptionist` | Generates receipt, records unallocated credit | `pages/finance/PaymentsPage.jsx` (Modal) |
| **Finance: Payment Allocations** | `POST /api/v1/payments/{id}/allocations` | `PaymentAllocationBatchCreate` | `List[PaymentAllocationResponse]` | None | `owner` | Multi-invoice split allocation | `pages/finance/PaymentsPage.jsx` (Modal) |
| **Finance: Reverse Allocation** | `POST /api/v1/allocations/{id}/reverse` | `AllocationReversalCreate` | `AllocationReversalResponse` | None | `owner` | Reverses allocation back to payment | `pages/finance/PaymentsPage.jsx` (Confirm) |
| **Finance: Payment Refund** | `POST /api/v1/payments/{id}/refund` | `PaymentRefundCreate` | `PaymentRefundResponse` | None | `owner` | Refunds unallocated balance | `pages/finance/PaymentsPage.jsx` (Modal) |
| **Finance: Receipts List** | `GET /api/v1/receipts` | None | `List[ReceiptResponse]` | None | `owner`, `receptionist` | Immutable payment receipts | `pages/finance/ReceiptsPage.jsx` |
