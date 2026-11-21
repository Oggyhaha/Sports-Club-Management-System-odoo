from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.modules.auth.models import User
from app.modules.employees.models import (
    Attendance,
    Department,
    Designation,
    Employee,
    LeaveRequest,
    PayrollDisbursement,
    PayrollEntry,
    PayrollEntryComponent,
    PayrollPeriod,
    PayrollRun,
    Payslip,
    SalaryAssignment,
    SalaryStructure,
    SalaryStructureComponent,
    utc_now,
)
from app.modules.employees.schemas import (
    AttendanceCorrectionRequest,
    DepartmentCreate,
    DepartmentUpdate,
    DesignationCreate,
    DesignationUpdate,
    EmployeeCreate,
    EmployeeStatusUpdate,
    EmployeeUpdate,
    LeaveCreate,
    PayrollDisbursementCreate,
    PayrollPeriodCreate,
    PayrollRunCreate,
    SalaryAssignmentCreate,
    SalaryStructureCreate,
)


def quantize_money(amount: Decimal | float | int) -> Decimal:
    if isinstance(amount, (int, float, str)):
        amount = Decimal(str(amount))
    return amount.quantize(Decimal("0.01"))


# ==========================================
# 1. Departments & Designations Service
# ==========================================

def create_department(db: Session, dept_in: DepartmentCreate) -> Department:
    existing = db.execute(
        select(Department).where(func.lower(Department.name) == dept_in.name.lower().strip())
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Department with name '{dept_in.name}' already exists.",
        )
    dept = Department(
        name=dept_in.name.strip(),
        description=dept_in.description,
        is_active=dept_in.is_active,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


def list_departments(db: Session, active_only: bool = False) -> List[Department]:
    stmt = select(Department).order_by(Department.name)
    if active_only:
        stmt = stmt.where(Department.is_active == True)
    return list(db.execute(stmt).scalars().all())


def get_department_by_id(db: Session, department_id: uuid.UUID) -> Department:
    dept = db.get(Department, department_id)
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found.",
        )
    return dept


def update_department(db: Session, department_id: uuid.UUID, dept_in: DepartmentUpdate) -> Department:
    dept = get_department_by_id(db, department_id)
    if dept_in.name is not None and dept_in.name.strip().lower() != dept.name.lower():
        existing = db.execute(
            select(Department).where(func.lower(Department.name) == dept_in.name.lower().strip())
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Department with name '{dept_in.name}' already exists.",
            )
        dept.name = dept_in.name.strip()
    if dept_in.description is not None:
        dept.description = dept_in.description
    if dept_in.is_active is not None:
        dept.is_active = dept_in.is_active
    db.commit()
    db.refresh(dept)
    return dept


def create_designation(db: Session, desig_in: DesignationCreate) -> Designation:
    if desig_in.department_id:
        get_department_by_id(db, desig_in.department_id)
    desig = Designation(
        department_id=desig_in.department_id,
        title=desig_in.title.strip(),
        description=desig_in.description,
        is_active=desig_in.is_active,
    )
    db.add(desig)
    db.commit()
    db.refresh(desig)
    return desig


def list_designations(
    db: Session, department_id: Optional[uuid.UUID] = None, active_only: bool = False
) -> List[Designation]:
    stmt = select(Designation).order_by(Designation.title)
    if department_id:
        stmt = stmt.where(Designation.department_id == department_id)
    if active_only:
        stmt = stmt.where(Designation.is_active == True)
    return list(db.execute(stmt).scalars().all())


def get_designation_by_id(db: Session, designation_id: uuid.UUID) -> Designation:
    desig = db.get(Designation, designation_id)
    if not desig:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Designation not found.",
        )
    return desig


def update_designation(db: Session, designation_id: uuid.UUID, desig_in: DesignationUpdate) -> Designation:
    desig = get_designation_by_id(db, designation_id)
    if desig_in.department_id is not None:
        if desig_in.department_id:
            get_department_by_id(db, desig_in.department_id)
        desig.department_id = desig_in.department_id
    if desig_in.title is not None:
        desig.title = desig_in.title.strip()
    if desig_in.description is not None:
        desig.description = desig_in.description
    if desig_in.is_active is not None:
        desig.is_active = desig_in.is_active
    db.commit()
    db.refresh(desig)
    return desig


