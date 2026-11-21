from __future__ import annotations

import csv
import io
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.reports.calculations import get_club_now, resolve_period_dates
from app.modules.reports.queries import (
    query_booking_overview,
    query_commerce_overview,
    query_financial_overview,
    query_hr_overview,
    query_membership_overview,
    query_tax_summary,
)
from app.modules.reports.schemas import (
    BookingOverview,
    BookingReportResponse,
    CommerceOverview,
    CommerceReportResponse,
    FinancialOverview,
    FinancialReportResponse,
    HROverview,
    HRReportResponse,
    MemberReportResponse,
    MembershipOverview,
    OwnerDashboardResponse,
    ReportingPeriodMetadata,
    TaxReportResponse,
)


def _build_period_metadata(
    filter_type: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> Tuple[ReportingPeriodMetadata, date, date]:
    start_d, end_d = resolve_period_dates(filter_type, start_date, end_date)
    meta = ReportingPeriodMetadata(
        filter_type=filter_type.strip().lower() if filter_type else "this_month",
        start_date=start_d,
        end_date=end_d,
        timezone="Asia/Kolkata",
        generated_at=get_club_now(),
    )
    return meta, start_d, end_d


def get_financial_report(
    db: Session,
    filter_type: str = "this_month",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> FinancialReportResponse:
    period_meta, start_d, end_d = _build_period_metadata(filter_type, start_date, end_date)
    financials, rev_by_source = query_financial_overview(db, start_d, end_d)
    return FinancialReportResponse(
        period=period_meta,
        financials=financials,
        revenue_by_source=rev_by_source,
    )


def get_membership_report(
    db: Session,
    filter_type: str = "this_month",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> MemberReportResponse:
    period_meta, start_d, end_d = _build_period_metadata(filter_type, start_date, end_date)
    (
        tot_members,
        active_members,
        inactive_members,
        active_subs,
        expired_subs,
        new_reg,
        renewals,
        plan_distribution,
        expiring_soon,
    ) = query_membership_overview(db, start_d, end_d)

    mem_overview = MembershipOverview(
        total_registered_members=tot_members,
        active_members=active_members,
        inactive_members=inactive_members,
        active_subscriptions=active_subs,
        expired_subscriptions=expired_subs,
        new_registrations_in_period=new_reg,
        renewals_in_period=renewals,
        plan_distribution=plan_distribution,
    )
    return MemberReportResponse(
        period=period_meta,
        memberships=mem_overview,
        expiring_soon_count=expiring_soon,
    )


def get_booking_report(
    db: Session,
    filter_type: str = "this_month",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> BookingReportResponse:
    period_meta, start_d, end_d = _build_period_metadata(filter_type, start_date, end_date)
    (
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
    ) = query_booking_overview(db, start_d, end_d)

    booking_overview = BookingOverview(
        total_bookings=total_b,
        confirmed_bookings=confirmed_b,
        cancelled_bookings=cancelled_b,
        cancellation_rate_percent=cancellation_rate,
        walk_in_bookings=walk_in_b,
        walk_in_ratio_percent=walk_in_ratio,
        social_play_sessions=sp_sessions,
        social_play_participants=sp_participants,
        total_booked_hours=overall_booked_hours,
        total_available_hours=overall_available_hours,
        overall_court_utilization_percent=overall_util_pct,
        court_details=court_details,
        peak_hours=peak_hours,
    )
    return BookingReportResponse(
        period=period_meta,
        bookings=booking_overview,
    )


def get_commerce_report(
    db: Session,
    filter_type: str = "this_month",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> CommerceReportResponse:
    period_meta, start_d, end_d = _build_period_metadata(filter_type, start_date, end_date)
    (
        total_orders,
        shop_orders,
        cafe_orders,
        cancelled_orders,
        active_val,
        cancelled_val,
        top_selling,
        low_stock_alerts_count,
        low_stock_products,
    ) = query_commerce_overview(db, start_d, end_d)

    commerce_overview = CommerceOverview(
        total_orders_count=total_orders,
        shop_orders_count=shop_orders,
        cafeteria_orders_count=cafe_orders,
        cancelled_orders_count=cancelled_orders,
        completed_orders_value=active_val,
        cancelled_orders_value=cancelled_val,
        top_selling_products=top_selling,
        low_stock_alerts_count=low_stock_alerts_count,
        low_stock_products=low_stock_products,
    )
    return CommerceReportResponse(
        period=period_meta,
        commerce=commerce_overview,
    )


def get_hr_report(
    db: Session,
    filter_type: str = "this_month",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> HRReportResponse:
    period_meta, start_d, end_d = _build_period_metadata(filter_type, start_date, end_date)
    (
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
    ) = query_hr_overview(db, start_d, end_d)

    hr_overview = HROverview(
        total_employees=tot_emp,
        active_employees=active_emp,
        employees_on_leave=on_leave_emp,
        department_distribution=dept_distribution,
        attendance_records_count=attendance_records_count,
        present_records_count=present_records_count,
        leave_requests_count=leave_requests_count,
        approved_leaves_count=approved_leaves_count,
        payroll_runs_in_period=payroll_runs_count,
        payroll_total_net_payable=payroll_total_net,
        payroll_total_disbursed=payroll_disbursed,
        payroll_outstanding_liability=payroll_outstanding_liability,
    )
    return HRReportResponse(
        period=period_meta,
        hr=hr_overview,
    )


def get_tax_report(
    db: Session,
    filter_type: str = "this_month",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> TaxReportResponse:
    period_meta, start_d, end_d = _build_period_metadata(filter_type, start_date, end_date)
    (
        commerce_tax,
        direct_invoicing_tax,
        total_taxable_turnover,
        total_output_tax_collected,
    ) = query_tax_summary(db, start_d, end_d)

    return TaxReportResponse(
        period=period_meta,
        commerce_tax=commerce_tax,
        direct_invoicing_tax=direct_invoicing_tax,
        total_taxable_turnover=total_taxable_turnover,
        total_output_tax_collected=total_output_tax_collected,
    )


def get_owner_dashboard(
    db: Session,
    filter_type: str = "this_month",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> OwnerDashboardResponse:
    period_meta, start_d, end_d = _build_period_metadata(filter_type, start_date, end_date)

    financials, _ = query_financial_overview(db, start_d, end_d)

    (
        tot_members,
        active_members,
        inactive_members,
        active_subs,
        expired_subs,
        new_reg,
        renewals,
        plan_distribution,
        _,
    ) = query_membership_overview(db, start_d, end_d)
    memberships = MembershipOverview(
        total_registered_members=tot_members,
        active_members=active_members,
        inactive_members=inactive_members,
        active_subscriptions=active_subs,
        expired_subscriptions=expired_subs,
        new_registrations_in_period=new_reg,
        renewals_in_period=renewals,
        plan_distribution=plan_distribution,
    )

    (
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
    ) = query_booking_overview(db, start_d, end_d)
    bookings = BookingOverview(
        total_bookings=total_b,
        confirmed_bookings=confirmed_b,
        cancelled_bookings=cancelled_b,
        cancellation_rate_percent=cancellation_rate,
        walk_in_bookings=walk_in_b,
        walk_in_ratio_percent=walk_in_ratio,
        social_play_sessions=sp_sessions,
        social_play_participants=sp_participants,
        total_booked_hours=overall_booked_hours,
        total_available_hours=overall_available_hours,
        overall_court_utilization_percent=overall_util_pct,
        court_details=court_details,
        peak_hours=peak_hours,
    )

    (
        total_orders,
        shop_orders,
        cafe_orders,
        cancelled_orders,
        active_val,
        cancelled_val,
        top_selling,
        low_stock_alerts_count,
        low_stock_products,
    ) = query_commerce_overview(db, start_d, end_d)
    commerce = CommerceOverview(
        total_orders_count=total_orders,
        shop_orders_count=shop_orders,
        cafeteria_orders_count=cafe_orders,
        cancelled_orders_count=cancelled_orders,
        completed_orders_value=active_val,
        cancelled_orders_value=cancelled_val,
        top_selling_products=top_selling,
        low_stock_alerts_count=low_stock_alerts_count,
        low_stock_products=low_stock_products,
    )

    (
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
    ) = query_hr_overview(db, start_d, end_d)
    hr = HROverview(
        total_employees=tot_emp,
        active_employees=active_emp,
        employees_on_leave=on_leave_emp,
        department_distribution=dept_distribution,
        attendance_records_count=attendance_records_count,
        present_records_count=present_records_count,
        leave_requests_count=leave_requests_count,
        approved_leaves_count=approved_leaves_count,
        payroll_runs_in_period=payroll_runs_count,
        payroll_total_net_payable=payroll_total_net,
        payroll_total_disbursed=payroll_disbursed,
        payroll_outstanding_liability=payroll_outstanding_liability,
    )

    (
        commerce_tax,
        direct_invoicing_tax,
        total_taxable_turnover,
        total_output_tax_collected,
    ) = query_tax_summary(db, start_d, end_d)
    tax = TaxReportResponse(
        period=period_meta,
        commerce_tax=commerce_tax,
        direct_invoicing_tax=direct_invoicing_tax,
        total_taxable_turnover=total_taxable_turnover,
        total_output_tax_collected=total_output_tax_collected,
    )

    return OwnerDashboardResponse(
        period=period_meta,
        financials=financials,
        memberships=memberships,
        bookings=bookings,
        commerce=commerce,
        hr=hr,
        tax=tax,
    )


def export_report_csv(
    report_type: str,
    db: Session,
    filter_type: str = "this_month",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> str:
    rtype = report_type.strip().lower()
    output = io.StringIO()
    writer = csv.writer(output)

    if rtype in ["finance", "financial"]:
        rep = get_financial_report(db, filter_type, start_date, end_date)
        writer.writerow(["CHAMPIONS CLUB - FINANCIAL REPORT"])
        writer.writerow(["Filter Type", rep.period.filter_type])
        writer.writerow(["Start Date", rep.period.start_date.isoformat()])
        writer.writerow(["End Date", rep.period.end_date.isoformat()])
        writer.writerow(["Timezone", rep.period.timezone])
        writer.writerow(["Generated At", rep.period.generated_at.isoformat()])
        writer.writerow([])
        writer.writerow(["Metric", "Count", "Amount (INR)"])
        writer.writerow(["Invoices Issued", rep.financials.invoices_issued_count, str(rep.financials.invoices_issued_value)])
        writer.writerow(["Outstanding Receivables", "-", str(rep.financials.outstanding_receivables)])
        writer.writerow(["Payments Received (Gross Collections)", rep.financials.payments_received_count, str(rep.financials.gross_customer_collections)])
        writer.writerow(["Customer Refunds", rep.financials.customer_refunds_count, str(rep.financials.customer_refunds_value)])
        writer.writerow(["Net Customer Collections", "-", str(rep.financials.net_customer_collections)])
        writer.writerow(["Net Allocated to Invoices", "-", str(rep.financials.net_allocated_value)])
        writer.writerow(["Unallocated Customer Balance", "-", str(rep.financials.unallocated_customer_balance)])
        writer.writerow(["Payroll Disbursements (Operating Expenses)", rep.financials.payroll_disbursements_count, str(rep.financials.recorded_operating_expenses)])
        writer.writerow(["Estimated Operating Surplus", "-", str(rep.financials.estimated_operating_surplus)])
        writer.writerow([])
        writer.writerow(["REVENUE BY SOURCE", "Amount (INR)"])
        for src, val in rep.revenue_by_source.items():
            writer.writerow([src.replace("_", " ").title(), str(val)])
        writer.writerow([])
        writer.writerow(["Disclaimer", rep.financials.surplus_disclaimer])

    elif rtype in ["member", "members", "membership", "memberships"]:
        mrep = get_membership_report(db, filter_type, start_date, end_date)
        writer.writerow(["CHAMPIONS CLUB - MEMBERSHIP REPORT"])
        writer.writerow(["Filter Type", mrep.period.filter_type])
        writer.writerow(["Start Date", mrep.period.start_date.isoformat()])
        writer.writerow(["End Date", mrep.period.end_date.isoformat()])
        writer.writerow([])
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Registered Members", mrep.memberships.total_registered_members])
        writer.writerow(["Active Members", mrep.memberships.active_members])
        writer.writerow(["Inactive Members", mrep.memberships.inactive_members])
        writer.writerow(["Active Subscriptions", mrep.memberships.active_subscriptions])
        writer.writerow(["Expired Subscriptions", mrep.memberships.expired_subscriptions])
        writer.writerow(["New Registrations in Period", mrep.memberships.new_registrations_in_period])
        writer.writerow(["Renewals in Period", mrep.memberships.renewals_in_period])
        writer.writerow(["Expiring Soon (Next 30 Days)", mrep.expiring_soon_count])
        writer.writerow([])
        writer.writerow(["Plan ID", "Plan Name", "Active Members"])
        for p in mrep.memberships.plan_distribution:
            writer.writerow([str(p.plan_id), p.plan_name, p.active_member_count])

    elif rtype in ["booking", "bookings", "court", "courts"]:
        brep = get_booking_report(db, filter_type, start_date, end_date)
        writer.writerow(["CHAMPIONS CLUB - COURT BOOKING & UTILIZATION REPORT"])
        writer.writerow(["Filter Type", brep.period.filter_type])
        writer.writerow(["Start Date", brep.period.start_date.isoformat()])
        writer.writerow(["End Date", brep.period.end_date.isoformat()])
        writer.writerow([])
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Bookings", brep.bookings.total_bookings])
        writer.writerow(["Confirmed Bookings", brep.bookings.confirmed_bookings])
        writer.writerow(["Cancelled Bookings", brep.bookings.cancelled_bookings])
        writer.writerow(["Cancellation Rate (%)", str(brep.bookings.cancellation_rate_percent)])
        writer.writerow(["Walk-In Bookings", brep.bookings.walk_in_bookings])
        writer.writerow(["Walk-In Ratio (%)", str(brep.bookings.walk_in_ratio_percent)])
        writer.writerow(["Social Play Sessions", brep.bookings.social_play_sessions])
        writer.writerow(["Social Play Participants", brep.bookings.social_play_participants])
        writer.writerow(["Total Booked Hours", str(brep.bookings.total_booked_hours)])
        writer.writerow(["Total Available Hours", str(brep.bookings.total_available_hours)])
        writer.writerow(["Overall Court Utilization (%)", str(brep.bookings.overall_court_utilization_percent)])
        writer.writerow([])
        writer.writerow(["Court ID", "Court Name", "Sport Type", "Booked Hours", "Available Hours", "Utilization (%)"])
        for cd in brep.bookings.court_details:
            writer.writerow([str(cd.court_id), cd.court_name, cd.sport_type, str(cd.booked_hours), str(cd.available_hours), str(cd.utilization_percent)])
        writer.writerow([])
        writer.writerow(["Peak Hour Slot", "Bookings Count"])
        for ph in brep.bookings.peak_hours:
            writer.writerow([ph.hour_slot, ph.booking_count])

    elif rtype in ["commerce", "shop", "cafeteria", "inventory"]:
        crep = get_commerce_report(db, filter_type, start_date, end_date)
        writer.writerow(["CHAMPIONS CLUB - COMMERCE & INVENTORY REPORT"])
        writer.writerow(["Filter Type", crep.period.filter_type])
        writer.writerow(["Start Date", crep.period.start_date.isoformat()])
        writer.writerow(["End Date", crep.period.end_date.isoformat()])
        writer.writerow([])
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Orders", crep.commerce.total_orders_count])
        writer.writerow(["Shop Orders", crep.commerce.shop_orders_count])
        writer.writerow(["Cafeteria Orders", crep.commerce.cafeteria_orders_count])
        writer.writerow(["Cancelled Orders", crep.commerce.cancelled_orders_count])
        writer.writerow(["Completed Orders Value (INR)", str(crep.commerce.completed_orders_value)])
        writer.writerow(["Cancelled Orders Value (INR)", str(crep.commerce.cancelled_orders_value)])
        writer.writerow(["Low Stock Alert Items Count", crep.commerce.low_stock_alerts_count])
        writer.writerow([])
        writer.writerow(["TOP SELLING PRODUCTS"])
        writer.writerow(["Product ID", "Product Name", "Module Type", "Units Sold", "Total Sales Value (INR)"])
        for prod in crep.commerce.top_selling_products:
            writer.writerow([str(prod.product_id), prod.product_name, prod.module_type, prod.total_units_sold, str(prod.total_sales_value)])
        writer.writerow([])
        writer.writerow(["LOW STOCK WARNINGS"])
        writer.writerow(["Product ID", "Product Name", "SKU", "Current Stock", "Reorder Threshold"])
        for lsp in crep.commerce.low_stock_products:
            writer.writerow([str(lsp.product_id), lsp.product_name, lsp.sku, lsp.current_stock, lsp.reorder_threshold])

    elif rtype in ["hr", "payroll", "employees"]:
        hrep = get_hr_report(db, filter_type, start_date, end_date)
        writer.writerow(["CHAMPIONS CLUB - HR & PAYROLL REPORT"])
        writer.writerow(["Filter Type", hrep.period.filter_type])
        writer.writerow(["Start Date", hrep.period.start_date.isoformat()])
        writer.writerow(["End Date", hrep.period.end_date.isoformat()])
        writer.writerow([])
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Employees", hrep.hr.total_employees])
        writer.writerow(["Active Employees", hrep.hr.active_employees])
        writer.writerow(["Employees On Leave", hrep.hr.employees_on_leave])
        writer.writerow(["Attendance Records in Period", hrep.hr.attendance_records_count])
        writer.writerow(["Present Records in Period", hrep.hr.present_records_count])
        writer.writerow(["Leave Requests in Period", hrep.hr.leave_requests_count])
        writer.writerow(["Approved Leaves in Period", hrep.hr.approved_leaves_count])
        writer.writerow(["Payroll Runs in Period", hrep.hr.payroll_runs_in_period])
        writer.writerow(["Total Net Payroll Payable (INR)", str(hrep.hr.payroll_total_net_payable)])
        writer.writerow(["Total Payroll Disbursed (INR)", str(hrep.hr.payroll_total_disbursed)])
        writer.writerow(["Outstanding Payroll Liability (INR)", str(hrep.hr.payroll_outstanding_liability)])
        writer.writerow([])
        writer.writerow(["Department ID", "Department Name", "Active Employee Count"])
        for dh in hrep.hr.department_distribution:
            writer.writerow([str(dh.department_id) if dh.department_id else "-", dh.department_name, dh.employee_count])

    elif rtype in ["tax", "taxes", "gst"]:
        trep = get_tax_report(db, filter_type, start_date, end_date)
        writer.writerow(["CHAMPIONS CLUB - TAX SUMMARY REPORT"])
        writer.writerow(["Filter Type", trep.period.filter_type])
        writer.writerow(["Start Date", trep.period.start_date.isoformat()])
        writer.writerow(["End Date", trep.period.end_date.isoformat()])
        writer.writerow([])
        writer.writerow(["Source", "Taxable Turnover (INR)", "Output Tax Collected (INR)"])
        writer.writerow(["Commerce Orders (Shop & Cafeteria)", str(trep.commerce_tax.taxable_turnover), str(trep.commerce_tax.tax_collected)])
        writer.writerow(["Direct Invoices (Non-Order)", str(trep.direct_invoicing_tax.taxable_turnover), str(trep.direct_invoicing_tax.tax_collected)])
        writer.writerow(["TOTAL", str(trep.total_taxable_turnover), str(trep.total_output_tax_collected)])
        writer.writerow([])
        writer.writerow(["Notice", trep.statutory_notice])

    elif rtype in ["dashboard", "overview"]:
        drep = get_owner_dashboard(db, filter_type, start_date, end_date)
        writer.writerow(["CHAMPIONS CLUB - UNIFIED OWNER DASHBOARD"])
        writer.writerow(["Filter Type", drep.period.filter_type])
        writer.writerow(["Start Date", drep.period.start_date.isoformat()])
        writer.writerow(["End Date", drep.period.end_date.isoformat()])
        writer.writerow([])
        writer.writerow(["--- FINANCIALS ---"])
        writer.writerow(["Invoices Issued Value (INR)", str(drep.financials.invoices_issued_value)])
        writer.writerow(["Outstanding Receivables (INR)", str(drep.financials.outstanding_receivables)])
        writer.writerow(["Net Customer Collections (INR)", str(drep.financials.net_customer_collections)])
        writer.writerow(["Payroll Operating Expenses (INR)", str(drep.financials.recorded_operating_expenses)])
        writer.writerow(["Estimated Operating Surplus (INR)", str(drep.financials.estimated_operating_surplus)])
        writer.writerow([])
        writer.writerow(["--- MEMBERSHIPS ---"])
        writer.writerow(["Total Registered Members", drep.memberships.total_registered_members])
        writer.writerow(["Active Members", drep.memberships.active_members])
        writer.writerow(["Active Subscriptions", drep.memberships.active_subscriptions])
        writer.writerow([])
        writer.writerow(["--- BOOKINGS & COURTS ---"])
        writer.writerow(["Total Bookings", drep.bookings.total_bookings])
        writer.writerow(["Confirmed Bookings", drep.bookings.confirmed_bookings])
        writer.writerow(["Overall Court Utilization (%)", str(drep.bookings.overall_court_utilization_percent)])
        writer.writerow([])
        writer.writerow(["--- COMMERCE ---"])
        writer.writerow(["Completed Orders Value (INR)", str(drep.commerce.completed_orders_value)])
        writer.writerow(["Low Stock Alerts Count", drep.commerce.low_stock_alerts_count])
        writer.writerow([])
        writer.writerow(["--- HR & PAYROLL ---"])
        writer.writerow(["Total Employees", drep.hr.total_employees])
        writer.writerow(["Active Employees", drep.hr.active_employees])
        writer.writerow(["Payroll Disbursed (INR)", str(drep.hr.payroll_total_disbursed)])
        writer.writerow(["Payroll Liability (INR)", str(drep.hr.payroll_outstanding_liability)])
        writer.writerow([])
        writer.writerow(["--- TAX LIABILITY ---"])
        writer.writerow(["Total Taxable Turnover (INR)", str(drep.tax.total_taxable_turnover)])
        writer.writerow(["Total Output Tax Collected (INR)", str(drep.tax.total_output_tax_collected)])

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported report_type '{report_type}'. Allowed: 'financial', 'membership', 'booking', 'commerce', 'hr', 'tax', 'dashboard'.",
        )

    return output.getvalue()
