from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.auth.models import User


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Department(Base):
    """
    Club departments (e.g., Coaching & Sports, Pro-Shop, Cafeteria, Operations, HR).
    """

    __tablename__ = "departments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    # Relationships
    designations: Mapped[List[Designation]] = relationship(
        back_populates="department",
        cascade="all, delete-orphan",
    )
    employees: Mapped[List[Employee]] = relationship(
        back_populates="department",
    )


class Designation(Base):
    """
    Job designations / titles within departments (e.g. Head Tennis Coach, Barista, Shop Assistant).
    """

    __tablename__ = "designations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    # Relationships
    department: Mapped[Optional[Department]] = relationship(
        back_populates="designations",
        foreign_keys=[department_id],
    )
    employees: Mapped[List[Employee]] = relationship(
        back_populates="designation",
    )


class Employee(Base):
    """
    Internal club employee profile, optionally linked to an authenticated User account.
    """

    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
        index=True,
    )
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    designation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("designations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    employee_code: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )
    first_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    last_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    work_email: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False,
        index=True,
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
    )
    joining_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    # Status: 'active', 'probation', 'on_leave', 'terminated', 'resigned'
    employment_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="active",
        index=True,
    )
    # Type: 'full_time', 'part_time', 'contract', 'intern'
    employment_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="full_time",
    )
    address: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    emergency_contact: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    # Relationships
    user: Mapped[Optional[User]] = relationship(foreign_keys=[user_id])
    department: Mapped[Optional[Department]] = relationship(
        back_populates="employees",
        foreign_keys=[department_id],
    )
    designation: Mapped[Optional[Designation]] = relationship(
        back_populates="employees",
        foreign_keys=[designation_id],
    )
    attendances: Mapped[List[Attendance]] = relationship(
        back_populates="employee",
        cascade="all, delete-orphan",
    )
    leave_requests: Mapped[List[LeaveRequest]] = relationship(
        back_populates="employee",
        cascade="all, delete-orphan",
    )
    salary_assignments: Mapped[List[SalaryAssignment]] = relationship(
        back_populates="employee",
        cascade="all, delete-orphan",
        order_by="desc(SalaryAssignment.effective_from)",
    )
    payroll_entries: Mapped[List[PayrollEntry]] = relationship(
        back_populates="employee",
    )


class Attendance(Base):
    """
    Employee attendance record tracking daily check-in, check-out, and status.
    """

    __tablename__ = "attendances"
    __table_args__ = (
        UniqueConstraint("employee_id", "attendance_date", name="uq_emp_attendance_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attendance_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )
    check_in: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    check_out: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    # Status: 'present', 'half_day', 'absent', 'on_leave'
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="present",
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    corrected_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    correction_reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    # Relationships
    employee: Mapped[Employee] = relationship(
        back_populates="attendances",
        foreign_keys=[employee_id],
    )
    corrected_by: Mapped[Optional[User]] = relationship(foreign_keys=[corrected_by_id])


class LeaveRequest(Base):
    """
    Employee leave applications with validation and approval workflow.
    """

    __tablename__ = "leave_requests"
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="chk_leave_date_range"),
        CheckConstraint("days_count > 0", name="chk_leave_days_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Leave Type: 'casual', 'sick', 'annual', 'unpaid', 'other'
    leave_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )
    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    days_count: Mapped[Decimal] = mapped_column(
        Numeric(4, 1),
        nullable=False,
    )
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    # Status: 'pending', 'approved', 'rejected', 'cancelled'
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
    )
    reviewed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    review_remarks: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    employee: Mapped[Employee] = relationship(
        back_populates="leave_requests",
        foreign_keys=[employee_id],
    )
    reviewed_by: Mapped[Optional[User]] = relationship(foreign_keys=[reviewed_by_id])


class SalaryStructure(Base):
    """
    Configurable salary structure templates (e.g. Senior Coach, Front Desk Standard).
    """

    __tablename__ = "salary_structures"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    # Relationships
    components: Mapped[List[SalaryStructureComponent]] = relationship(
        back_populates="salary_structure",
        cascade="all, delete-orphan",
    )
    assignments: Mapped[List[SalaryAssignment]] = relationship(
        back_populates="salary_structure",
    )