# ==========================================
# 2. Employees Service
# ==========================================

def create_employee(db: Session, emp_in: EmployeeCreate) -> Employee:
    # Check employee_code uniqueness
    existing_code = db.execute(
        select(Employee).where(func.lower(Employee.employee_code) == emp_in.employee_code.lower().strip())
    ).scalar_one_or_none()
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Employee with code '{emp_in.employee_code}' already exists.",
        )

    # Check work_email uniqueness
    existing_email = db.execute(
        select(Employee).where(func.lower(Employee.work_email) == emp_in.work_email.lower().strip())
    ).scalar_one_or_none()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Employee with email '{emp_in.work_email}' already exists.",
        )

    # Validate linked user_id if provided
    if emp_in.user_id:
        user = db.get(User, emp_in.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Linked user not found.",
            )
        existing_user_link = db.execute(
            select(Employee).where(Employee.user_id == emp_in.user_id)
        ).scalar_one_or_none()
        if existing_user_link:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User is already linked to another employee record.",
            )

    # Validate department and designation if provided
    if emp_in.department_id:
        get_department_by_id(db, emp_in.department_id)
    if emp_in.designation_id:
        get_designation_by_id(db, emp_in.designation_id)

    emp = Employee(
        user_id=emp_in.user_id,
        department_id=emp_in.department_id,
        designation_id=emp_in.designation_id,
        employee_code=emp_in.employee_code.strip(),
        first_name=emp_in.first_name.strip(),
        last_name=emp_in.last_name.strip(),
        work_email=emp_in.work_email.strip().lower(),
        phone=emp_in.phone.strip() if emp_in.phone else None,
        joining_date=emp_in.joining_date,
        employment_status=emp_in.employment_status,
        employment_type=emp_in.employment_type,
        address=emp_in.address,
        emergency_contact=emp_in.emergency_contact,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


def list_employees(
    db: Session,
    search: Optional[str] = None,
    department_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = None,
) -> List[Employee]:
    stmt = (
        select(Employee)
        .options(joinedload(Employee.department), joinedload(Employee.designation))
        .order_by(Employee.employee_code)
    )
    if department_id:
        stmt = stmt.where(Employee.department_id == department_id)
    if status_filter:
        stmt = stmt.where(Employee.employment_status == status_filter)
    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Employee.first_name).like(term),
                func.lower(Employee.last_name).like(term),
                func.lower(Employee.employee_code).like(term),
                func.lower(Employee.work_email).like(term),
            )
        )
    return list(db.execute(stmt).scalars().all())


def get_employee_by_id(db: Session, employee_id: uuid.UUID) -> Employee:
    stmt = (
        select(Employee)
        .options(joinedload(Employee.department), joinedload(Employee.designation))
        .where(Employee.id == employee_id)
    )
    emp = db.execute(stmt).scalar_one_or_none()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found.",
        )
    return emp


def get_employee_by_user_id(db: Session, user_id: uuid.UUID) -> Employee:
    stmt = (
        select(Employee)
        .options(joinedload(Employee.department), joinedload(Employee.designation))
        .where(Employee.user_id == user_id)
    )
    emp = db.execute(stmt).scalar_one_or_none()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No employee profile is linked to this authenticated user account.",
        )
    return emp


def update_employee(db: Session, employee_id: uuid.UUID, emp_in: EmployeeUpdate) -> Employee:
    emp = get_employee_by_id(db, employee_id)
    if emp_in.department_id is not None:
        if emp_in.department_id:
            get_department_by_id(db, emp_in.department_id)
        emp.department_id = emp_in.department_id
    if emp_in.designation_id is not None:
        if emp_in.designation_id:
            get_designation_by_id(db, emp_in.designation_id)
        emp.designation_id = emp_in.designation_id
    if emp_in.first_name is not None:
        emp.first_name = emp_in.first_name.strip()
    if emp_in.last_name is not None:
        emp.last_name = emp_in.last_name.strip()
    if emp_in.phone is not None:
        emp.phone = emp_in.phone.strip() if emp_in.phone else None
    if emp_in.employment_type is not None:
        emp.employment_type = emp_in.employment_type
    if emp_in.address is not None:
        emp.address = emp_in.address
    if emp_in.emergency_contact is not None:
        emp.emergency_contact = emp_in.emergency_contact
    db.commit()
    db.refresh(emp)
    return emp


