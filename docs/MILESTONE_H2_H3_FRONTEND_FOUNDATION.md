# CHAMPIONS CLUB — MILESTONES H2 & H3
## React Frontend Foundation, Application Architecture & Complete Design System

---

## 1. PRE-IMPLEMENTATION REPOSITORY AUDIT

### 1.1 Backend Environment & Architecture Baseline
- **Backend Stack:** Python 3.11.9, FastAPI 0.115.x, SQLAlchemy 2.x, PostgreSQL 18.
- **Python Environment:** Located in `backend/.venv`, completely isolated from Node.js and frontend tooling.
- **Milestones A–G Backend Integrity:** Completely intact; 155 automated tests passing; database records preserved (`champions_club` has 94 members, 59 courts, 47 bookings, 3 users, 6 roles, 3 plans).
- **Backend Security & JWT Configuration:**
  - `SECRET_KEY`: `"temporary-hackathon-demo-secret-key-change-in-production"`
  - `JWT_ALGORITHM`: `"HS256"`
  - `ACCESS_TOKEN_EXPIRE_MINUTES`: **30 minutes** (1,800 seconds). Confirmed via `backend/app/core/config.py`.
  - Session Revocation: On `POST /api/v1/auth/logout`, `current_user.token_version += 1` is committed to PostgreSQL, immediately invalidating any distributed access tokens with mismatched `token_version`.
- **CORS Configuration Analysis:**
  - Located in `backend/app/core/config.py` (`settings.CORS_ORIGINS`) and registered in `backend/app/main.py`.
  - Configured Origins: `["http://localhost:5173", "http://127.0.0.1:5173"]`.
  - Allowed Methods: `["*"]`, Allowed Headers: `["*"]`, `allow_credentials=True`.
  - Audit Result: Zero modifications were required on backend CORS settings. The configuration explicitly permits standard Vite local development server origins with credentials, prohibiting wildcards (`*`) with credentials for maximum security.

---

## 2. FRONTEND TECHNOLOGY STACK & DEPENDENCIES

The frontend uses standard JavaScript ES6+ with modern tooling without unnecessary framework bloat:

| Package | Version | Purpose |
|---|---|---|
| `react` | `^19.0.0` (19.3.1) | Declarative UI component library |
| `react-dom` | `^19.0.0` (19.3.1) | DOM rendering tree |
| `vite` | `^6.2.0` (6.4.6) | High-performance build tool and dev server |
| `@vitejs/plugin-react` | `^4.3.4` | Fast Refresh and JSX transformation |
| `react-router-dom` | `^7.2.0` (7.18.6) | Declarative client-side routing, route guards, layouts |
| `tailwindcss` | `^4.0.9` (4.3.5) | Utility-first styling with modern v4 engine |
| `@tailwindcss/vite` | `^4.0.9` (4.3.5) | Official first-party Vite integration for Tailwind v4 |
| `axios` | `^1.7.9` (1.21.1) | HTTP client with interceptors for Bearer auth |
| `lucide-react` | `^0.475.0` | Accessible, tree-shakeable SVG icon set |

---

## 3. DIRECTORY ARCHITECTURE

