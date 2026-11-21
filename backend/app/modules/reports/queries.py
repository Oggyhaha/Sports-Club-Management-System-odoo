from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, case, desc, distinct, extract, func, or_, select
from sqlalchemy.orm import Session

from app.models import (
    Attendance,
    Booking,
    Court,
    Department,
    Employee,
    InventoryMovement,
    Invoice,
    InvoiceItem,
    LeaveRequest,
    Member,
    MembershipPlan,
    MemberSubscription,
    Order,
    OrderItem,
    Payment,
    PaymentAllocation,
    PaymentAllocationReversal,
    PaymentRefund,
    PayrollDisbursement,
    PayrollEntry,
    PayrollPeriod,
    PayrollRun,
    Product,
    ProductCategory,
    SocialPlayParticipant,
    SocialPlaySession,
)
from app.modules.reports.calculations import (
    calculate_court_utilization,
    date_to_datetime_bounds,
    get_club_today,
    quantize_money,
    quantize_percent,
)
from app.modules.reports.schemas import (
    CourtUtilizationDetail,
    DepartmentHeadcount,
    FinancialOverview,
    LowStockProduct,
    MembershipPlanDistribution,
    PeakHourStat,
    ProductSalesPerformance,
    TaxComponentSummary,
)


# ==========================================
# 1. Financial Aggregation Queries
# ==========================================

