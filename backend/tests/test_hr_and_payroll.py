from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ==========================================
# 1. Departments & Designations Tests
# ==========================================

def test_department_and_designation_lifecycle(owner_headers, hr_staff_headers, receptionist_headers):
    # 1. Create department as HR
    dept_name = f"Coaching Dept {uuid.uuid4().hex[:6]}"
    res = client.post(
        "/api/v1/departments",
        json={"name": dept_name, "description": "Tennis and Cricket coaches"},
        headers=hr_staff_headers,
    )
    assert res.status_code == 201
    dept_id = res.json()["id"]
    assert res.json()["name"] == dept_name

    # 2. Duplicate department name rejected (409)
    res_dup = client.post(
        "/api/v1/departments",
        json={"name": dept_name},
        headers=hr_staff_headers,
    )
    assert res_dup.status_code == 409

    # 3. Create designation linked to department
    desig_title = f"Head Coach {uuid.uuid4().hex[:4]}"
    res_desig = client.post(
        "/api/v1/designations",
        json={"department_id": dept_id, "title": desig_title, "description": "Senior Coach"},
        headers=hr_staff_headers,
    )
    assert res_desig.status_code == 201
    desig_id = res_desig.json()["id"]
    assert res_desig.json()["department_id"] == dept_id

    # 4. List departments (accessible by staff)
    res_list = client.get("/api/v1/departments", headers=receptionist_headers)
    assert res_list.status_code == 200
    assert any(d["id"] == dept_id for d in res_list.json())

    # 5. List designations filtered by department
    res_d_list = client.get(f"/api/v1/designations?department_id={dept_id}", headers=receptionist_headers)
    assert res_d_list.status_code == 200
    assert len(res_d_list.json()) >= 1


# ==========================================
# 2. Employee Profile & Uniqueness Tests
# ==========================================

def test_employee_creation_and_duplicate_rejection(hr_staff_headers):
    # Create department & designation
    dept = client.post(
        "/api/v1/departments",
        json={"name": f"Dept {uuid.uuid4().hex[:6]}"},
        headers=hr_staff_headers,
    ).json()
    desig = client.post(
        "/api/v1/designations",
        json={"department_id": dept["id"], "title": f"Title {uuid.uuid4().hex[:6]}"},
        headers=hr_staff_headers,
    ).json()

    emp_code = f"EMP-{uuid.uuid4().hex[:6].upper()}"
    work_email = f"emp_{uuid.uuid4().hex[:6]}@championsclub.com"

    # 1. Create employee
    res = client.post(
        "/api/v1/employees",
        json={
            "employee_code": emp_code,
            "first_name": "Rafael",
            "last_name": "Nadal",
            "work_email": work_email,
            "phone": "9876543210",
            "joining_date": str(date.today()),
            "department_id": dept["id"],
            "designation_id": desig["id"],
            "employment_status": "active",
            "employment_type": "full_time",
        },
        headers=hr_staff_headers,
    )
    assert res.status_code == 201
    emp_data = res.json()
    emp_id = emp_data["id"]
    assert emp_data["employee_code"] == emp_code
    assert emp_data["department_name"] == dept["name"]
    assert emp_data["designation_title"] == desig["title"]

    # 2. Duplicate employee_code rejected (409)
    res_dup_code = client.post(
        "/api/v1/employees",
        json={
            "employee_code": emp_code,
            "first_name": "Roger",
            "last_name": "Federer",
            "work_email": f"diff_{uuid.uuid4().hex[:6]}@championsclub.com",
            "joining_date": str(date.today()),
        },
        headers=hr_staff_headers,
    )
    assert res_dup_code.status_code == 409

    # 3. Duplicate work_email rejected (409)
    res_dup_email = client.post(
        "/api/v1/employees",
        json={
            "employee_code": f"EMP-{uuid.uuid4().hex[:6].upper()}",
            "first_name": "Roger",
            "last_name": "Federer",
            "work_email": work_email,
            "joining_date": str(date.today()),
        },
        headers=hr_staff_headers,
    )
    assert res_dup_email.status_code == 409

    # 4. Update employee details
    res_update = client.put(
        f"/api/v1/employees/{emp_id}",
        json={"first_name": "Rafa", "phone": "9998887776"},
        headers=hr_staff_headers,
    )
    assert res_update.status_code == 200
    assert res_update.json()["first_name"] == "Rafa"
    assert res_update.json()["phone"] == "9998887776"

    # 5. Update employee status
    res_status = client.patch(
        f"/api/v1/employees/{emp_id}/status",
        json={"employment_status": "on_leave"},
        headers=hr_staff_headers,
    )
    assert res_status.status_code == 200
    assert res_status.json()["employment_status"] == "on_leave"