```text
frontend/
├── public/                     # Static web assets
├── src/
│   ├── assets/                 # SVGs and brand illustrations
│   ├── components/
│   │   ├── common/             # Reusable core design components
│   │   │   ├── Button.jsx      # Primary, secondary, outline, ghost, danger, sizes, loading
│   │   │   ├── Card.jsx        # Standard container with title, subtitle, footer slots
│   │   │   ├── StatusBadge.jsx # Universal status pill (active, pending, paid, etc.)
│   │   │   ├── Modal.jsx       # Accessible modal dialog with backdrop & ESC listener
│   │   │   ├── ConfirmationDialog.jsx # Confirmation dialog for destructive actions
│   │   │   └── DataTable.jsx   # Data table with client-side pagination & sorting
│   │   ├── forms/              # Accessible form controls
│   │   │   ├── Input.jsx       # Text/Number/Date input with icons, error & helper text
│   │   │   ├── PasswordInput.jsx # Input with Eye/EyeOff visibility toggle
│   │   │   ├── Select.jsx      # Styled dropdown select
│   │   │   ├── Textarea.jsx    # Multiline text area
│   │   │   ├── Checkbox.jsx    # Accessible checkbox control
│   │   │   └── Radio.jsx       # Accessible radio button and RadioGroup
│   │   ├── layout/             # Layout structure components
│   │   │   ├── Sidebar.jsx     # Dark navy fixed/collapsible sidebar with role filtering
│   │   │   ├── TopNavigation.jsx # Top bar with hamburger, user profile & logout
│   │   │   ├── Breadcrumb.jsx  # Contextual breadcrumb trail
│   │   │   ├── PageHeader.jsx  # Page title, subtitle, badge & action buttons
│   │   │   └── SectionHeader.jsx # Sub-section header with dividers
│   │   ├── feedback/           # User feedback & status indicators
│   │   │   ├── LoadingIndicator.jsx # Spinner, skeleton, or fullscreen overlay
│   │   │   ├── EmptyState.jsx  # Centered icon, title, description & CTA
│   │   │   ├── ErrorState.jsx  # Error message card with retry action
│   │   │   └── ErrorBoundary.jsx # React class boundary catching render errors
│   │   └── data-display/       # Tabular & list components
│   │       ├── DataTable.jsx   # Re-exported table
│   │       ├── TableToolbar.jsx# Table header with search field and actions
│   │       └── SearchField.jsx # Search input with magnifying glass & clear button
│   ├── config/
│   │   ├── constants.js        # API_BASE_URL, storage keys, roles enum, club metadata
│   │   └── navigation.js       # Centralized role-to-menu mapping configuration
│   ├── contexts/
│   │   ├── AuthContext.jsx     # Full authentication state, login, logout, role checks
│   │   └── ToastContext.jsx    # Global notification provider (success/error/info/warn)
│   ├── hooks/
│   │   ├── useAuth.js          # Re-export hook for authentication context
│   │   └── useToast.js         # Re-export hook for toast dispatch
│   ├── layouts/
│   │   ├── DashboardLayout.jsx # Main SaaS shell wiring Sidebar, TopNav, and Breadcrumbs
│   │   └── AuthLayout.jsx      # Clean centered auth card for login/register/invite
│   ├── lib/
│   │   └── axios.js            # Centralized Axios instance with auth & error interceptors
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx   # Real login form calling POST /auth/login
│   │   │   ├── RegisterPage.jsx# Real registration form calling POST /auth/register
│   │   │   └── AcceptInvitePage.jsx # Staff invitation activation (/staff/accept)
│   │   ├── owner/              # Owner Executive Dashboard placeholder
│   │   ├── reception/          # Reception Front Desk placeholder
│   │   ├── shop/               # Pro Shop POS & Inventory placeholder
│   │   ├── cafeteria/          # Cafeteria Kitchen Queue placeholder
│   │   ├── hr/                 # Human Resources & Payroll placeholder
│   │   ├── member/             # Member Self-Service Portal placeholder
│   │   ├── corporate/          # Corporate B2B Client Portal placeholder
│   │   ├── Unauthorized.jsx    # 403 Forbidden page with role details & return button
│   │   └── NotFound.jsx        # 404 Page Not Found
│   ├── routes/
│   │   ├── ProtectedRoute.jsx  # Unauthenticated redirect to /login
│   │   ├── RoleRoute.jsx       # Unauthorized role redirect to /unauthorized
│   │   └── index.jsx           # Centralized Route tree
│   ├── services/
│   │   ├── api.js              # Unified Axios client re-export
│   │   └── authService.js      # Explicit auth endpoint methods (login, register, me, logout)
│   ├── styles/
│   │   ├── tokens.js           # Centralized JS design tokens (palette, spacing, shadows)
│   │   └── index.css           # Tailwind v4 import, font setup, custom scrollbars
│   ├── utils/
│   │   ├── storage.js          # Safe localStorage wrapper for tokens and profile
│   │   └── formatters.js       # Currency (₹ INR), date, datetime, and role formatters
│   ├── App.jsx                 # App root with ErrorBoundary, Providers, and Routes
│   └── main.jsx                # DOM mounting entry point
├── .env                        # Local environment configuration
├── .env.example                # Example environment template
├── index.html                  # HTML entry point with Plus Jakarta Sans & JetBrains Mono
├── package.json                # Dependencies and scripts
├── pnpm-lock.yaml              # Locked package dependencies
└── vite.config.js              # Vite configuration with React & Tailwind plugins
```

