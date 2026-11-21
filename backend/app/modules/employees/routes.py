from __future__ import annotations

import uuid
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import RoleEnum, User
from app.modules.employees import service
from app.modules.employees.schemas import (
    AttendanceCheckInRequest,
    AttendanceCheckOutRequest,
    AttendanceCorrectionRequest,
    AttendanceResponse,
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
    DesignationCreate,
    DesignationResponse,
    DesignationUpdate,
    EmployeeCreate,
    EmployeeResponse,
    EmployeeStatusUpdate,
    EmployeeUpdate,
    LeaveCreate,
    LeaveResponse,
    LeaveReviewRequest,
    PayrollDisbursementCreate,
    PayrollDisbursementResponse,
    PayrollPeriodCreate,
    PayrollPeriodResponse,
    PayrollRunCreate,
    PayrollRunResponse,
    PayslipResponse,
    SalaryAssignmentCreate,
    SalaryAssignmentResponse,
    SalaryStructureCreate,
    SalaryStructureResponse,
)

departments_router = APIRouter(prefix="/departments", tags=["Departments"])
designations_router = APIRouter(prefix="/designations", tags=["Designations"])
employees_router = APIRouter(prefix="/employees", tags=["Employees"])
attendance_router = APIRouter(prefix="/attendance", tags=["Attendance"])
leaves_router = APIRouter(prefix="/leaves", tags=["Leaves"])
payroll_router = APIRouter(prefix="/payroll", tags=["Payroll"])


def _to_emp_response(emp) -> EmployeeResponse:
    return EmployeeResponse(
        id=emp.id,
        user_id=emp.user_id,
        department_id=emp.department_id,
        designation_id=emp.designation_id,
        department_name=emp.department.name if emp.department else None,
        designation_title=emp.designation.title if emp.designation else None,
        employee_code=emp.employee_code,
        first_name=emp.first_name,
        last_name=emp.last_name,
        work_email=emp.work_email,
        phone=emp.phone,
        joining_date=emp.joining_date,
        employment_status=emp.employment_status,
        employment_type=emp.employment_type,
        address=emp.address,
        emergency_contact=emp.emergency_contact,
        created_at=emp.created_at,
        updated_at=emp.updated_at,
    )


# ==========================================
# 1. Departments Router
# ==========================================

@departments_router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def create_department(dept_in: DepartmentCreate, db: Session = Depends(get_db)):
    return service.create_department(db, dept_in)