def test_employee_self_service_profile(employee_headers, member_headers):
    # 1. Authenticated employee can access own profile
    res = client.get("/api/v1/employees/me", headers=employee_headers)
    assert res.status_code == 200
    assert "employee_code" in res.json()

    # 2. Member without linked employee record receives 404
    res_mem = client.get("/api/v1/employees/me", headers=member_headers)
    assert res_mem.status_code == 404


# ==========================================
# 3. Attendance Workflow Tests
# ==========================================

def test_attendance_check_in_and_check_out(employee_headers, hr_staff_headers):
    # 1. Employee check-in
    res_in = client.post(
        "/api/v1/attendance/check-in",
        json={"notes": "Morning shift start"},
        headers=employee_headers,
    )
    assert res_in.status_code == 201
    att_id = res_in.json()["id"]
    assert res_in.json()["status"] == "present"
    assert res_in.json()["check_out"] is None

    # 2. Duplicate check-in on same day rejected (400)
    res_dup_in = client.post(
        "/api/v1/attendance/check-in",
        json={},
        headers=employee_headers,
    )
    assert res_dup_in.status_code == 400

    # 3. Employee check-out
    res_out = client.post(
        "/api/v1/attendance/check-out",
        json={"notes": "Shift completed"},
        headers=employee_headers,
    )
    assert res_out.status_code == 200
    assert res_out.json()["check_out"] is not None

    # 4. Duplicate check-out rejected (400)
    res_dup_out = client.post(
        "/api/v1/attendance/check-out",
        json={},
        headers=employee_headers,
    )
    assert res_dup_out.status_code == 400

    # 5. Employee view self attendance
    res_my_att = client.get("/api/v1/attendance/me", headers=employee_headers)
    assert res_my_att.status_code == 200
    assert len(res_my_att.json()) >= 1

    # 6. HR attendance correction with reason
    res_corr = client.put(
        f"/api/v1/attendance/{att_id}/correct",
        json={
            "check_in": res_in.json()["check_in"],
            "check_out": res_out.json()["check_out"],
            "status": "half_day",
            "correction_reason": "Approved half day for medical appointment",
        },
        headers=hr_staff_headers,
    )
    assert res_corr.status_code == 200
    assert res_corr.json()["status"] == "half_day"
    assert res_corr.json()["correction_reason"] == "Approved half day for medical appointment"


# ==========================================
# 4. Leave Request Workflow & Overlap Tests
# ==========================================

def test_leave_workflow_and_overlap_rejection(employee_headers, hr_staff_headers):
    today = date.today()
    start_d = today + timedelta(days=5)
    end_d = today + timedelta(days=8)

    # 1. Invalid date range (end_date < start_date) rejected (400)
    res_inv = client.post(
        "/api/v1/leaves",
        json={
            "leave_type": "casual",
            "start_date": str(end_d),
            "end_date": str(start_d),
            "reason": "Invalid dates",
        },
        headers=employee_headers,
    )
    assert res_inv.status_code == 400

    # 2. Submit valid leave request
    res_leave = client.post(
        "/api/v1/leaves",
        json={
            "leave_type": "casual",
            "start_date": str(start_d),
            "end_date": str(end_d),
            "reason": "Family vacation",
        },
        headers=employee_headers,
    )
    assert res_leave.status_code == 201
    leave_id = res_leave.json()["id"]
    assert res_leave.json()["status"] == "pending"
    assert Decimal(str(res_leave.json()["days_count"])) == Decimal("4.0")

    # 3. Overlapping active leave request rejected (409)
    overlap_start = today + timedelta(days=7)
    overlap_end = today + timedelta(days=10)
    res_overlap = client.post(
        "/api/v1/leaves",
        json={
            "leave_type": "sick",
            "start_date": str(overlap_start),
            "end_date": str(overlap_end),
            "reason": "Overlap attempt",
        },
        headers=employee_headers,
    )
    assert res_overlap.status_code == 409

    # 4. Employee view self leaves
    res_my_leaves = client.get("/api/v1/leaves/me", headers=employee_headers)
    assert res_my_leaves.status_code == 200
    assert any(l["id"] == leave_id for l in res_my_leaves.json())

    # 5. Employee cannot approve own leave request (400)
    res_self_app = client.post(
        f"/api/v1/leaves/{leave_id}/approve",
        json={"review_remarks": "Self approve attempt"},
        headers=employee_headers,
    )
    assert res_self_app.status_code in (400, 403)

    # 6. HR approves leave
    res_app = client.post(
        f"/api/v1/leaves/{leave_id}/approve",
        json={"review_remarks": "Enjoy your vacation"},
        headers=hr_staff_headers,
    )
    assert res_app.status_code == 200
    assert res_app.json()["status"] == "approved"
    assert res_app.json()["review_remarks"] == "Enjoy your vacation"

    # 7. Approving already approved leave rejected (400)
    res_reapp = client.post(
        f"/api/v1/leaves/{leave_id}/approve",
        json={},
        headers=hr_staff_headers,
    )
    assert res_reapp.status_code == 400