def update_employee_status(db: Session, employee_id: uuid.UUID, status_in: EmployeeStatusUpdate) -> Employee:
    emp = get_employee_by_id(db, employee_id)
    emp.employment_status = status_in.employment_status
    db.commit()
    db.refresh(emp)
    return emp


# ==========================================
# 3. Attendance Service
# ==========================================

def record_check_in(db: Session, user: User, notes: Optional[str] = None) -> Attendance:
    emp = get_employee_by_user_id(db, user.id)
    today = date.today()

    existing = db.execute(
        select(Attendance).where(
            Attendance.employee_id == emp.id,
            Attendance.attendance_date == today,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-in has already been recorded for today.",
        )

    att = Attendance(
        employee_id=emp.id,
        attendance_date=today,
        check_in=utc_now(),
        status="present",
        notes=notes,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


def record_check_out(db: Session, user: User, notes: Optional[str] = None) -> Attendance:
    emp = get_employee_by_user_id(db, user.id)
    today = date.today()

    att = db.execute(
        select(Attendance).where(
            Attendance.employee_id == emp.id,
            Attendance.attendance_date == today,
        )
    ).scalar_one_or_none()
    if not att:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No open check-in record found for today.",
        )
    if att.check_out is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out has already been recorded for today.",
        )

    att.check_out = utc_now()
    if notes:
        att.notes = f"{att.notes}\nCheck-out note: {notes}" if att.notes else notes
    db.commit()
    db.refresh(att)
    return att


def get_my_attendance(db: Session, user: User) -> List[Attendance]:
    emp = get_employee_by_user_id(db, user.id)
    stmt = (
        select(Attendance)
        .where(Attendance.employee_id == emp.id)
        .order_by(desc(Attendance.attendance_date))
    )
    return list(db.execute(stmt).scalars().all())


def list_attendance(
    db: Session,
    employee_id: Optional[uuid.UUID] = None,
    target_date: Optional[date] = None,
) -> List[Attendance]:
    stmt = select(Attendance).order_by(desc(Attendance.attendance_date))
    if employee_id:
        stmt = stmt.where(Attendance.employee_id == employee_id)
    if target_date:
        stmt = stmt.where(Attendance.attendance_date == target_date)
    return list(db.execute(stmt).scalars().all())


def correct_attendance(
    db: Session,
    attendance_id: uuid.UUID,
    correction_in: AttendanceCorrectionRequest,
    corrected_by: User,
) -> Attendance:
    att = db.get(Attendance, attendance_id)
    if not att:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found.",
        )
    att.check_in = correction_in.check_in
    att.check_out = correction_in.check_out
    att.status = correction_in.status
    att.correction_reason = correction_in.correction_reason
    att.corrected_by_id = corrected_by.id
    db.commit()
    db.refresh(att)
    return att


# ==========================================
# 4. Leave Management Service
# ==========================================