@departments_router.get("", response_model=List[DepartmentResponse])
def list_departments(
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.list_departments(db, active_only=active_only)


@departments_router.get(
    "/{department_id}",
    response_model=DepartmentResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def get_department(department_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_department_by_id(db, department_id)


@departments_router.put(
    "/{department_id}",
    response_model=DepartmentResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def update_department(
    department_id: uuid.UUID,
    dept_in: DepartmentUpdate,
    db: Session = Depends(get_db),
):
    return service.update_department(db, department_id, dept_in)


# ==========================================
# 2. Designations Router
# ==========================================

@designations_router.post(
    "",
    response_model=DesignationResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def create_designation(desig_in: DesignationCreate, db: Session = Depends(get_db)):
    return service.create_designation(db, desig_in)


@designations_router.get("", response_model=List[DesignationResponse])
def list_designations(
    department_id: Optional[uuid.UUID] = Query(None),
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.list_designations(db, department_id=department_id, active_only=active_only)


@designations_router.get(
    "/{designation_id}",
    response_model=DesignationResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def get_designation(designation_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_designation_by_id(db, designation_id)


@designations_router.put(
    "/{designation_id}",
    response_model=DesignationResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def update_designation(
    designation_id: uuid.UUID,
    desig_in: DesignationUpdate,
    db: Session = Depends(get_db),
):
    return service.update_designation(db, designation_id, desig_in)


# ==========================================
# 3. Employees Router
# ==========================================

@employees_router.get("/me", response_model=EmployeeResponse)
def get_my_employee_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    emp = service.get_employee_by_user_id(db, current_user.id)
    return _to_emp_response(emp)


@employees_router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def create_employee(emp_in: EmployeeCreate, db: Session = Depends(get_db)):
    emp = service.create_employee(db, emp_in)
    return _to_emp_response(emp)


@employees_router.get(
    "",
    response_model=List[EmployeeResponse],
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def list_employees(
    search: Optional[str] = Query(None),
    department_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    employees = service.list_employees(db, search=search, department_id=department_id, status_filter=status)
    return [_to_emp_response(emp) for emp in employees]


@employees_router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def get_employee(employee_id: uuid.UUID, db: Session = Depends(get_db)):
    emp = service.get_employee_by_id(db, employee_id)
    return _to_emp_response(emp)


@employees_router.put(
    "/{employee_id}",
    response_model=EmployeeResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def update_employee(
    employee_id: uuid.UUID,
    emp_in: EmployeeUpdate,
    db: Session = Depends(get_db),
):
    emp = service.update_employee(db, employee_id, emp_in)
    return _to_emp_response(emp)


@employees_router.patch(
    "/{employee_id}/status",
    response_model=EmployeeResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def update_employee_status(
    employee_id: uuid.UUID,
    status_in: EmployeeStatusUpdate,
    db: Session = Depends(get_db),
):
    emp = service.update_employee_status(db, employee_id, status_in)
    return _to_emp_response(emp)


# ==========================================
# 4. Attendance Router
# ==========================================

@attendance_router.post("/check-in", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def check_in(
    req: AttendanceCheckInRequest = AttendanceCheckInRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.record_check_in(db, current_user, notes=req.notes)


@attendance_router.post("/check-out", response_model=AttendanceResponse)
def check_out(
    req: AttendanceCheckOutRequest = AttendanceCheckOutRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.record_check_out(db, current_user, notes=req.notes)


@attendance_router.get("/me", response_model=List[AttendanceResponse])
def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_my_attendance(db, current_user)


@attendance_router.get(
    "",
    response_model=List[AttendanceResponse],
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def list_attendance(
    employee_id: Optional[uuid.UUID] = Query(None),
    date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    return service.list_attendance(db, employee_id=employee_id, target_date=date)


@attendance_router.put(
    "/{attendance_id}/correct",
    response_model=AttendanceResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def correct_attendance(
    attendance_id: uuid.UUID,
    correction_in: AttendanceCorrectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.correct_attendance(db, attendance_id, correction_in, corrected_by=current_user)


# ==========================================
# 5. Leaves Router
# ==========================================

@leaves_router.post("", response_model=LeaveResponse, status_code=status.HTTP_201_CREATED)
def apply_leave(
    leave_in: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.apply_leave(db, current_user, leave_in)


@leaves_router.get("/me", response_model=List[LeaveResponse])
def get_my_leaves(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_my_leaves(db, current_user)


@leaves_router.get(
    "",
    response_model=List[LeaveResponse],
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def list_leaves(
    employee_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return service.list_leaves(db, employee_id=employee_id, status_filter=status)


@leaves_router.get("/{leave_id}", response_model=LeaveResponse)
def get_leave(
    leave_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_roles = {r.name for r in current_user.roles}
    leave = service.get_leave_by_id(db, leave_id)
    if RoleEnum.OWNER.value not in user_roles and RoleEnum.HR_STAFF.value not in user_roles:
        emp = service.get_employee_by_user_id(db, current_user.id)
        if leave.employee_id != emp.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own leave applications.",
            )
    return leave


@leaves_router.post("/{leave_id}/cancel", response_model=LeaveResponse)
def cancel_own_leave(
    leave_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.cancel_leave(db, leave_id, current_user)


@leaves_router.post(
    "/{leave_id}/approve",
    response_model=LeaveResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def approve_leave(
    leave_id: uuid.UUID,
    req: LeaveReviewRequest = LeaveReviewRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.approve_leave(db, leave_id, reviewer=current_user, remarks=req.review_remarks)


@leaves_router.post(
    "/{leave_id}/reject",
    response_model=LeaveResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def reject_leave(
    leave_id: uuid.UUID,
    req: LeaveReviewRequest = LeaveReviewRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.reject_leave(db, leave_id, reviewer=current_user, remarks=req.review_remarks)


# ==========================================
# 6. Payroll & Salary Structures Router
# ==========================================

@payroll_router.post(
    "/salary-structures",
    response_model=SalaryStructureResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def create_salary_structure(struct_in: SalaryStructureCreate, db: Session = Depends(get_db)):
    return service.create_salary_structure(db, struct_in)


@payroll_router.get(
    "/salary-structures",
    response_model=List[SalaryStructureResponse],
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def list_salary_structures(db: Session = Depends(get_db)):
    return service.list_salary_structures(db)


@payroll_router.post(
    "/employees/{employee_id}/salary",
    response_model=SalaryAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def assign_employee_salary(
    employee_id: uuid.UUID,
    assign_in: SalaryAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.assign_salary(db, employee_id, assign_in, created_by=current_user)


@payroll_router.get(
    "/employees/{employee_id}/salary",
    response_model=List[SalaryAssignmentResponse],
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def get_employee_salary_history(employee_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_employee_salary_history(db, employee_id)


# --- Payroll Periods & Runs ---

@payroll_router.post(
    "/periods",
    response_model=PayrollPeriodResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def create_payroll_period(period_in: PayrollPeriodCreate, db: Session = Depends(get_db)):
    return service.create_payroll_period(db, period_in)


@payroll_router.get(
    "/periods",
    response_model=List[PayrollPeriodResponse],
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def list_payroll_periods(db: Session = Depends(get_db)):
    return service.list_payroll_periods(db)


@payroll_router.post(
    "/runs",
    response_model=PayrollRunResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def calculate_payroll_run(run_in: PayrollRunCreate, db: Session = Depends(get_db)):
    return service.calculate_payroll_run(db, run_in)


@payroll_router.get(
    "/runs",
    response_model=List[PayrollRunResponse],
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def get_payroll_runs(db: Session = Depends(get_db)):
    return service.get_payroll_runs(db)


@payroll_router.get(
    "/runs/{run_id}",
    response_model=PayrollRunResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def get_payroll_run(run_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.get_payroll_run_by_id(db, run_id)


@payroll_router.post(
    "/runs/{run_id}/review",
    response_model=PayrollRunResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def review_payroll_run(run_id: uuid.UUID, db: Session = Depends(get_db)):
    return service.review_payroll_run(db, run_id)


@payroll_router.post(
    "/runs/{run_id}/process",
    response_model=PayrollRunResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def process_payroll_run(
    run_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.process_payroll_run(db, run_id, processed_by=current_user)


# --- Payslips ---

@payroll_router.get("/me/payslips", response_model=List[PayslipResponse])
def get_my_payslips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_my_payslips(db, current_user)


@payroll_router.get("/me/payslips/{payslip_id}", response_model=PayslipResponse)
def get_my_payslip(
    payslip_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_roles = {r.name for r in current_user.roles}
    is_admin = RoleEnum.OWNER.value in user_roles or RoleEnum.HR_STAFF.value in user_roles
    return service.get_payslip_by_id(db, payslip_id, user=current_user, is_admin=is_admin)


# --- Payroll Disbursements ---

@payroll_router.post(
    "/entries/{entry_id}/disburse",
    response_model=PayrollDisbursementResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def record_payroll_disbursement(
    entry_id: uuid.UUID,
    disb_in: PayrollDisbursementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.record_payroll_disbursement(db, entry_id, disb_in, disbursed_by=current_user)