def query_financial_overview(
    db: Session,
    start_d: date,
    end_d: date,
) -> Tuple[FinancialOverview, Dict[str, Decimal]]:
    start_dt, end_dt = date_to_datetime_bounds(start_d, end_d)

    # 1. Invoices issued within period (excluding draft, cancelled, void)
    inv_stmt = select(
        func.count(Invoice.id).label("cnt"),
        func.coalesce(func.sum(Invoice.total_amount), Decimal("0.00")).label("total_val"),
    ).where(
        Invoice.issue_date >= start_d,
        Invoice.issue_date <= end_d,
        Invoice.invoice_status.notin_(["draft", "cancelled", "void"]),
    )
    inv_res = db.execute(inv_stmt).one()
    invoices_issued_count = int(inv_res.cnt or 0)
    invoices_issued_value = quantize_money(inv_res.total_val)

    # 2. Outstanding Receivables across ALL currently open invoices
    recv_stmt = select(
        func.coalesce(func.sum(Invoice.total_amount - Invoice.amount_paid), Decimal("0.00")).label("outstanding")
    ).where(
        Invoice.invoice_status.in_(["issued", "partially_paid"]),
    )
    outstanding_receivables = quantize_money(db.execute(recv_stmt).scalar() or Decimal("0.00"))

    # 3. Customer Payments received within period (successful only)
    pmt_stmt = select(
        func.count(Payment.id).label("cnt"),
        func.coalesce(func.sum(Payment.amount), Decimal("0.00")).label("gross_cash"),
    ).where(
        Payment.received_at >= start_dt,
        Payment.received_at <= end_dt,
        Payment.payment_status == "successful",
    )
    pmt_res = db.execute(pmt_stmt).one()
    payments_received_count = int(pmt_res.cnt or 0)
    gross_customer_collections = quantize_money(pmt_res.gross_cash)

    # 4. Customer Refunds in period
    ref_stmt = select(
        func.count(PaymentRefund.id).label("cnt"),
        func.coalesce(func.sum(PaymentRefund.amount), Decimal("0.00")).label("refund_val"),
    ).where(
        PaymentRefund.created_at >= start_dt,
        PaymentRefund.created_at <= end_dt,
    )
    ref_res = db.execute(ref_stmt).one()
    customer_refunds_count = int(ref_res.cnt or 0)
    customer_refunds_value = quantize_money(ref_res.refund_val)

    # 5. Net Customer Collections = Gross Cash - Refunds
    net_customer_collections = quantize_money(gross_customer_collections - customer_refunds_value)

    # 6. Double-entry Allocations & Reversals in period
    alloc_val = db.execute(
        select(func.coalesce(func.sum(PaymentAllocation.allocated_amount), Decimal("0.00")))
        .where(PaymentAllocation.created_at >= start_dt, PaymentAllocation.created_at <= end_dt)
    ).scalar() or Decimal("0.00")

    rev_val = db.execute(
        select(func.coalesce(func.sum(PaymentAllocationReversal.amount), Decimal("0.00")))
        .where(PaymentAllocationReversal.created_at >= start_dt, PaymentAllocationReversal.created_at <= end_dt)
    ).scalar() or Decimal("0.00")

    net_allocated_value = quantize_money(alloc_val - rev_val)

    # Cumulative unallocated balance across all time
    all_successful_pmt = db.execute(
        select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .where(Payment.payment_status == "successful")
    ).scalar() or Decimal("0.00")
    all_alloc = db.execute(
        select(func.coalesce(func.sum(PaymentAllocation.allocated_amount), Decimal("0.00")))
    ).scalar() or Decimal("0.00")
    all_rev = db.execute(
        select(func.coalesce(func.sum(PaymentAllocationReversal.amount), Decimal("0.00")))
    ).scalar() or Decimal("0.00")
    all_ref = db.execute(
        select(func.coalesce(func.sum(PaymentRefund.amount), Decimal("0.00")))
    ).scalar() or Decimal("0.00")

    total_net_allocated = all_alloc - all_rev
    unallocated_customer_balance = quantize_money(max(Decimal("0.00"), all_successful_pmt - total_net_allocated - all_ref))

    # 7. Operating Expenses (Payroll Disbursements) in period
    disb_stmt = select(
        func.count(PayrollDisbursement.id).label("cnt"),
        func.coalesce(func.sum(PayrollDisbursement.amount), Decimal("0.00")).label("disb_val"),
    ).where(
        PayrollDisbursement.disbursement_date >= start_d,
        PayrollDisbursement.disbursement_date <= end_d,
    )
    disb_res = db.execute(disb_stmt).one()
    payroll_disbursements_count = int(disb_res.cnt or 0)
    recorded_operating_expenses = quantize_money(disb_res.disb_val)

    # 8. Estimated Operating Surplus = Net Collections - Payroll Disbursements
    estimated_operating_surplus = quantize_money(net_customer_collections - recorded_operating_expenses)

    financial_overview = FinancialOverview(
        invoices_issued_count=invoices_issued_count,
        invoices_issued_value=invoices_issued_value,
        outstanding_receivables=outstanding_receivables,
        payments_received_count=payments_received_count,
        gross_customer_collections=gross_customer_collections,
        customer_refunds_count=customer_refunds_count,
        customer_refunds_value=customer_refunds_value,
        net_customer_collections=net_customer_collections,
        net_allocated_value=net_allocated_value,
        unallocated_customer_balance=unallocated_customer_balance,
        payroll_disbursements_count=payroll_disbursements_count,
        recorded_operating_expenses=recorded_operating_expenses,
        estimated_operating_surplus=estimated_operating_surplus,
    )

    # 9. Revenue by Source breakdown
    shop_val = db.execute(
        select(func.coalesce(func.sum(Order.total_amount), Decimal("0.00")))
        .where(
            Order.order_type == "shop",
            Order.order_status != "cancelled",
            Order.created_at >= start_dt,
            Order.created_at <= end_dt,
        )
    ).scalar() or Decimal("0.00")

    cafeteria_val = db.execute(
        select(func.coalesce(func.sum(Order.total_amount), Decimal("0.00")))
        .where(
            Order.order_type == "cafeteria",
            Order.order_status != "cancelled",
            Order.created_at >= start_dt,
            Order.created_at <= end_dt,
        )
    ).scalar() or Decimal("0.00")

    subscription_val = db.execute(
        select(func.coalesce(func.sum(MemberSubscription.price_paid), Decimal("0.00")))
        .where(
            MemberSubscription.created_at >= start_dt,
            MemberSubscription.created_at <= end_dt,
        )
    ).scalar() or Decimal("0.00")

    direct_inv_val = db.execute(
        select(func.coalesce(func.sum(Invoice.total_amount), Decimal("0.00")))
        .where(
            Invoice.order_id.is_(None),
            Invoice.subscription_id.is_(None),
            Invoice.issue_date >= start_d,
            Invoice.issue_date <= end_d,
            Invoice.invoice_status.notin_(["draft", "cancelled", "void"]),
        )
    ).scalar() or Decimal("0.00")

    revenue_by_source = {
        "shop_orders": quantize_money(shop_val),
        "cafeteria_orders": quantize_money(cafeteria_val),
        "subscriptions": quantize_money(subscription_val),
        "direct_invoices": quantize_money(direct_inv_val),
    }

    return financial_overview, revenue_by_source