def apply_leave(db: Session, user: User, leave_in: LeaveCreate) -> LeaveRequest:
    emp = get_employee_by_user_id(db, user.id)

    if leave_in.end_date < leave_in.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leave end_date cannot be earlier than start_date.",
        )

    # Calculate days count
    days = Decimal((leave_in.end_date - leave_in.start_date).days + 1)

    # Check for overlapping active leaves for the same employee
    overlap = db.execute(
        select(LeaveRequest).where(
            LeaveRequest.employee_id == emp.id,
            LeaveRequest.status.in_(["pending", "approved"]),
            LeaveRequest.start_date <= leave_in.end_date,
            LeaveRequest.end_date >= leave_in.start_date,
        )
    ).scalar_one_or_none()
    if overlap:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An active leave application already overlaps this date range ({overlap.start_date} to {overlap.end_date}).",
        )

    leave = LeaveRequest(
        employee_id=emp.id,
        leave_type=leave_in.leave_type,
        start_date=leave_in.start_date,
        end_date=leave_in.end_date,
        days_count=days,
        reason=leave_in.reason.strip(),
        status="pending",
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


def get_my_leaves(db: Session, user: User) -> List[LeaveRequest]:
    emp = get_employee_by_user_id(db, user.id)
    stmt = select(LeaveRequest).where(LeaveRequest.employee_id == emp.id).order_by(desc(LeaveRequest.applied_at))
    return list(db.execute(stmt).scalars().all())


def list_leaves(
    db: Session,
    employee_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = None,
) -> List[LeaveRequest]:
    stmt = select(LeaveRequest).order_by(desc(LeaveRequest.applied_at))
    if employee_id:
        stmt = stmt.where(LeaveRequest.employee_id == employee_id)
    if status_filter:
        stmt = stmt.where(LeaveRequest.status == status_filter)
    return list(db.execute(stmt).scalars().all())


def get_leave_by_id(db: Session, leave_id: uuid.UUID) -> LeaveRequest:
    leave = db.get(LeaveRequest, leave_id)
    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave application not found.",
        )
    return leave


def cancel_leave(db: Session, leave_id: uuid.UUID, user: User) -> LeaveRequest:
    emp = get_employee_by_user_id(db, user.id)
    leave = get_leave_by_id(db, leave_id)
    if leave.employee_id != emp.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel your own leave applications.",
        )
    if leave.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel a leave application with status '{leave.status}'.",
        )
    leave.status = "cancelled"
    db.commit()
    db.refresh(leave)
    return leave


def approve_leave(db: Session, leave_id: uuid.UUID, reviewer: User, remarks: Optional[str] = None) -> LeaveRequest:
    leave = get_leave_by_id(db, leave_id)
    # Disallow self-approval
    emp = db.execute(select(Employee).where(Employee.user_id == reviewer.id)).scalar_one_or_none()
    if emp and emp.id == leave.employee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employees cannot approve their own leave requests.",
        )
    if leave.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve a leave application with status '{leave.status}'.",
        )
    leave.status = "approved"
    leave.reviewed_by_id = reviewer.id
    leave.reviewed_at = utc_now()
    if remarks:
        leave.review_remarks = remarks
    db.commit()
    db.refresh(leave)
    return leave


def reject_leave(db: Session, leave_id: uuid.UUID, reviewer: User, remarks: Optional[str] = None) -> LeaveRequest:
    leave = get_leave_by_id(db, leave_id)
    if leave.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject a leave application with status '{leave.status}'.",
        )
    leave.status = "rejected"
    leave.reviewed_by_id = reviewer.id
    leave.reviewed_at = utc_now()
    leave.review_remarks = remarks
    db.commit()
    db.refresh(leave)
    return leave


# ==========================================
# 5. Salary Structure & Revision Service
# ==========================================

def create_salary_structure(db: Session, struct_in: SalaryStructureCreate) -> SalaryStructure:
    existing = db.execute(
        select(SalaryStructure).where(func.lower(SalaryStructure.name) == struct_in.name.lower().strip())
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Salary structure with name '{struct_in.name}' already exists.",
        )

    struct = SalaryStructure(
        name=struct_in.name.strip(),
        description=struct_in.description,
    )
    db.add(struct)
    db.flush()

    for comp in struct_in.components:
        c = SalaryStructureComponent(
            salary_structure_id=struct.id,
            component_name=comp.component_name.strip(),
            component_type=comp.component_type,
            default_amount=quantize_money(comp.default_amount),
        )
        db.add(c)

    db.commit()
    db.refresh(struct)
    return struct


def list_salary_structures(db: Session) -> List[SalaryStructure]:
    stmt = (
        select(SalaryStructure)
        .options(joinedload(SalaryStructure.components))
        .order_by(SalaryStructure.name)
    )
    return list(db.execute(stmt).unique().scalars().all())