class SalaryStructureComponent(Base):
    """
    Configurable allowance or deduction components for a salary structure.
    """

    __tablename__ = "salary_structure_components"
    __table_args__ = (
        CheckConstraint("default_amount >= 0", name="chk_component_amount_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    salary_structure_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("salary_structures.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    component_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    # Type: 'earning' or 'deduction'
    component_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    default_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    # Relationships
    salary_structure: Mapped[SalaryStructure] = relationship(
        back_populates="components",
        foreign_keys=[salary_structure_id],
    )


class SalaryAssignment(Base):
    """
    Assignment of a salary structure to an employee with revision history and effective dates.
    """

    __tablename__ = "salary_assignments"
    __table_args__ = (
        CheckConstraint("base_salary >= 0", name="chk_base_salary_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    salary_structure_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("salary_structures.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    base_salary: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    effective_from: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    # Relationships
    employee: Mapped[Employee] = relationship(
        back_populates="salary_assignments",
        foreign_keys=[employee_id],
    )
    salary_structure: Mapped[SalaryStructure] = relationship(
        back_populates="assignments",
        foreign_keys=[salary_structure_id],
    )
    created_by: Mapped[Optional[User]] = relationship(foreign_keys=[created_by_id])


class PayrollPeriod(Base):
    """
    Monthly or custom payroll cycle (e.g., '2026-11' / 'November 2026').
    """

    __tablename__ = "payroll_periods"
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="chk_period_date_range"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    period_name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    is_closed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    # Relationships
    runs: Mapped[List[PayrollRun]] = relationship(
        back_populates="period",
    )


class PayrollRun(Base):
    """
    Batch payroll calculation run for a payroll period with approval lifecycle.
    """

    __tablename__ = "payroll_runs"
    __table_args__ = (
        CheckConstraint("total_gross >= 0", name="chk_run_gross_non_negative"),
        CheckConstraint("total_deductions >= 0", name="chk_run_deductions_non_negative"),
        CheckConstraint("total_net >= 0", name="chk_run_net_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    payroll_period_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payroll_periods.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    run_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    # Status: 'draft', 'reviewed', 'processed', 'paid', 'cancelled'
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="draft",
        index=True,
    )
    total_gross: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    total_deductions: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    total_net: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    processed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    # Relationships
    period: Mapped[PayrollPeriod] = relationship(
        back_populates="runs",
        foreign_keys=[payroll_period_id],
    )
    processed_by: Mapped[Optional[User]] = relationship(foreign_keys=[processed_by_id])
    entries: Mapped[List[PayrollEntry]] = relationship(
        back_populates="payroll_run",
        cascade="all, delete-orphan",
    )


class PayrollEntry(Base):
    """
    Employee line item within a payroll run capturing immutable calculation snapshots.
    """

    __tablename__ = "payroll_entries"
    __table_args__ = (
        UniqueConstraint("payroll_run_id", "employee_id", name="uq_run_employee"),
        CheckConstraint("gross_earnings >= 0", name="chk_entry_gross_non_negative"),
        CheckConstraint("total_deductions >= 0", name="chk_entry_deductions_non_negative"),
        CheckConstraint("net_payable >= 0", name="chk_entry_net_non_negative"),
        CheckConstraint("amount_disbursed >= 0", name="chk_entry_disbursed_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    payroll_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payroll_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Snapshots at generation
    employee_name_snapshot: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    employee_code_snapshot: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )
    department_snapshot: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    designation_snapshot: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # Financial breakdown
    gross_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    total_deductions: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    net_payable: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    amount_disbursed: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    # Payment Status: 'unpaid', 'partially_paid', 'paid'
    payment_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="unpaid",
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    # Relationships
    payroll_run: Mapped[PayrollRun] = relationship(
        back_populates="entries",
        foreign_keys=[payroll_run_id],
    )
    employee: Mapped[Employee] = relationship(
        back_populates="payroll_entries",
        foreign_keys=[employee_id],
    )
    components: Mapped[List[PayrollEntryComponent]] = relationship(
        back_populates="payroll_entry",
        cascade="all, delete-orphan",
    )
    payslip: Mapped[Optional[Payslip]] = relationship(
        back_populates="payroll_entry",
        uselist=False,
        cascade="all, delete-orphan",
    )
    disbursements: Mapped[List[PayrollDisbursement]] = relationship(
        back_populates="payroll_entry",
    )


class PayrollEntryComponent(Base):
    """
    Immutable component breakdown of earnings and deductions for a payroll entry.
    """

    __tablename__ = "payroll_entry_components"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    payroll_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payroll_entries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    component_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    component_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,  # 'earning' or 'deduction'
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    # Relationships
    payroll_entry: Mapped[PayrollEntry] = relationship(
        back_populates="components",
        foreign_keys=[payroll_entry_id],
    )


class Payslip(Base):
    """
    Employee-facing payslip document referencing the finalized payroll entry.
    """

    __tablename__ = "payslips"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    payslip_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    payroll_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payroll_entries.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    # Relationships
    payroll_entry: Mapped[PayrollEntry] = relationship(
        back_populates="payslip",
        foreign_keys=[payroll_entry_id],
    )
    employee: Mapped[Employee] = relationship(foreign_keys=[employee_id])


class PayrollDisbursement(Base):
    """
    Actual financial payment/disbursement to an employee against a payroll entry obligation.
    Decoupled from customer revenue and invoices.
    """

    __tablename__ = "payroll_disbursements"
    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_disbursement_amount_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    payroll_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payroll_entries.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    disbursement_reference: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    idempotency_key: Mapped[Optional[str]] = mapped_column(
        String(100),
        unique=True,
        nullable=True,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    # Method: 'bank_transfer', 'upi', 'cash', 'cheque'
    disbursement_method: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )
    disbursement_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        default=date.today,
    )
    disbursed_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    # Relationships
    payroll_entry: Mapped[PayrollEntry] = relationship(
        back_populates="disbursements",
        foreign_keys=[payroll_entry_id],
    )
    disbursed_by: Mapped[User] = relationship(foreign_keys=[disbursed_by_id])


__all__ = [
    "utc_now",
    "Department",
    "Designation",
    "Employee",
    "Attendance",
    "LeaveRequest",
    "SalaryStructure",
    "SalaryStructureComponent",
    "SalaryAssignment",
    "PayrollPeriod",
    "PayrollRun",
    "PayrollEntry",
    "PayrollEntryComponent",
    "Payslip",
    "PayrollDisbursement",
]