# ==========================================
# 2. Membership Aggregation Queries
# ==========================================

def query_membership_overview(
    db: Session,
    start_d: date,
    end_d: date,
) -> Tuple[int, int, int, int, int, int, int, List[MembershipPlanDistribution], int]:
    start_dt, end_dt = date_to_datetime_bounds(start_d, end_d)
    today = get_club_today()

    # Member counts
    tot_members = db.execute(select(func.count(Member.id))).scalar() or 0
    active_members = db.execute(select(func.count(Member.id)).where(Member.is_active == True)).scalar() or 0
    inactive_members = tot_members - active_members

    # Subscription statuses
    active_subs = db.execute(
        select(func.count(MemberSubscription.id)).where(MemberSubscription.subscription_status == "active")
    ).scalar() or 0
    expired_subs = db.execute(
        select(func.count(MemberSubscription.id)).where(MemberSubscription.subscription_status == "expired")
    ).scalar() or 0

    # New registrations in period
    new_reg = db.execute(
        select(func.count(Member.id)).where(Member.created_at >= start_dt, Member.created_at <= end_dt)
    ).scalar() or 0

    # Renewals in period: subscriptions where member had prior subscription
    subs_in_period = db.execute(
        select(MemberSubscription).where(
            MemberSubscription.created_at >= start_dt,
            MemberSubscription.created_at <= end_dt,
        )
    ).scalars().all()
    renewals = 0
    for s in subs_in_period:
        prior_cnt = db.execute(
            select(func.count(MemberSubscription.id)).where(
                MemberSubscription.member_id == s.member_id,
                MemberSubscription.created_at < s.created_at,
            )
        ).scalar() or 0
        if prior_cnt > 0:
            renewals += 1

    # Plan distribution
    plan_stmt = (
        select(
            MembershipPlan.id,
            MembershipPlan.name,
            func.count(Member.id).label("cnt"),
        )
        .outerjoin(Member, and_(Member.plan_id == MembershipPlan.id, Member.is_active == True))
        .group_by(MembershipPlan.id, MembershipPlan.name)
        .order_by(MembershipPlan.name)
    )
    plan_rows = db.execute(plan_stmt).all()
    plan_distribution = [
        MembershipPlanDistribution(
            plan_id=row.id,
            plan_name=row.name,
            active_member_count=int(row.cnt or 0),
        )
        for row in plan_rows
    ]

    # Expiring soon (within next 30 days)
    expiring_soon = db.execute(
        select(func.count(Member.id)).where(
            Member.is_active == True,
            Member.expiry_date >= today,
            Member.expiry_date <= today + timedelta(days=30),
        )
    ).scalar() or 0

    return (
        tot_members,
        active_members,
        inactive_members,
        active_subs,
        expired_subs,
        new_reg,
        renewals,
        plan_distribution,
        expiring_soon,
    )


# ==========================================
# 3. Booking & Court Aggregation Queries
# ==========================================