# ==========================================
# 5. Salary Structure & History Tests
# ==========================================

def test_salary_structure_and_assignment_history(hr_staff_headers):
    # 1. Create configurable salary structure
    struct_name = f"Coach Structure {uuid.uuid4().hex[:6]}"
    res_struct = client.post(
        "/api/v1/payroll/salary-structures",
        json={
            "name": struct_name,
            "description": "Base pay + HRA - PF",
            "components": [
                {"component_name": "HRA", "component_type": "earning", "default_amount": "5000.00"},
                {"component_name": "Medical Allowance", "component_type": "earning", "default_amount": "2000.00"},
                {"component_name": "PF Deduction", "component_type": "deduction", "default_amount": "1800.00"},
            ],
        },
        headers=hr_staff_headers,
    )
    assert res_struct.status_code == 201
    struct_id = res_struct.json()["id"]

    # 2. Duplicate salary structure rejected (409)
    res_dup_struct = client.post(
        "/api/v1/payroll/salary-structures",
        json={"name": struct_name, "components": []},
        headers=hr_staff_headers,
    )
    assert res_dup_struct.status_code == 409

    # 3. Create employee
    emp_res = client.post(
        "/api/v1/employees",
        json={
            "employee_code": f"EMP-{uuid.uuid4().hex[:6].upper()}",
            "first_name": "Novak",
            "last_name": "Djokovic",
            "work_email": f"novak_{uuid.uuid4().hex[:6]}@championsclub.com",
            "joining_date": str(date.today()),
        },
        headers=hr_staff_headers,
    )
    emp_id = emp_res.json()["id"]

    # 4. Initial salary assignment
    res_assign1 = client.post(
        f"/api/v1/payroll/employees/{emp_id}/salary",
        json={
            "salary_structure_id": struct_id,
            "base_salary": "40000.00",
            "effective_from": str(date.today() - timedelta(days=60)),
            "notes": "Initial joining package",
        },
        headers=hr_staff_headers,
    )
    assert res_assign1.status_code == 201
    assert Decimal(str(res_assign1.json()["base_salary"])) == Decimal("40000.00")
    assert res_assign1.json()["is_active"] is True

    # 5. Salary revision (promotion)
    res_assign2 = client.post(
        f"/api/v1/payroll/employees/{emp_id}/salary",
        json={
            "salary_structure_id": struct_id,
            "base_salary": "50000.00",
            "effective_from": str(date.today() - timedelta(days=10)),
            "notes": "Annual increment",
        },
        headers=hr_staff_headers,
    )
    assert res_assign2.status_code == 201
    assert Decimal(str(res_assign2.json()["base_salary"])) == Decimal("50000.00")

    # 6. Verify revision history: assignment 1 is deactivated, assignment 2 is active
    res_hist = client.get(
        f"/api/v1/payroll/employees/{emp_id}/salary",
        headers=hr_staff_headers,
    )
    assert res_hist.status_code == 200
    history = res_hist.json()
    assert len(history) == 2
    assert history[0]["is_active"] is True
    assert history[1]["is_active"] is False


# ==========================================
# 6. Payroll Calculation, Runs & Payslips
# ==========================================