def get_salary_structure_by_id(db: Session, structure_id: uuid.UUID) -> SalaryStructure:
    stmt = (
        select(SalaryStructure)
        .options(joinedload(SalaryStructure.components))
        .where(SalaryStructure.id == structure_id)
    )
    struct = db.execute(stmt).unique().scalar_one_or_none()
    if not struct:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salary structure not found.",
        )
    return struct


def assign_salary(
    db: Session,
    employee_id: uuid.UUID,
    assign_in: SalaryAssignmentCreate,
    created_by: User,
) -> SalaryAssignment:
    get_employee_by_id(db, employee_id)
    get_salary_structure_by_id(db, assign_in.salary_structure_id)

    # Deactivate previous active salary assignments
    prev_assignments = db.execute(
        select(SalaryAssignment).where(
            SalaryAssignment.employee_id == employee_id,
            SalaryAssignment.is_active == True,
        )
    ).scalars().all()
    for prev in prev_assignments:
        prev.is_active = False

    assignment = SalaryAssignment(
        employee_id=employee_id,
        salary_structure_id=assign_in.salary_structure_id,
        base_salary=quantize_money(assign_in.base_salary),
        effective_from=assign_in.effective_from,
        is_active=True,
        notes=assign_in.notes,
        created_by_id=created_by.id,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def get_employee_salary_history(db: Session, employee_id: uuid.UUID) -> List[SalaryAssignment]:
    get_employee_by_id(db, employee_id)
    stmt = (
        select(SalaryAssignment)
        .where(SalaryAssignment.employee_id == employee_id)
        .order_by(desc(SalaryAssignment.effective_from), desc(SalaryAssignment.created_at))
    )
    return list(db.execute(stmt).scalars().all())


# ==========================================
# 6. Payroll Processing & Disbursement Service
# ==========================================

def create_payroll_period(db: Session, period_in: PayrollPeriodCreate) -> PayrollPeriod:
    if period_in.end_date < period_in.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Period end_date cannot be earlier than start_date.",
        )
    existing = db.execute(
        select(PayrollPeriod).where(func.lower(PayrollPeriod.period_name) == period_in.period_name.lower().strip())
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Payroll period '{period_in.period_name}' already exists.",
        )

    period = PayrollPeriod(
        period_name=period_in.period_name.strip(),
        start_date=period_in.start_date,
        end_date=period_in.end_date,
    )
    db.add(period)
    db.commit()
    db.refresh(period)
    return period


def list_payroll_periods(db: Session) -> List[PayrollPeriod]:
    stmt = select(PayrollPeriod).order_by(desc(PayrollPeriod.start_date))
    return list(db.execute(stmt).scalars().all())


