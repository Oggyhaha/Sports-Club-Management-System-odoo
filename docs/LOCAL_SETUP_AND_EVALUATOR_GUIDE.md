# CHAMPIONS CLUB — LOCAL SETUP & EVALUATOR WALKTHROUGH GUIDE
## Complete Testing & Role Verification Guide for Local Windows Development

### 1. Prerequisites & Environment
- **Operating System**: Windows 10 / 11
- **Database Engine**: PostgreSQL 18 on `localhost:5432`
  - Development DB: `champions_club`
  - Test DB: `champions_club_test`
- **Backend**: Python 3.11 with virtual environment (`backend/.venv`)
- **Frontend**: Node.js v20+ with pnpm / npm (`frontend/node_modules`)
- **Strict Constraint**: Local execution only. Strictly **zero cloud deployment**.

---

### 2. Quick-Start Commands

#### Start the FastAPI Backend
```powershell
cd "C:\Sports Club Management System\backend"
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```
API Documentation will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

#### Start the React Frontend
```powershell
cd "C:\Sports Club Management System\frontend"
npm run dev
```
Application UI will be available at: [http://localhost:5173](http://localhost:5173)

#### (Optional) Re-Seed Demo Data
```powershell
cd "C:\Sports Club Management System\backend"
.\.venv\Scripts\python.exe -m app.core.seed_data
```

---

### 3. Demo Credentials Across All 8 Roles

> [!IMPORTANT]
> **All demo accounts use the exact same secure master password:**
> **`Champions2026!`**

| Role | Email | Password | Primary Portal Landing | Key Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Owner / Admin** | `owner@championsclub.com` | `Champions2026!` | `/owner/dashboard` | Executive KPIs, Financial Analytics, GST Reports, CSV Exports, All Modules |
| **Receptionist** | `receptionist@championsclub.com` | `Champions2026!` | `/reception` | Shift Schedule, Walk-in Booking, Member Check-in, Courts Matrix |
| **Active Club Member** | `member@championsclub.com` | `Champions2026!` | `/member` | 50% Gold Tier Discount, Court Reservations, Friday Social, Online Pro-Shop, Billing |
| **Prospective Member** | `prospective@championsclub.com` | `Champions2026!` | `/member` | Member signup without plan, Mock Payment Gateway enrollment, Plan purchase |
| **Active Member (Kartik)** | `kartik@gmail.com` | `Champions2026!` | `/member` | Active Member account with Court Booking & Friday Social access |
| **Shop Staff** | `shop@championsclub.com` | `Champions2026!` | `/shop/pos` | Retail POS Counter, Barcode/SKU Sale, Inventory Stock Reorders |
| **Cafeteria Staff** | `cafeteria@championsclub.com` | `Champions2026!` | `/cafeteria/kitchen` | Live Kitchen Queue, Food & Beverage Prep Status (`preparing` -> `ready` -> `served`) |
| **HR Staff** | `hr@championsclub.com` | `Champions2026!` | `/hr/employees` | Staff Directory, Department/Designation setup, Attendance, Leaves, Payroll |
| **Account Staff** | `finance@championsclub.com` | `Champions2026!` | `/finance/invoices` | Accounts Receivable, Invoices, Payment Allocation, Official Receipts, Corporate Accounts |
| **Corporate Client** | `corporate@techcorp.com` | `Champions2026!` | `/corporate` | B2B Portal (TechCorp Solutions), Corporate Invoices, GSTIN, Account Balance |

---

### 4. Step-by-Step Evaluator Walkthrough

#### Scenario A: Self-Service Membership Purchase via Mock Payment Gateway
1. Navigate to [http://localhost:5173/login](http://localhost:5173/login).
2. Log in as **Prospective Member**:
   - Email: `prospective@championsclub.com`
   - Password: `Champions2026!`
3. You will land on the **Member Self-Service Portal** (`/member`).
4. Notice the prospective member banner:
   - *"Member Profile Not Linked"* with prompt: *"Choose Plan & Activate"*.
5. Click **"Choose Plan & Activate"** (or click **Membership Plans** in the sidebar).
6. On the **Membership Plans** page (`/members/plans`), notice:
   - Plan tier cards (`Gold`, `Silver`, `Junior`) display `"Available"` in the catalog.
   - Click **"Select Plan & Pay (Mock Gateway)"** on the **Gold Tier** (₹100.00 / month, 50% court discount).
7. The **Secure Membership Checkout (Mock Payment Gateway)** modal opens:
   - Displays plan breakdown (Base price ₹100.00 + 18% GST = ₹118.00).
   - Shows payment tabs: **Credit / Debit Card**, **UPI / QR**, **Net Banking**.
   - Notice pre-filled mock card (`4242 •••• •••• 4242`).
8. Click **"Authorize & Activate (₹118.00)"**.
9. The simulated payment authorizes, and a success toast appears:
   - *"Payment authorized! Subscribed to Gold Tier successfully."*
10. The Gold plan card immediately reflects: **"✓ Your Active Plan"** with a green badge and **"Renew / Extend Membership"** button.
11. Navigate back to `/member`: the profile is now **Active Gold Member** with full 50% discounts unlocked!

---

#### Scenario B: Testing Court Reservations & Real-Time Availability
1. While logged in as an active member (or log in as `member@championsclub.com` / `kartik@gmail.com`):
2. Click **"Court Availability Matrix"** in the sidebar (or visit `/bookings/availability`).
3. Notice:
   - 6 active courts are displayed: Badminton Court 1 & 2, Tennis Court 1 & 2, Squash Court 1, Table Tennis Arena.
   - Real-time 60-minute time slots (06:00 to 22:00 IST) render with green ("Available") slots.
   - No 422 errors or "Failed to load reception shift schedule" errors occur!
4. Click on any green slot (e.g. Badminton Court 1 at 09:00):
   - The reservation modal opens.
   - It automatically identifies the user: *"Reserving as: [User] — Gold Member (50% Member Discount Applied)"*.
   - Calculates the member discounted fee dynamically.
5. Click **"Confirm Reservation"**:
   - Success toast appears: *"Court booking confirmed successfully!"*.
   - The slot turns into booked/occupied.
6. Switch to `/member` -> **"Court Reservations"** tab:
   - Your newly confirmed booking is listed.
   - You can click **"Cancel"** to release the slot in real time.

---

#### Scenario C: Testing the Clean Sign-Out Flow
1. Look at the top-right corner of the application navigation bar.
2. Click the **"Sign Out"** button.
3. The **Sign Out Confirmation** modal opens.
4. Click **"Sign Out"**:
   - The session token is revoked on the backend (increments `token_version`).
   - Local authentication state is wiped from `localStorage`.
   - The user is smoothly and immediately redirected to the `/login` page with an informational toast.

---

#### Scenario D: Testing Staff Portals & Role Boundaries
1. Log in as **Shop Staff** (`shop@championsclub.com`):
   - Lands on `/shop/pos` (Retail POS register).
   - Can add racquets, shuttlecock tubes, or grips to the cart and process orders.
   - Access to `/owner/dashboard` or `/hr/employees` is blocked and redirects to `/unauthorized`.
2. Log in as **Cafeteria Staff** (`cafeteria@championsclub.com`):
   - Lands on `/cafeteria/kitchen` (Live kitchen queue display).
   - Can advance order states (`preparing` -> `ready` -> `served`).
3. Log in as **HR Staff** (`hr@championsclub.com`):
   - Lands on `/hr/employees` (Staff directory).
   - Can view attendance, approve/reject leaves, and generate payroll runs.
4. Log in as **Account Staff** (`finance@championsclub.com`):
   - Lands on `/finance/invoices` (Invoices ledger).
   - Can review B2B corporate invoices, record payments, and issue receipts.
5. Log in as **Corporate Client** (`corporate@techcorp.com`):
   - Lands on `/corporate` (TechCorp Solutions B2B portal).
   - Can view corporate account balance, itemized invoices, and GSTIN breakdown.
6. Log in as **Owner** (`owner@championsclub.com`):
   - Lands on `/owner/dashboard` (Executive analytics).
   - Live revenue metrics, member retention, court occupancy, financial performance, GST tax summary, and CSV streamed export.
