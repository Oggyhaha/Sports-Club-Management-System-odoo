# HR Security & Permissions Matrix
## Champions Club Sports Club Management System

**Scope:** Role-based access control, tenant isolation, and sensitive workforce data protection for Milestone F.

---

## 1. Granular RBAC Permission Matrix

| Role | Employee Profiles | Attendance | Leaves | Salary Structures | Payroll Runs | Disbursements | Self-Service (`/me`) |
|---|---|---|---|---|---|---|---|
| **Owner** | Full (CRUD) | Full + Corrections | Review / Approve | Full (CRUD) | Full Lifecycle | Full (Disburse) | Yes |
| **HR Staff** | Full (CRUD) | Full + Corrections | Review / Approve | Full (CRUD) | Full Lifecycle | Full (Disburse) | Yes |
| **Employee (Linked User)** | View Self (`/me`) | Check-In / Check-Out, View Self | Apply, Cancel Self | Forbidden (403) | Forbidden (403) | Forbidden (403) | Profile, Leaves, Payslips |
| **Receptionist** | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) |
| **Shop Staff** | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) |
| **Member** | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) |
| **Business Client** | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) |

---

## 2. Insecure Direct Object Reference (IDOR) Protections

1. **Cross-Employee Payslip Isolation**:
   - `GET /api/v1/payroll/me/payslips/{payslip_id}` verifies that the requesting user's linked employee ID strictly matches `payslip.employee_id`. Attempting to view another employee's payslip triggers `HTTP 403 Forbidden`.
2. **Leave Application Isolation**:
   - `GET /api/v1/leaves/{leave_id}` allows only the applying employee, HR staff, or the Owner to view leave details. Other users receive `HTTP 403 Forbidden`.
3. **Leave Cancellation Isolation**:
   - `POST /api/v1/leaves/{leave_id}/cancel` enforces that only the employee who applied for the leave can cancel it.
4. **Self-Approval Guard**:
   - An employee with the `hr_staff` role cannot approve their own leave request (`HTTP 400 Bad Request`).