---

## 4. DESIGN SYSTEM & TOKENS

The design system establishes a high-contrast, distraction-free SaaS atmosphere:

- **Sidebar & Chrome:** Dark navy (`#0f172a` / `#020617`) with subtle slate dividers (`#1e293b`), creating a clear visual anchor on the left.
- **Workspace:** Clean, neutral background (`#f8fafc`) with pure white card surfaces (`#ffffff`), subtle 1px border strokes (`#e2e8f0`), and soft elevation shadows.
- **Primary Accent:** Restrained sky blue / cyan (`#0284c7` / `#0ea5e9`), used exclusively for active navigation states, primary buttons, and focus outlines.
- **Typography:** Modern, readable geometric sans (`Plus Jakarta Sans`) for body and headings; tabular monospaced figures (`JetBrains Mono`) for financial figures, UUIDs, and codes.
- **Semantic Domain Status Badges:**
  - *Active / Confirmed / Paid / Approved / Present:* Emerald pill (`bg-emerald-50 text-emerald-700 border-emerald-200`).
  - *Pending / Preparing / Under Review / Half Day:* Amber pill (`bg-amber-50 text-amber-700 border-amber-200`).
  - *Ready / In Stock:* Teal pill (`bg-teal-50 text-teal-700 border-teal-200`).
  - *Issued / Draft / Scheduled:* Blue / Slate pill (`bg-blue-50 text-blue-700 border-blue-200`).
  - *Cancelled / Void / Rejected / Terminated / Absent:* Rose pill (`bg-rose-50 text-rose-700 border-rose-200`).

---

## 5. AUTHENTICATION & JWT SECURITY DECISION