def query_booking_overview(
    db: Session,
    start_d: date,
    end_d: date,
) -> Tuple[int, int, int, Decimal, int, Decimal, int, int, Decimal, Decimal, Decimal, List[CourtUtilizationDetail], List[PeakHourStat]]:
    start_dt, end_dt = date_to_datetime_bounds(start_d, end_d)
    days_in_period = (end_d - start_d).days + 1

    # Total, confirmed, cancelled, walk-in bookings
    b_stmt = select(
        func.count(Booking.id).label("total_cnt"),
        func.count(case((Booking.status == "confirmed", 1))).label("confirmed_cnt"),
        func.count(case((Booking.status == "cancelled", 1))).label("cancelled_cnt"),
        func.count(case((Booking.member_id.is_(None), 1))).label("walk_in_cnt"),
    ).where(
        Booking.start_time >= start_dt,
        Booking.start_time <= end_dt,
    )
    b_res = db.execute(b_stmt).one()
    total_b = int(b_res.total_cnt or 0)
    confirmed_b = int(b_res.confirmed_cnt or 0)
    cancelled_b = int(b_res.cancelled_cnt or 0)
    walk_in_b = int(b_res.walk_in_cnt or 0)

    cancellation_rate = quantize_percent((Decimal(cancelled_b) / Decimal(total_b) * Decimal("100.0")) if total_b > 0 else Decimal("0.00"))
    walk_in_ratio = quantize_percent((Decimal(walk_in_b) / Decimal(total_b) * Decimal("100.0")) if total_b > 0 else Decimal("0.00"))

    # Social play sessions & participants
    sp_sessions = db.execute(
        select(func.count(SocialPlaySession.id)).where(
            SocialPlaySession.start_time >= start_dt,
            SocialPlaySession.start_time <= end_dt,
        )
    ).scalar() or 0

    sp_participants = db.execute(
        select(func.count(SocialPlayParticipant.id))
        .join(SocialPlaySession, SocialPlayParticipant.session_id == SocialPlaySession.id)
        .where(
            SocialPlaySession.start_time >= start_dt,
            SocialPlaySession.start_time <= end_dt,
            SocialPlayParticipant.status == "registered",
        )
    ).scalar() or 0

    # Active courts & individual utilization
    courts = db.execute(select(Court).where(Court.is_active == True).order_by(Court.name)).scalars().all()
    court_details: List[CourtUtilizationDetail] = []
    tot_booked_hours = Decimal("0.00")

    for c in courts:
        # Confirmed 60-min bookings for this court
        c_booked = db.execute(
            select(func.count(Booking.id)).where(
                Booking.court_id == c.id,
                Booking.status == "confirmed",
                Booking.start_time >= start_dt,
                Booking.start_time <= end_dt,
            )
        ).scalar() or 0
        b_hours = Decimal(c_booked)  # 1 hour per session
        tot_booked_hours += b_hours

        _, c_avail, c_util = calculate_court_utilization(b_hours, 1, days_in_period)
        court_details.append(
            CourtUtilizationDetail(
                court_id=c.id,
                court_name=c.name,
                sport_type=c.sport_type,
                booked_hours=quantize_money(b_hours),
                available_hours=c_avail,
                utilization_percent=c_util,
            )
        )

    # Overall court utilization
    active_courts_cnt = len(courts)
    overall_booked_hours, overall_available_hours, overall_util_pct = calculate_court_utilization(
        tot_booked_hours, active_courts_cnt, days_in_period
    )

    # Peak Hours query (group by local hour)
    peak_stmt = (
        select(
            func.to_char(func.timezone("Asia/Kolkata", Booking.start_time), "HH24:00").label("hour_str"),
            func.count(Booking.id).label("cnt"),
        )
        .where(
            Booking.start_time >= start_dt,
            Booking.start_time <= end_dt,
            Booking.status == "confirmed",
        )
        .group_by("hour_str")
        .order_by(desc("cnt"))
        .limit(5)
    )
    peak_rows = db.execute(peak_stmt).all()
    peak_hours = [PeakHourStat(hour_slot=row.hour_str, booking_count=int(row.cnt)) for row in peak_rows]

    return (
        total_b,
        confirmed_b,
        cancelled_b,
        cancellation_rate,
        walk_in_b,
        walk_in_ratio,
        sp_sessions,
        sp_participants,
        overall_booked_hours,
        overall_available_hours,
        overall_util_pct,
        court_details,
        peak_hours,
    )


# ==========================================
# 4. Commerce & Inventory Aggregation Queries
# ==========================================

