from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ==========================================
# 1. Departments & Designations Schemas
# ==========================================

class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: bool = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentResponse(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class DesignationBase(BaseModel):
    department_id: Optional[uuid.UUID] = None
    title: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: bool = True


class DesignationCreate(DesignationBase):
    pass


class DesignationUpdate(BaseModel):
    department_id: Optional[uuid.UUID] = None
    title: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DesignationResponse(DesignationBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# ==========================================
# 2. Employee Schemas
# ==========================================

class EmployeeBase(BaseModel):
    employee_code: str = Field(..., min_length=2, max_length=30)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    work_email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    joining_date: date
    employment_status: str = Field("active", max_length=20)
    employment_type: str = Field("full_time", max_length=20)
    address: Optional[str] = None
    emergency_contact: Optional[str] = Field(None, max_length=100)


class EmployeeCreate(EmployeeBase):
    user_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    designation_id: Optional[uuid.UUID] = None


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    phone: Optional[str] = Field(None, max_length=20)
    department_id: Optional[uuid.UUID] = None
    designation_id: Optional[uuid.UUID] = None
    employment_type: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    emergency_contact: Optional[str] = Field(None, max_length=100)


class EmployeeStatusUpdate(BaseModel):
    employment_status: str = Field(..., max_length=20)


class EmployeeResponse(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    designation_id: Optional[uuid.UUID] = None
    department_name: Optional[str] = None
    designation_title: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ==========================================
# 3. Attendance Schemas
# ==========================================

class AttendanceCheckInRequest(BaseModel):
    notes: Optional[str] = None


class AttendanceCheckOutRequest(BaseModel):
    notes: Optional[str] = None


class AttendanceCorrectionRequest(BaseModel):
    check_in: datetime
    check_out: Optional[datetime] = None
    status: str = Field(..., max_length=20)
    correction_reason: str = Field(..., min_length=5)


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    attendance_date: date
    check_in: datetime
    check_out: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    corrected_by_id: Optional[uuid.UUID] = None
    correction_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ==========================================
# 4. Leave Management Schemas
# ==========================================

class LeaveCreate(BaseModel):
    leave_type: str = Field(..., max_length=30)
    start_date: date
    end_date: date
    reason: str = Field(..., min_length=3)


class LeaveReviewRequest(BaseModel):
    review_remarks: Optional[str] = None


class LeaveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    leave_type: str
    start_date: date
    end_date: date
    days_count: Decimal
    reason: str
    status: str
    reviewed_by_id: Optional[uuid.UUID] = None
    review_remarks: Optional[str] = None
    applied_at: datetime
    reviewed_at: Optional[datetime] = None


# ==========================================
# 5. Salary Structure & Revision Schemas
# ==========================================

class SalaryComponentCreate(BaseModel):
    component_name: str = Field(..., min_length=2, max_length=50)
    component_type: str = Field(..., pattern="^(earning|deduction)$")
    default_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))


class SalaryComponentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    component_name: str
    component_type: str
    default_amount: Decimal


class SalaryStructureCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    components: List[SalaryComponentCreate] = Field(default_factory=list)


class SalaryStructureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    components: List[SalaryComponentResponse] = Field(default_factory=list)


class SalaryAssignmentCreate(BaseModel):
    salary_structure_id: uuid.UUID
    base_salary: Decimal = Field(..., ge=Decimal("0.00"))
    effective_from: date
    notes: Optional[str] = None


class SalaryAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    salary_structure_id: uuid.UUID
    base_salary: Decimal
    effective_from: date
    is_active: bool
    notes: Optional[str] = None
    created_at: datetime


# ==========================================
# 6. Payroll Processing & Disbursement Schemas
# ==========================================

class PayrollPeriodCreate(BaseModel):
    period_name: str = Field(..., min_length=2, max_length=50)
    start_date: date
    end_date: date


class PayrollPeriodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    period_name: str
    start_date: date
    end_date: date
    is_closed: bool
    created_at: datetime


class PayrollRunCreate(BaseModel):
    payroll_period_id: uuid.UUID
    notes: Optional[str] = None


class PayrollEntryComponentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    component_name: str
    component_type: str
    amount: Decimal


class PayrollEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    payroll_run_id: uuid.UUID
    employee_id: uuid.UUID
    employee_name_snapshot: str
    employee_code_snapshot: str
    department_snapshot: Optional[str] = None
    designation_snapshot: Optional[str] = None
    gross_earnings: Decimal
    total_deductions: Decimal
    net_payable: Decimal
    amount_disbursed: Decimal
    payment_status: str
    created_at: datetime
    components: List[PayrollEntryComponentResponse] = Field(default_factory=list)


class PayrollRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    payroll_period_id: uuid.UUID
    run_number: str
    status: str
    total_gross: Decimal
    total_deductions: Decimal
    total_net: Decimal
    notes: Optional[str] = None
    processed_by_id: Optional[uuid.UUID] = None
    processed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    entries: List[PayrollEntryResponse] = Field(default_factory=list)


class PayslipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    payslip_number: str
    payroll_entry_id: uuid.UUID
    employee_id: uuid.UUID
    generated_at: datetime
    payroll_entry: PayrollEntryResponse


class PayrollDisbursementCreate(BaseModel):
    idempotency_key: Optional[str] = Field(None, max_length=100)
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    disbursement_method: str = Field(..., max_length=30)
    disbursement_date: Optional[date] = None
    notes: Optional[str] = None


class PayrollDisbursementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    payroll_entry_id: uuid.UUID
    disbursement_reference: str
    idempotency_key: Optional[str] = None
    amount: Decimal
    disbursement_method: str
    disbursement_date: date
    disbursed_by_id: uuid.UUID
    notes: Optional[str] = None
    created_at: datetime
