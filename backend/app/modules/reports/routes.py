from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models import RoleEnum
from app.modules.reports import service
from app.modules.reports.schemas import (
    BookingReportResponse,
    CommerceReportResponse,
    FinancialReportResponse,
    HRReportResponse,
    MemberReportResponse,
    OwnerDashboardResponse,
    TaxReportResponse,
)

reports_router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


@reports_router.get(
    "/dashboard",
    response_model=OwnerDashboardResponse,
    summary="Unified Owner Executive Dashboard",
    dependencies=[Depends(require_roles([RoleEnum.OWNER]))],
)
def get_owner_dashboard_endpoint(
    filter_type: str = Query("this_month", description="Period filter: 'today', 'this_week', 'this_month', 'this_year', or 'custom'"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD), required if filter_type='custom'"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD), required if filter_type='custom'"),
    db: Session = Depends(get_db),
):
    return service.get_owner_dashboard(
        db=db,
        filter_type=filter_type,
        start_date=start_date,
        end_date=end_date,
    )


@reports_router.get(
    "/finance/overview",
    response_model=FinancialReportResponse,
    summary="Comprehensive Financial & Cash Flow Analytics",
    dependencies=[Depends(require_roles([RoleEnum.OWNER]))],
)
def get_financial_report_endpoint(
    filter_type: str = Query("this_month", description="Period filter: 'today', 'this_week', 'this_month', 'this_year', or 'custom'"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD), required if filter_type='custom'"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD), required if filter_type='custom'"),
    db: Session = Depends(get_db),
):
    return service.get_financial_report(
        db=db,
        filter_type=filter_type,
        start_date=start_date,
        end_date=end_date,
    )


@reports_router.get(
    "/members/overview",
    response_model=MemberReportResponse,
    summary="Membership Growth & Distribution Report",
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.RECEPTIONIST]))],
)
def get_membership_report_endpoint(
    filter_type: str = Query("this_month", description="Period filter: 'today', 'this_week', 'this_month', 'this_year', or 'custom'"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD), required if filter_type='custom'"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD), required if filter_type='custom'"),
    db: Session = Depends(get_db),
):
    return service.get_membership_report(
        db=db,
        filter_type=filter_type,
        start_date=start_date,
        end_date=end_date,
    )


@reports_router.get(
    "/bookings/overview",
    response_model=BookingReportResponse,
    summary="Court Utilization & Booking Trends Report",
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.RECEPTIONIST]))],
)
def get_booking_report_endpoint(
    filter_type: str = Query("this_month", description="Period filter: 'today', 'this_week', 'this_month', 'this_year', or 'custom'"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD), required if filter_type='custom'"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD), required if filter_type='custom'"),
    db: Session = Depends(get_db),
):
    return service.get_booking_report(
        db=db,
        filter_type=filter_type,
        start_date=start_date,
        end_date=end_date,
    )


@reports_router.get(
    "/commerce/overview",
    response_model=CommerceReportResponse,
    summary="Commerce Sales & Inventory Health Report",
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.SHOP_STAFF]))],
)
def get_commerce_report_endpoint(
    filter_type: str = Query("this_month", description="Period filter: 'today', 'this_week', 'this_month', 'this_year', or 'custom'"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD), required if filter_type='custom'"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD), required if filter_type='custom'"),
    db: Session = Depends(get_db),
):
    return service.get_commerce_report(
        db=db,
        filter_type=filter_type,
        start_date=start_date,
        end_date=end_date,
    )


@reports_router.get(
    "/hr/overview",
    response_model=HRReportResponse,
    summary="Workforce Attendance & Payroll Report",
    dependencies=[Depends(require_roles([RoleEnum.OWNER, RoleEnum.HR_STAFF]))],
)
def get_hr_report_endpoint(
    filter_type: str = Query("this_month", description="Period filter: 'today', 'this_week', 'this_month', 'this_year', or 'custom'"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD), required if filter_type='custom'"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD), required if filter_type='custom'"),
    db: Session = Depends(get_db),
):
    return service.get_hr_report(
        db=db,
        filter_type=filter_type,
        start_date=start_date,
        end_date=end_date,
    )


@reports_router.get(
    "/tax/summary",
    response_model=TaxReportResponse,
    summary="Output Tax & GST Liability Summary",
    dependencies=[Depends(require_roles([RoleEnum.OWNER]))],
)
def get_tax_report_endpoint(
    filter_type: str = Query("this_month", description="Period filter: 'today', 'this_week', 'this_month', 'this_year', or 'custom'"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD), required if filter_type='custom'"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD), required if filter_type='custom'"),
    db: Session = Depends(get_db),
):
    return service.get_tax_report(
        db=db,
        filter_type=filter_type,
        start_date=start_date,
        end_date=end_date,
    )


@reports_router.get(
    "/export/csv",
    summary="Export Report to CSV File",
    dependencies=[Depends(require_roles([RoleEnum.OWNER]))],
)
def export_report_csv_endpoint(
    report_type: str = Query("dashboard", description="Report type: 'financial', 'membership', 'booking', 'commerce', 'hr', 'tax', or 'dashboard'"),
    filter_type: str = Query("this_month", description="Period filter: 'today', 'this_week', 'this_month', 'this_year', or 'custom'"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD), required if filter_type='custom'"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD), required if filter_type='custom'"),
    db: Session = Depends(get_db),
):
    csv_data = service.export_report_csv(
        report_type=report_type,
        db=db,
        filter_type=filter_type,
        start_date=start_date,
        end_date=end_date,
    )
    clean_type = report_type.strip().lower()
    clean_filter = filter_type.strip().lower()
    filename = f"champions_club_{clean_type}_{clean_filter}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