def test_payroll_run_lifecycle_and_payslips(hr_staff_headers, employee_headers):
    # Setup employee with salary
    emp_profile = client.get("/api/v1/employees/me", headers=employee_headers).json()
    emp_id = emp_profile["id"]

    struct = client.post(
        "/api/v1/payroll/salary-structures",
        json={
            "name": f"Standard Staff {uuid.uuid4().hex[:6]}",
            "components": [
                {"component_name": "Travel Allowance", "component_type": "earning", "default_amount": "3000.00"},
                {"component_name": "Tax Deduction", "component_type": "deduction", "default_amount": "1000.00"},
            ],
        },
        headers=hr_staff_headers,
    ).json()

    client.post(
        f"/api/v1/payroll/employees/{emp_id}/salary",
        json={
            "salary_structure_id": struct["id"],
            "base_salary": "25000.00",
            "effective_from": str(date.today() - timedelta(days=30)),
        },
        headers=hr_staff_headers,
    )

    # 1. Create payroll period
    period_name = f"Cycle {uuid.uuid4().hex[:6]}"
    start_d = date.today().replace(day=1)
    end_d = start_d + timedelta(days=27)
    period = client.post(
        "/api/v1/payroll/periods",
        json={"period_name": period_name, "start_date": str(start_d), "end_date": str(end_d)},
        headers=hr_staff_headers,
    ).json()

    # 2. Calculate draft payroll run
    res_run = client.post(
        "/api/v1/payroll/runs",
        json={"payroll_period_id": period["id"], "notes": "Monthly payroll run"},
        headers=hr_staff_headers,
    )
    assert res_run.status_code == 201
    run_data = res_run.json()
    run_id = run_data["id"]
    assert run_data["status"] == "draft"

    # Find the employee entry in run
    entry = next(e for e in run_data["entries"] if e["employee_id"] == emp_id)
    # Gross = 25000 (Base) + 3000 (Travel) = 28000.00
    # Deductions = 1000.00
    # Net = 27000.00
    assert Decimal(str(entry["gross_earnings"])) == Decimal("28000.00")
    assert Decimal(str(entry["total_deductions"])) == Decimal("1000.00")
    assert Decimal(str(entry["net_payable"])) == Decimal("27000.00")
    assert entry["payment_status"] == "unpaid"

    # 3. Duplicate payroll run for same period rejected (409)
    res_dup_run = client.post(
        "/api/v1/payroll/runs",
        json={"payroll_period_id": period["id"]},
        headers=hr_staff_headers,
    )
    assert res_dup_run.status_code == 409

    # 4. Processing draft run directly without review is rejected (400)
    res_bad_proc = client.post(f"/api/v1/payroll/runs/{run_id}/process", headers=hr_staff_headers)
    assert res_bad_proc.status_code == 400

    # 5. Review payroll run
    res_rev = client.post(f"/api/v1/payroll/runs/{run_id}/review", headers=hr_staff_headers)
    assert res_rev.status_code == 200
    assert res_rev.json()["status"] == "reviewed"

    # 6. Process/Finalize payroll run -> mints payslips
    res_proc = client.post(f"/api/v1/payroll/runs/{run_id}/process", headers=hr_staff_headers)
    assert res_proc.status_code == 200
    assert res_proc.json()["status"] == "processed"

    # 7. Employee self-service payslip retrieval
    res_payslips = client.get("/api/v1/payroll/me/payslips", headers=employee_headers)
    assert res_payslips.status_code == 200
    my_payslips = res_payslips.json()
    assert len(my_payslips) >= 1
    pslip = my_payslips[0]
    assert pslip["employee_id"] == emp_id
    assert Decimal(str(pslip["payroll_entry"]["net_payable"])) == Decimal("27000.00")


# ==========================================
# 7. Payroll Disbursement Tests
# ==========================================