### Selected Strategy: Hybrid In-Memory + Validated Storage Strategy
1. **Primary State in React State (In-Memory):** The active token and parsed user profile reside in React Context memory (`AuthContext`).
2. **Session Persistence via Browser Storage:** To provide a seamless SaaS user experience that survives page reloads without forcing re-login on every F5 refresh, the access token is persisted under `champions_access_token` in `localStorage`.
3. **Automatic Revalidation on Reload:** Upon initial page load, `AuthContext` reads the token and immediately fires a background request to `GET /api/v1/auth/me`. If the token is invalid, expired, or has had its `token_version` revoked server-side, local storage is immediately purged and the user is redirected to `/login`.
4. **XSS Exposure & Security Mitigations:**
   - *Risk:* Tokens in browser storage are accessible to client-side scripts if an XSS vulnerability exists.
   - *Mitigation 1 (Short Expiration):* JWT tokens expire in 30 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES: 30`).
   - *Mitigation 2 (Server-Side Revocation):* Calling `POST /api/v1/auth/logout` atomically increments the user's `token_version` in PostgreSQL. Any intercepted token is permanently rejected by the backend even if its cryptographic 30-minute expiration has not elapsed.
   - *Mitigation 3 (Zero Token Leakage):* Tokens are never written to `console.log`, query strings, or error traces.
   - *Mitigation 4 (Strict Sanitization):* Zero use of `dangerouslySetInnerHTML`; all inputs and tables render sanitized text.

---

## 6. ROLE-BASED APPLICATION ARCHITECTURE

The backend defines 6 canonical roles:
- `owner`: Full executive control over finances, reports, staff invitations, and settings.
- `receptionist`: Front desk reservations, walk-in check-in, member registrations, social play.
- `shop_staff`: Pro shop counter sales, shared inventory management, cafeteria orders.
- `hr_staff`: Employee records, daily attendance audits, leave approvals, salary & payroll runs.
- `member`: Personal court reservations, membership renewals, invoice payment history.
- `business_client`: Corporate invoices, GSTIN tax statements, split allocations.

### Centralized Navigation Matrix (`src/config/navigation.js`)
All navigation links specify allowed role sets. The `Sidebar` component dynamically filters navigation sections, showing only links the user is authorized to visit. 

### Route Protection Architecture
- `ProtectedRoute`: Wraps all dashboard routes. If unauthenticated, saves `location` in state and redirects to `/login`.
- `RoleRoute`: Wraps role-specific sections. If the user's roles do not overlap with `allowedRoles`, redirects to `/unauthorized`.
- `RootRedirect`: Dynamically routes authenticated users to their primary portal based on role priority (Owner &rarr; Receptionist &rarr; Shop Staff &rarr; HR Staff &rarr; Corporate &rarr; Member).

---

## 7. REAL WORKING PAGES & PLACEHOLDERS

### 1. Real Working Pages
- **`/login` (`LoginPage.jsx`):** Connected to `POST /api/v1/auth/login`. Supports email validation, password masking, error alerts for 401/422 responses, and automatic role-based redirect upon login.
- **`/register` (`RegisterPage.jsx`):** Connected to `POST /api/v1/auth/register`. Public member signup enforcing password byte length, confirmation matching, and success feedback.
- **`/accept-invitation` & `/accept-invite` (`AcceptInvitePage.jsx`):** Connected to `POST /api/v1/auth/staff/accept`. Automatically reads `?token=...` query string, validates token and password input, and activates staff accounts.
- **`/unauthorized` (`Unauthorized.jsx`):** Accessible 403 Forbidden screen displaying the authenticated user's name, email, and assigned role, with direct navigation to their permissible portal.
- **`*` (`NotFound.jsx`):** Accessible 404 Page Not Found screen.

### 2. Operational Portal Placeholders
- `OwnerDashboardPage.jsx`: Demonstrates the application shell with verified backend subsystem inventory (126 audited routes, 155 tests passing, database live state).
- `ReceptionDashboardPage.jsx`: Front desk operations workspace shell.
- `ShopDashboardPage.jsx`: Pro shop POS & shared inventory control shell.
- `CafeteriaDashboardPage.jsx`: Kitchen order preparation queue shell.
- `HRDashboardPage.jsx`: Employee directory, attendance, leave, and payroll shell.
- `MemberDashboardPage.jsx`: Self-service court bookings and membership shell.
- `CorporateDashboardPage.jsx`: Commercial B2B client portal shell.

*Note:* All portal pages clearly indicate that full business workflows will be connected in future milestone phases (H4+). Zero fake metrics or simulated success data were introduced.

---

## 8. BUILD & VERIFICATION SUMMARY

### 1. Production Build
```powershell
Set-Location frontend; pnpm run build
```
- **Vite Build Result:** Succeeded with **0 errors**.
  - `dist/index.html`: 0.86 kB (gzip: 0.49 kB)
  - `dist/assets/index-D5futMxk.css`: 38.26 kB (gzip: 7.41 kB)
  - `dist/assets/index-DkHB4TE3.js`: 415.66 kB (gzip: 126.44 kB)
  - Modules transformed: 1,700
  - Compilation time: 4.65s

### 2. Live Backend Contract Integration Check
Executed `scratch/test_api_integration.py` against live FastAPI application:
- CORS origins verified: `http://localhost:5173` & `http://127.0.0.1:5173` present.
- JWT expiry verified: 30 minutes confirmed.
- Login 401 structure verified: `{"detail": "Invalid email or password."}`.
- Login 422 validation structure verified.
- Registration validation verified: Rejects invalid email formats and passwords < 8 characters.
- Staff invitation accept validation verified: Rejects invalid tokens with HTTP 400.

### 3. Backend Test Suite Verification
Executed full Pytest suite:
- **155 passed in 24.16s** (100% passing across all backend modules).
- Dev database `champions_club` and test database `champions_club_test` remain completely intact.

---

## 9. HOW TO RUN THE APPLICATION

### 1. Start FastAPI Backend
```powershell
cd "C:\Sports Club Management System\backend"
.venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Start Vite Frontend Development Server
```powershell
cd "C:\Sports Club Management System\frontend"
pnpm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