def calculate_payroll_run(db: Session, run_in: PayrollRunCreate) -> PayrollRun:
    period = db.get(PayrollPeriod, run_in.payroll_period_id)
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payroll period not found.",
        )
    if period.is_closed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create payroll run for a closed period.",
        )

    # Prevent duplicate runs for the same period
    existing_run = db.execute(
        select(PayrollRun).where(
            PayrollRun.payroll_period_id == period.id,
            PayrollRun.status.in_(["draft", "reviewed", "processed", "paid"]),
        )
    ).scalar_one_or_none()
    if existing_run:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An active payroll run ({existing_run.run_number}) already exists for this period.",
        )

    # Generate unique run number
    run_number = f"PAY-RUN-{period.period_name.replace(' ', '-').upper()}-{uuid.uuid4().hex[:4].upper()}"

    run = PayrollRun(
        payroll_period_id=period.id,
        run_number=run_number,
        status="draft",
        notes=run_in.notes,
        total_gross=Decimal("0.00"),
        total_deductions=Decimal("0.00"),
        total_net=Decimal("0.00"),
    )
    db.add(run)
    db.flush()

    # Query active employees who have an active salary assignment
    active_employees = db.execute(
        select(Employee)
        .options(joinedload(Employee.department), joinedload(Employee.designation))
        .where(Employee.employment_status == "active")
    ).scalars().all()

    total_gross = Decimal("0.00")
    total_deductions = Decimal("0.00")
    total_net = Decimal("0.00")

    for emp in active_employees:
        # Find active salary assignment effective for this period
        assign = db.execute(
            select(SalaryAssignment)
            .options(joinedload(SalaryAssignment.salary_structure).joinedload(SalaryStructure.components))
            .where(
                SalaryAssignment.employee_id == emp.id,
                SalaryAssignment.is_active == True,
                SalaryAssignment.effective_from <= period.end_date,
            )
            .order_by(desc(SalaryAssignment.effective_from))
        ).scalars().first()

        if not assign:
            continue  # Skip employees without active salary assignment

        gross = assign.base_salary
        deductions = Decimal("0.00")

        # Snapshot structure components
        components_to_add: List[PayrollEntryComponent] = []

        # Add Base Pay as primary earning component
        components_to_add.append(
            PayrollEntryComponent(
                component_name="Basic Pay",
                component_type="earning",
                amount=quantize_money(assign.base_salary),
            )
        )

        for comp in assign.salary_structure.components:
            comp_amount = quantize_money(comp.default_amount)
            if comp.component_type == "earning":
                gross += comp_amount
            elif comp.component_type == "deduction":
                deductions += comp_amount

            components_to_add.append(
                PayrollEntryComponent(
                    component_name=comp.component_name,
                    component_type=comp.component_type,
                    amount=comp_amount,
                )
            )

        gross = quantize_money(gross)
        deductions = quantize_money(deductions)
        net = quantize_money(max(Decimal("0.00"), gross - deductions))

        entry = PayrollEntry(
            payroll_run_id=run.id,
            employee_id=emp.id,
            employee_name_snapshot=f"{emp.first_name} {emp.last_name}",
            employee_code_snapshot=emp.employee_code,
            department_snapshot=emp.department.name if emp.department else None,
            designation_snapshot=emp.designation.title if emp.designation else None,
            gross_earnings=gross,
            total_deductions=deductions,
            net_payable=net,
            amount_disbursed=Decimal("0.00"),
            payment_status="unpaid",
        )
        db.add(entry)
        db.flush()

        for c in components_to_add:
            c.payroll_entry_id = entry.id
            db.add(c)

        total_gross += gross
        total_deductions += deductions
        total_net += net

    run.total_gross = quantize_money(total_gross)
    run.total_deductions = quantize_money(total_deductions)
    run.total_net = quantize_money(total_net)

    db.commit()
    db.refresh(run)
    return run


def review_payroll_run(db: Session, run_id: uuid.UUID) -> PayrollRun:
    run = db.get(PayrollRun, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payroll run not found.",
        )
    if run.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot review a payroll run with status '{run.status}'.",
        )
    run.status = "reviewed"
    db.commit()
    db.refresh(run)
    return run


def process_payroll_run(db: Session, run_id: uuid.UUID, processed_by: User) -> PayrollRun:
    run = db.get(PayrollRun, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payroll run not found.",
        )
    if run.status != "reviewed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot process payroll run with status '{run.status}'. Must be reviewed first.",
        )

    run.status = "processed"
    run.processed_by_id = processed_by.id
    run.processed_at = utc_now()

    # Generate immutable payslips for each entry
    entries = db.execute(select(PayrollEntry).where(PayrollEntry.payroll_run_id == run.id)).scalars().all()
    for entry in entries:
        existing_payslip = db.execute(
            select(Payslip).where(Payslip.payroll_entry_id == entry.id)
        ).scalar_one_or_none()
        if not existing_payslip:
            payslip_number = f"PSLIP-{entry.employee_code_snapshot}-{uuid.uuid4().hex[:6].upper()}"
            payslip = Payslip(
                payslip_number=payslip_number,
                payroll_entry_id=entry.id,
                employee_id=entry.employee_id,
                generated_at=utc_now(),
            )
            db.add(payslip)

    db.commit()
    db.refresh(run)
    return run


def get_payroll_runs(db: Session) -> List[PayrollRun]:
    stmt = (
        select(PayrollRun)
        .options(joinedload(PayrollRun.period), joinedload(PayrollRun.entries).joinedload(PayrollEntry.components))
        .order_by(desc(PayrollRun.created_at))
    )
    return list(db.execute(stmt).unique().scalars().all())


