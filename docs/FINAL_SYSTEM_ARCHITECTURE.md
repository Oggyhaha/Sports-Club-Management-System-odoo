# CHAMPIONS CLUB — FINAL SYSTEM ARCHITECTURE
## Production-Grade Architecture Reference for Multi-Tenant Sports SaaS

```mermaid
flowchart TD
    subgraph Frontend["Frontend Client (React 19 + Vite 6 + Tailwind CSS v4)"]
        UI_AUTH["Auth & Sessions\n(JWT in LocalStorage + AuthContext)"]
        UI_NAV["Role-Based Nav & Portal Router\n(Owner, Reception, Shop, Cafe, HR, Finance, Member, Corporate)"]
        UI_COMP["Shared Design System\n(Cards, Badges, Modals, Forms, Toast)"]
        UI_PAY["Mock Payment Gateway Simulator\n(Card, UPI, NetBanking)"]
    end

    subgraph API_GW["FastAPI Modular Backend (Python 3.11)"]
        MW_CORS["CORS & Request Logger"]
        DEP_AUTH["Authentication & JWT Verifier\n(token_version revocation)"]
        DEP_RBAC["Role-Based Access Control Guards\n(require_roles, Object-Level Checks)"]
        ROUTERS["Domain API Routers\n(Auth, Members, Bookings, Courts, Shop, HR, Finance, Reports)"]
    end

    subgraph Business_Layer["Domain Service Layer"]
        SRV_AUTH["Auth Service\n(bcrypt hashing, JWT issuing)"]
        SRV_MEM["Member & Subscription Engine\n(Tier snapshots, Mock online checkout)"]
        SRV_BOOK["Court Booking Engine\n(06:00-22:00 slots, 30-min intervals, conflict check)"]
        SRV_COMM["Commerce & Inventory\n(Pro-Shop POS, Cafeteria kitchen queue)"]
        SRV_HR["HR & Payroll\n(Departments, Designations, Attendance, Payslips)"]
        SRV_FIN["Finance & Corporate Ledger\n(Invoices, GST lines, Payments, Receipts)"]
        SRV_REP["Reporting & Analytics\n(Aggregations, CSV stream export)"]
    end

    subgraph Database["PostgreSQL 18 Database Engine"]
        DB_USERS["users, roles, user_roles"]
        DB_MEMBERS["members, membership_plans, member_subscriptions"]
        DB_COURTS["courts, bookings, social_play_sessions, participants"]
        DB_COMMERCE["product_categories, products, order_receipts, receipt_items"]
        DB_HR["departments, designations, employees, attendance, leaves, payroll"]
        DB_FINANCE["business_clients, invoices, invoice_items, payments, receipts"]
    end

    Frontend -->|HTTP / REST (Axios)| API_GW
    API_GW --> Business_Layer
    Business_Layer -->|SQLAlchemy 2.0 ORM| Database
```

---

### Architectural Highlights
1. **Zero Fake Metrics / Static JSON**: All analytics, shift schedules, court slots, stock quantities, and employee records query live relational PostgreSQL data.
2. **Server-Side Session Revocation**: Logging out increments `token_version` on the user entity in the database, instantly invalidating outstanding JWT tokens even before token expiration.
3. **Decoupled User vs Member Architecture**:
   - `User`: Handles credentials, authentication, role assignment, and JWT session.
   - `Member`: Represents the club membership profile, assigned plan, duration, and discounts.
   - A newly registered user begins as a **Prospective Member** (`user.member_profile is None`).
   - Through the self-service **Mock Payment Gateway Modal**, prospective members purchase a plan (`POST /api/v1/members/me/subscribe`), which creates their `Member` profile, records a snapshot-backed `MemberSubscription`, and activates their booking and discount privileges immediately.
4. **Availability & Booking Parameter Normalization**: Both `date` and `target_date` query parameter aliases are gracefully handled on backend and frontend, preventing any 422 Unprocessable Entity defects.
5. **Role-Based Portal Routing**:
   - `owner` -> `/owner/dashboard`
   - `receptionist` -> `/reception`
   - `shop_staff` -> `/shop/pos`
   - `cafeteria_staff` -> `/cafeteria/kitchen`
   - `hr_staff` -> `/hr/employees`
   - `account_staff` -> `/finance/invoices`
   - `business_client` -> `/corporate`
   - `member` -> `/member`