def test_payroll_disbursement_and_balance_enforcement(hr_staff_headers, employee_headers):
    # Setup employee with salary and finalized payroll run
    emp_profile = client.get("/api/v1/employees/me", headers=employee_headers).json()
    emp_id = emp_profile["id"]

    struct = client.post(
        "/api/v1/payroll/salary-structures",
        json={
            "name": f"Disb Struct {uuid.uuid4().hex[:6]}",
            "components": [],
        },
        headers=hr_staff_headers,
    ).json()

    client.post(
        f"/api/v1/payroll/employees/{emp_id}/salary",
        json={
            "salary_structure_id": struct["id"],
            "base_salary": "30000.00",
            "effective_from": str(date.today() - timedelta(days=20)),
        },
        headers=hr_staff_headers,
    )

    period = client.post(
        "/api/v1/payroll/periods",
        json={
            "period_name": f"Cycle {uuid.uuid4().hex[:6]}",
            "start_date": str(date.today() - timedelta(days=25)),
            "end_date": str(date.today()),
        },
        headers=hr_staff_headers,
    ).json()

    run = client.post(
        "/api/v1/payroll/runs",
        json={"payroll_period_id": period["id"]},
        headers=hr_staff_headers,
    ).json()
    run_id = run["id"]
    client.post(f"/api/v1/payroll/runs/{run_id}/review", headers=hr_staff_headers)
    proc_run = client.post(f"/api/v1/payroll/runs/{run_id}/process", headers=hr_staff_headers).json()

    entry = next(e for e in proc_run["entries"] if e["employee_id"] == emp_id)
    entry_id = entry["id"]
    net_payable = Decimal(str(entry["net_payable"]))  # ₹30,000.00

    # 1. Overpayment rejected (> ₹30,000)
    res_over = client.post(
        f"/api/v1/payroll/entries/{entry_id}/disburse",
        json={
            "amount": "35000.00",
            "disbursement_method": "bank_transfer",
            "notes": "Overpayment attempt",
        },
        headers=hr_staff_headers,
    )
    assert res_over.status_code == 400

    # 2. Partial disbursement (₹10,000.00)
    idemp_key = f"IDEMP-{uuid.uuid4().hex}"
    res_part = client.post(
        f"/api/v1/payroll/entries/{entry_id}/disburse",
        json={
            "idempotency_key": idemp_key,
            "amount": "10000.00",
            "disbursement_method": "bank_transfer",
            "notes": "Part 1 salary",
        },
        headers=hr_staff_headers,
    )
    assert res_part.status_code == 201
    assert Decimal(str(res_part.json()["amount"])) == Decimal("10000.00")

    # 3. Idempotency replay returns existing disbursement
    res_replay = client.post(
        f"/api/v1/payroll/entries/{entry_id}/disburse",
        json={
            "idempotency_key": idemp_key,
            "amount": "10000.00",
            "disbursement_method": "bank_transfer",
        },
        headers=hr_staff_headers,
    )
    assert res_replay.status_code in (200, 201)
    assert res_replay.json()["id"] == res_part.json()["id"]

    # 4. Final remaining disbursement (₹20,000.00)
    res_final = client.post(
        f"/api/v1/payroll/entries/{entry_id}/disburse",
        json={
            "amount": "20000.00",
            "disbursement_method": "bank_transfer",
            "notes": "Part 2 balance",
        },
        headers=hr_staff_headers,
    )
    assert res_final.status_code == 201

    # 5. Check run details: entry payment status is now 'paid'
    updated_run = client.get(f"/api/v1/payroll/runs/{run_id}", headers=hr_staff_headers).json()
    updated_entry = next(e for e in updated_run["entries"] if e["id"] == entry_id)
    assert updated_entry["payment_status"] == "paid"
    assert Decimal(str(updated_entry["amount_disbursed"])) == net_payable


# ==========================================
# 8. Security & RBAC Isolation Tests
# ==========================================

def test_unauthorized_roles_blocked_from_hr(receptionist_headers, shop_staff_headers, member_headers, business_client_headers):
    # Receptionist blocked from employee creation & salary structures
    assert client.post("/api/v1/employees", json={}, headers=receptionist_headers).status_code == 403
    assert client.get("/api/v1/payroll/salary-structures", headers=receptionist_headers).status_code == 403
    assert client.get("/api/v1/payroll/runs", headers=receptionist_headers).status_code == 403

    # Shop staff blocked
    assert client.get("/api/v1/employees", headers=shop_staff_headers).status_code == 403
    assert client.get("/api/v1/payroll/runs", headers=shop_staff_headers).status_code == 403

    # Members blocked
    assert client.get("/api/v1/employees", headers=member_headers).status_code == 403
    assert client.get("/api/v1/leaves", headers=member_headers).status_code == 403

    # Business clients blocked
    assert client.get("/api/v1/employees", headers=business_client_headers).status_code == 403
    assert client.get("/api/v1/payroll/runs", headers=business_client_headers).status_code == 403