def query_commerce_overview(
    db: Session,
    start_d: date,
    end_d: date,
) -> Tuple[int, int, int, int, Decimal, Decimal, List[ProductSalesPerformance], int, List[LowStockProduct]]:
    start_dt, end_dt = date_to_datetime_bounds(start_d, end_d)

    # Orders overview
    ord_stmt = select(
        func.count(Order.id).label("total_cnt"),
        func.count(case((Order.order_type == "shop", 1))).label("shop_cnt"),
        func.count(case((Order.order_type == "cafeteria", 1))).label("cafe_cnt"),
        func.count(case((Order.order_status == "cancelled", 1))).label("cancelled_cnt"),
        func.coalesce(func.sum(case((Order.order_status != "cancelled", Order.total_amount))), Decimal("0.00")).label("active_val"),
        func.coalesce(func.sum(case((Order.order_status == "cancelled", Order.total_amount))), Decimal("0.00")).label("cancelled_val"),
    ).where(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
    )
    ord_res = db.execute(ord_stmt).one()
    total_orders = int(ord_res.total_cnt or 0)
    shop_orders = int(ord_res.shop_cnt or 0)
    cafe_orders = int(ord_res.cafe_cnt or 0)
    cancelled_orders = int(ord_res.cancelled_cnt or 0)
    active_val = quantize_money(ord_res.active_val)
    cancelled_val = quantize_money(ord_res.cancelled_val)

    # Top selling products
    top_stmt = (
        select(
            Product.id,
            Product.name,
            Product.module_type,
            func.coalesce(func.sum(OrderItem.quantity), 0).label("units_sold"),
            func.coalesce(func.sum(OrderItem.line_total), Decimal("0.00")).label("sales_val"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            Order.order_status != "cancelled",
            Order.created_at >= start_dt,
            Order.created_at <= end_dt,
        )
        .group_by(Product.id, Product.name, Product.module_type)
        .order_by(desc("units_sold"))
        .limit(5)
    )
    top_rows = db.execute(top_stmt).all()
    top_selling = [
        ProductSalesPerformance(
            product_id=row.id,
            product_name=row.name,
            module_type=row.module_type,
            total_units_sold=int(row.units_sold),
            total_sales_value=quantize_money(row.sales_val),
        )
        for row in top_rows
    ]

    # Low stock alerts
    low_stmt = (
        select(Product)
        .where(
            Product.is_active == True,
            Product.inventory_tracked == True,
            Product.current_stock <= Product.reorder_threshold,
        )
        .order_by(Product.current_stock)
    )
    low_products_db = db.execute(low_stmt).scalars().all()
    low_stock_alerts_count = len(low_products_db)
    low_stock_products = [
        LowStockProduct(
            product_id=p.id,
            product_name=p.name,
            sku=p.sku,
            current_stock=p.current_stock,
            reorder_threshold=p.reorder_threshold,
        )
        for p in low_products_db[:10]  # Top 10 lowest stock
    ]

    return (
        total_orders,
        shop_orders,
        cafe_orders,
        cancelled_orders,
        active_val,
        cancelled_val,
        top_selling,
        low_stock_alerts_count,
        low_stock_products,
    )


# ==========================================
# 5. HR & Payroll Aggregation Queries
# ==========================================

def query_hr_overview(
    db: Session,
    start_d: date,
    end_d: date,
) -> Tuple[int, int, int, List[DepartmentHeadcount], int, int, int, int, int, Decimal, Decimal, Decimal]:
    start_dt, end_dt = date_to_datetime_bounds(start_d, end_d)

    # Employee counts
    tot_emp = db.execute(select(func.count(Employee.id))).scalar() or 0
    active_emp = db.execute(
        select(func.count(Employee.id)).where(Employee.employment_status == "active")
    ).scalar() or 0
    on_leave_emp = db.execute(
        select(func.count(Employee.id)).where(Employee.employment_status == "on_leave")
    ).scalar() or 0

    # Department distribution
    dept_stmt = (
        select(
            Department.id,
            Department.name,
            func.count(Employee.id).label("cnt"),
        )
        .outerjoin(Employee, and_(Employee.department_id == Department.id, Employee.employment_status == "active"))
        .group_by(Department.id, Department.name)
        .order_by(Department.name)
    )
    dept_rows = db.execute(dept_stmt).all()
    dept_distribution = [
        DepartmentHeadcount(
            department_id=row.id,
            department_name=row.name,
            employee_count=int(row.cnt or 0),
        )
        for row in dept_rows
    ]

    # Attendance counts in period
    att_stmt = select(
        func.count(Attendance.id).label("total_att"),
        func.count(case((Attendance.status.in_(["present", "half_day"]), 1))).label("present_att"),
    ).where(
        Attendance.attendance_date >= start_d,
        Attendance.attendance_date <= end_d,
    )
    att_res = db.execute(att_stmt).one()
    attendance_records_count = int(att_res.total_att or 0)
    present_records_count = int(att_res.present_att or 0)

    # Leaves in period
    leave_stmt = select(
        func.count(LeaveRequest.id).label("total_leaves"),
        func.count(case((LeaveRequest.status == "approved", 1))).label("approved_leaves"),
    ).where(
        LeaveRequest.applied_at >= start_dt,
        LeaveRequest.applied_at <= end_dt,
    )
    leave_res = db.execute(leave_stmt).one()
    leave_requests_count = int(leave_res.total_leaves or 0)
    approved_leaves_count = int(leave_res.approved_leaves or 0)

    # Payroll runs & net payable in period
    run_stmt = select(
        func.count(PayrollRun.id).label("runs_cnt"),
        func.coalesce(func.sum(PayrollRun.total_net), Decimal("0.00")).label("net_val"),
    ).where(
        PayrollRun.status.in_(["processed", "paid"]),
        PayrollRun.created_at >= start_dt,
        PayrollRun.created_at <= end_dt,
    )
    run_res = db.execute(run_stmt).one()
    payroll_runs_count = int(run_res.runs_cnt or 0)
    payroll_total_net = quantize_money(run_res.net_val)

    # Actual disbursements in period
    payroll_disbursed = quantize_money(
        db.execute(
            select(func.coalesce(func.sum(PayrollDisbursement.amount), Decimal("0.00")))
            .where(
                PayrollDisbursement.disbursement_date >= start_d,
                PayrollDisbursement.disbursement_date <= end_d,
            )
        ).scalar() or Decimal("0.00")
    )

    # Outstanding payroll liability across ALL finalized runs
    all_net = db.execute(
        select(func.coalesce(func.sum(PayrollEntry.net_payable), Decimal("0.00")))
        .join(PayrollRun, PayrollEntry.payroll_run_id == PayrollRun.id)
        .where(PayrollRun.status.in_(["processed", "paid"]))
    ).scalar() or Decimal("0.00")

    all_disb = db.execute(
        select(func.coalesce(func.sum(PayrollDisbursement.amount), Decimal("0.00")))
    ).scalar() or Decimal("0.00")

    payroll_outstanding_liability = quantize_money(max(Decimal("0.00"), all_net - all_disb))

    return (
        tot_emp,
        active_emp,
        on_leave_emp,
        dept_distribution,
        attendance_records_count,
        present_records_count,
        leave_requests_count,
        approved_leaves_count,
        payroll_runs_count,
        payroll_total_net,
        payroll_disbursed,
        payroll_outstanding_liability,
    )


# ==========================================
# 6. Tax Aggregation Queries
# ==========================================

def query_tax_summary(
    db: Session,
    start_d: date,
    end_d: date,
) -> Tuple[TaxComponentSummary, TaxComponentSummary, Decimal, Decimal]:
    start_dt, end_dt = date_to_datetime_bounds(start_d, end_d)

    # 1. Commerce Tax (Shop & Cafeteria Orders, excluding cancelled)
    comm_stmt = select(
        func.coalesce(func.sum(Order.subtotal - Order.discount_amount), Decimal("0.00")).label("taxable"),
        func.coalesce(func.sum(Order.tax_amount), Decimal("0.00")).label("tax_val"),
    ).where(
        Order.order_status != "cancelled",
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
    )
    comm_res = db.execute(comm_stmt).one()
    comm_taxable = quantize_money(comm_res.taxable)
    comm_tax = quantize_money(comm_res.tax_val)

    commerce_tax = TaxComponentSummary(
        source="commerce_orders",
        taxable_turnover=comm_taxable,
        tax_collected=comm_tax,
    )

    # 2. Direct Invoicing Tax (Invoices with order_id IS NULL to prevent double counting!)
    inv_stmt = select(
        func.coalesce(func.sum(Invoice.subtotal - Invoice.discount_amount), Decimal("0.00")).label("taxable"),
        func.coalesce(func.sum(Invoice.tax_amount), Decimal("0.00")).label("tax_val"),
    ).where(
        Invoice.order_id.is_(None),  # Crucial deduplication check!
        Invoice.issue_date >= start_d,
        Invoice.issue_date <= end_d,
        Invoice.invoice_status.notin_(["draft", "cancelled", "void"]),
    )
    inv_res = db.execute(inv_stmt).one()
    inv_taxable = quantize_money(inv_res.taxable)
    inv_tax = quantize_money(inv_res.tax_val)

    direct_invoicing_tax = TaxComponentSummary(
        source="direct_invoices",
        taxable_turnover=inv_taxable,
        tax_collected=inv_tax,
    )

    total_taxable_turnover = quantize_money(comm_taxable + inv_taxable)
    total_output_tax_collected = quantize_money(comm_tax + inv_tax)

    return (
        commerce_tax,
        direct_invoicing_tax,
        total_taxable_turnover,
        total_output_tax_collected,
    )