def get_payroll_run_by_id(db: Session, run_id: uuid.UUID) -> PayrollRun:
    stmt = (
        select(PayrollRun)
        .options(
            joinedload(PayrollRun.period),
            joinedload(PayrollRun.entries).joinedload(PayrollEntry.components),
        )
        .where(PayrollRun.id == run_id)
    )
    run = db.execute(stmt).unique().scalar_one_or_none()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payroll run not found.",
        )
    return run


def get_my_payslips(db: Session, user: User) -> List[Payslip]:
    emp = get_employee_by_user_id(db, user.id)
    stmt = (
        select(Payslip)
        .options(joinedload(Payslip.payroll_entry).joinedload(PayrollEntry.components))
        .where(Payslip.employee_id == emp.id)
        .order_by(desc(Payslip.generated_at))
    )
    return list(db.execute(stmt).unique().scalars().all())


def get_payslip_by_id(db: Session, payslip_id: uuid.UUID, user: User, is_admin: bool = False) -> Payslip:
    stmt = (
        select(Payslip)
        .options(joinedload(Payslip.payroll_entry).joinedload(PayrollEntry.components))
        .where(Payslip.id == payslip_id)
    )
    payslip = db.execute(stmt).unique().scalar_one_or_none()
    if not payslip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payslip not found.",
        )
    if not is_admin:
        emp = get_employee_by_user_id(db, user.id)
        if payslip.employee_id != emp.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own payslips.",
            )
    return payslip


# ==========================================
# 7. Payroll Disbursement Service
# ==========================================

def record_payroll_disbursement(
    db: Session,
    entry_id: uuid.UUID,
    disb_in: PayrollDisbursementCreate,
    disbursed_by: User,
) -> PayrollDisbursement:
    # 1. Deterministic lock on PayrollEntry
    entry = db.execute(
        select(PayrollEntry).where(PayrollEntry.id == entry_id).with_for_update()
    ).scalar_one_or_none()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payroll entry not found.",
        )

    # 2. Check payroll run status (must be finalized: 'processed' or 'paid')
    run = db.get(PayrollRun, entry.payroll_run_id)
    if not run or run.status not in ("processed", "paid"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot disburse payments on unfinalized payroll runs.",
        )

    # 3. Idempotency replay check
    if disb_in.idempotency_key:
        existing = db.execute(
            select(PayrollDisbursement).where(
                PayrollDisbursement.idempotency_key == disb_in.idempotency_key.strip()
            )
        ).scalar_one_or_none()
        if existing:
            return existing

    amount = quantize_money(disb_in.amount)

    # 4. Enforce outstanding payable balance
    outstanding = quantize_money(entry.net_payable - entry.amount_disbursed)
    if amount > outstanding:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Disbursement amount (₹{amount}) exceeds outstanding payable balance (₹{outstanding}).",
        )

    # 5. Insert disbursement record
    ref = f"DISB-{uuid.uuid4().hex[:8].upper()}"
    disb = PayrollDisbursement(
        payroll_entry_id=entry.id,
        disbursement_reference=ref,
        idempotency_key=disb_in.idempotency_key.strip() if disb_in.idempotency_key else None,
        amount=amount,
        disbursement_method=disb_in.disbursement_method,
        disbursement_date=disb_in.disbursement_date or date.today(),
        disbursed_by_id=disbursed_by.id,
        notes=disb_in.notes,
    )
    db.add(disb)

    # 6. Update entry amounts and payment status
    entry.amount_disbursed = quantize_money(entry.amount_disbursed + amount)
    if entry.amount_disbursed >= entry.net_payable:
        entry.payment_status = "paid"
    else:
        entry.payment_status = "partially_paid"

    # 7. Check if all entries in run are paid
    unpaid_count = db.execute(
        select(func.count(PayrollEntry.id)).where(
            PayrollEntry.payroll_run_id == run.id,
            PayrollEntry.payment_status != "paid",
        )
    ).scalar() or 0

    if unpaid_count == 0:
        run.status = "paid"

    db.commit()
    db.refresh(disb)
    return disb
