from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# 1. Period & Filtering Schemas
# ==========================================

class ReportingPeriodMetadata(BaseModel):
    filter_type: str
    start_date: date
    end_date: date
    timezone: str = "Asia/Kolkata"
    generated_at: datetime


# ==========================================
# 2. Financial Overview & Reporting Schemas
# ==========================================

class FinancialOverview(BaseModel):
    # Receivables (Invoices)
    invoices_issued_count: int
    invoices_issued_value: Decimal
    outstanding_receivables: Decimal

    # Cash Inflows & Outflows
    payments_received_count: int
    gross_customer_collections: Decimal
    customer_refunds_count: int
    customer_refunds_value: Decimal
    net_customer_collections: Decimal

    # Double-Entry Allocations
    net_allocated_value: Decimal
    unallocated_customer_balance: Decimal

    # Operating Expenses
    payroll_disbursements_count: int
    recorded_operating_expenses: Decimal

    # Surplus
    estimated_operating_surplus: Decimal
    surplus_disclaimer: str = (
        "Estimated operating surplus based on recorded customer collections less staff payroll disbursements. "
        "Excludes unrecorded facility rent, utilities, equipment depreciation, and statutory tax obligations."
    )


class FinancialReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    period: ReportingPeriodMetadata
    financials: FinancialOverview
    revenue_by_source: Dict[str, Decimal]  # e.g., {"shop_orders": Decimal, "cafeteria_orders": Decimal, "direct_invoices": Decimal, "subscriptions": Decimal}


# ==========================================
# 3. Membership Overview & Reporting Schemas
# ==========================================

class MembershipPlanDistribution(BaseModel):
    plan_id: uuid.UUID
    plan_name: str
    active_member_count: int


class MembershipOverview(BaseModel):
    total_registered_members: int
    active_members: int
    inactive_members: int
    active_subscriptions: int
    expired_subscriptions: int
    new_registrations_in_period: int
    renewals_in_period: int
    plan_distribution: List[MembershipPlanDistribution]


class MemberReportResponse(BaseModel):
    period: ReportingPeriodMetadata
    memberships: MembershipOverview
    expiring_soon_count: int  # Expiring within next 30 days


# ==========================================
# 4. Booking & Court Utilization Schemas
# ==========================================

class CourtUtilizationDetail(BaseModel):
    court_id: uuid.UUID
    court_name: str
    sport_type: str
    booked_hours: Decimal
    available_hours: Decimal
    utilization_percent: Decimal


class PeakHourStat(BaseModel):
    hour_slot: str  # e.g. "18:00"
    booking_count: int


class BookingOverview(BaseModel):
    total_bookings: int
    confirmed_bookings: int
    cancelled_bookings: int
    cancellation_rate_percent: Decimal
    walk_in_bookings: int
    walk_in_ratio_percent: Decimal
    social_play_sessions: int
    social_play_participants: int
    total_booked_hours: Decimal
    total_available_hours: Decimal
    overall_court_utilization_percent: Decimal
    court_details: List[CourtUtilizationDetail]
    peak_hours: List[PeakHourStat]


class BookingReportResponse(BaseModel):
    period: ReportingPeriodMetadata
    bookings: BookingOverview


# ==========================================
# 5. Commerce & Inventory Schemas
# ==========================================

class ProductSalesPerformance(BaseModel):
    product_id: uuid.UUID
    product_name: str
    module_type: str
    total_units_sold: int
    total_sales_value: Decimal


class LowStockProduct(BaseModel):
    product_id: uuid.UUID
    product_name: str
    sku: str
    current_stock: int
    reorder_threshold: int


class CommerceOverview(BaseModel):
    total_orders_count: int
    shop_orders_count: int
    cafeteria_orders_count: int
    cancelled_orders_count: int
    completed_orders_value: Decimal
    cancelled_orders_value: Decimal
    top_selling_products: List[ProductSalesPerformance]
    low_stock_alerts_count: int
    low_stock_products: List[LowStockProduct]


class CommerceReportResponse(BaseModel):
    period: ReportingPeriodMetadata
    commerce: CommerceOverview


# ==========================================
# 6. HR & Workforce Schemas
# ==========================================

class DepartmentHeadcount(BaseModel):
    department_id: Optional[uuid.UUID]
    department_name: str
    employee_count: int


class HROverview(BaseModel):
    total_employees: int
    active_employees: int
    employees_on_leave: int
    department_distribution: List[DepartmentHeadcount]
    attendance_records_count: int
    present_records_count: int
    leave_requests_count: int
    approved_leaves_count: int
    payroll_runs_in_period: int
    payroll_total_net_payable: Decimal
    payroll_total_disbursed: Decimal
    payroll_outstanding_liability: Decimal


class HRReportResponse(BaseModel):
    period: ReportingPeriodMetadata
    hr: HROverview


# ==========================================
# 7. Tax Reporting Schemas
# ==========================================

class TaxComponentSummary(BaseModel):
    source: str  # "commerce_orders" or "direct_invoices"
    taxable_turnover: Decimal
    tax_collected: Decimal


class TaxReportResponse(BaseModel):
    period: ReportingPeriodMetadata
    commerce_tax: TaxComponentSummary
    direct_invoicing_tax: TaxComponentSummary
    total_taxable_turnover: Decimal
    total_output_tax_collected: Decimal
    statutory_notice: str = (
        "Summary represents calculated output GST liability from non-cancelled retail orders and direct non-order invoices. "
        "Does not constitute an audited GSTR-1 or GSTR-3B tax filing."
    )


# ==========================================
# 8. Unified Owner Dashboard Schema
# ==========================================

class OwnerDashboardResponse(BaseModel):
    period: ReportingPeriodMetadata
    financials: FinancialOverview
    memberships: MembershipOverview
    bookings: BookingOverview
    commerce: CommerceOverview
    hr: HROverview
    tax: TaxReportResponse
