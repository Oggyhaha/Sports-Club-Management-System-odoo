from __future__ import annotations

import datetime
from decimal import Decimal
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import (
    Attendance,
    Booking,
    Court,
    Department,
    Designation,
    Employee,
    Invoice,
    Member,
    MembershipPlan,
    MemberSubscription,
    Order,
    OrderItem,
    Payment,
    PaymentAllocation,
    PaymentRefund,
    PayrollDisbursement,
    PayrollEntry,
    PayrollPeriod,
    PayrollRun,
    Product,
    ProductCategory,
)
from tests.conftest import TestingSessionLocal

client = TestClient(app)


# ==============================================================================
# 1. Empty State Reports (Zero Division & Defaults Check)
# ==============================================================================

def test_empty_state_reports(owner_headers):
    # Unified Dashboard
    resp = client.get("/api/v1/reports/dashboard", headers=owner_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["period"]["filter_type"] == "this_month"
    assert data["financials"]["invoices_issued_count"] == 0
    assert data["financials"]["estimated_operating_surplus"] == "0.00"
    assert "surplus_disclaimer" in data["financials"]
    assert data["bookings"]["total_bookings"] == 0
    assert data["bookings"]["overall_court_utilization_percent"] == "0.00"
    assert data["commerce"]["total_orders_count"] == 0
    assert data["tax"]["total_taxable_turnover"] == "0.00"

    # Finance Overview
    resp = client.get("/api/v1/reports/finance/overview", headers=owner_headers)
    assert resp.status_code == 200
    fdata = resp.json()
    assert fdata["financials"]["gross_customer_collections"] == "0.00"
    assert "shop_orders" in fdata["revenue_by_source"]

    # Tax Summary
    resp = client.get("/api/v1/reports/tax/summary", headers=owner_headers)
    assert resp.status_code == 200
    tdata = resp.json()
    assert tdata["total_output_tax_collected"] == "0.00"
    assert "statutory_notice" in tdata


# ==============================================================================
# 2. Period Filters & Validation
# ==============================================================================

def test_period_filters_and_validation(owner_headers):
    today_str = datetime.date.today().isoformat()

    # Valid presets
    for p in ["today", "this_week", "this_month", "this_year"]:
        resp = client.get(f"/api/v1/reports/dashboard?filter_type={p}", headers=owner_headers)
        assert resp.status_code == 200
        assert resp.json()["period"]["filter_type"] == p

    # Valid custom
    resp = client.get(
        f"/api/v1/reports/dashboard?filter_type=custom&start_date={today_str}&end_date={today_str}",
        headers=owner_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["period"]["start_date"] == today_str

    # Invalid custom: missing dates
    resp = client.get("/api/v1/reports/dashboard?filter_type=custom", headers=owner_headers)
    assert resp.status_code == 400
    assert "Both 'start_date' and 'end_date' are required" in resp.json()["detail"]

    # Invalid custom: end_date < start_date
    tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    resp = client.get(
        f"/api/v1/reports/dashboard?filter_type=custom&start_date={tomorrow}&end_date={today_str}",
        headers=owner_headers,
    )
    assert resp.status_code == 400
    assert "end_date cannot be earlier than start_date" in resp.json()["detail"]

    # Invalid preset
    resp = client.get("/api/v1/reports/dashboard?filter_type=last_century", headers=owner_headers)
    assert resp.status_code == 400
    assert "Unsupported filter_type" in resp.json()["detail"]


# ==============================================================================
# 3. Financial Metrics, Allocations & Operating Surplus
# ==============================================================================

def test_financial_metrics_and_surplus(owner_user, owner_headers):
    db = TestingSessionLocal()
    today = datetime.date.today()
    now = datetime.datetime.now(datetime.timezone.utc)
    try:
        # Seed an invoice of 2,000
        inv = Invoice(
            invoice_number=f"INV-TEST-{uuid.uuid4().hex[:6].upper()}",
            issue_date=today,
            due_date=today + datetime.timedelta(days=7),
            subtotal=Decimal("1800.00"),
            tax_amount=Decimal("200.00"),
            total_amount=Decimal("2000.00"),
            amount_paid=Decimal("1000.00"),
            invoice_status="partially_paid",
        )
        db.add(inv)
        db.flush()

        # Seed payment received of 1,500
        pmt = Payment(
            payment_reference=f"PAY-{uuid.uuid4().hex[:6].upper()}",
            amount=Decimal("1500.00"),
            currency="INR",
            payment_method="bank_transfer",
            payment_status="successful",
            recorded_by_id=owner_user.id,
            received_at=now,
        )
        db.add(pmt)
        db.flush()

        # Seed allocation of 1,000 to invoice
        alloc = PaymentAllocation(
            payment_id=pmt.id,
            invoice_id=inv.id,
            allocated_amount=Decimal("1000.00"),
            created_at=now,
        )
        db.add(alloc)

        # Seed refund of 200
        ref = PaymentRefund(
            refund_reference=f"REF-{uuid.uuid4().hex[:6].upper()}",
            payment_id=pmt.id,
            amount=Decimal("200.00"),
            reason="Customer requested partial refund",
            processed_by_id=owner_user.id,
            created_at=now,
        )
        db.add(ref)

        # Seed department, employee, period, run, entry for valid disbursement FK
        dept = Department(name=f"FinDept_{uuid.uuid4().hex[:6]}")
        db.add(dept)
        db.flush()
        desig = Designation(department_id=dept.id, title=f"FinDesig_{uuid.uuid4().hex[:6]}")
        db.add(desig)
        db.flush()
        emp = Employee(
            department_id=dept.id,
            designation_id=desig.id,
            employee_code=f"EMP-{uuid.uuid4().hex[:6].upper()}",
            first_name="Fin",
            last_name="Staff",
            work_email=f"fin_{uuid.uuid4().hex[:6]}@example.com",
            joining_date=today,
            employment_status="active",
            employment_type="full_time",
        )
        db.add(emp)
        db.flush()
        period = PayrollPeriod(
            period_name="November 2026",
            start_date=today,
            end_date=today,
        )
        db.add(period)
        db.flush()
        prun = PayrollRun(
            payroll_period_id=period.id,
            run_number=f"RUN-{uuid.uuid4().hex[:6].upper()}",
            status="processed",
            total_gross=Decimal("1000.00"),
            total_deductions=Decimal("0.00"),
            total_net=Decimal("1000.00"),
            processed_by_id=owner_user.id,
        )
        db.add(prun)
        db.flush()
        pentry = PayrollEntry(
            payroll_run_id=prun.id,
            employee_id=emp.id,
            employee_name_snapshot="Fin Staff",
            employee_code_snapshot=emp.employee_code,
            department_snapshot="Finance",
            designation_snapshot="Accountant",
            gross_earnings=Decimal("1000.00"),
            total_deductions=Decimal("0.00"),
            net_payable=Decimal("1000.00"),
            amount_disbursed=Decimal("500.00"),
            payment_status="partially_paid",
        )
        db.add(pentry)
        db.flush()

        # Seed operating expense (payroll disbursement of 500)
        disb = PayrollDisbursement(
            payroll_entry_id=pentry.id,
            amount=Decimal("500.00"),
            disbursement_date=today,
            disbursement_method="bank_transfer",
            disbursement_reference="DISB-1001",
            disbursed_by_id=owner_user.id,
        )
        db.add(disb)
        db.commit()

        # Net cash collections = 1500 - 200 = 1300
        # Outstanding receivables = 2000 - 1000 = 1000
        # Operating expenses = 500
        # Operating surplus = 1300 - 500 = 800
        # Unallocated customer balance = 1500 - 1000 - 200 = 300

        resp = client.get("/api/v1/reports/finance/overview?filter_type=today", headers=owner_headers)
        assert resp.status_code == 200
        fin = resp.json()["financials"]

        assert fin["invoices_issued_count"] == 1
        assert fin["invoices_issued_value"] == "2000.00"
        assert fin["outstanding_receivables"] == "1000.00"
        assert fin["payments_received_count"] == 1
        assert fin["gross_customer_collections"] == "1500.00"
        assert fin["customer_refunds_count"] == 1
        assert fin["customer_refunds_value"] == "200.00"
        assert fin["net_customer_collections"] == "1300.00"
        assert fin["net_allocated_value"] == "1000.00"
        assert fin["unallocated_customer_balance"] == "300.00"
        assert fin["payroll_disbursements_count"] == 1
        assert fin["recorded_operating_expenses"] == "500.00"
        assert fin["estimated_operating_surplus"] == "800.00"
    finally:
        db.close()


# ==============================================================================
# 4. Membership Overview & Renewal Tracking
# ==============================================================================

def test_membership_report_metrics(receptionist_headers):
    db = TestingSessionLocal()
    today = datetime.date.today()
    now = datetime.datetime.now(datetime.timezone.utc)
    try:
        gold_plan = db.query(MembershipPlan).filter(MembershipPlan.name == "Gold").first()
        assert gold_plan is not None

        # Member 1: Active, expiring in 10 days
        m1 = Member(
            full_name="Active Member",
            email=f"m1_{uuid.uuid4().hex[:6]}@example.com",
            phone="9876543210",
            plan_id=gold_plan.id,
            start_date=today - datetime.timedelta(days=20),
            expiry_date=today + datetime.timedelta(days=10),
            is_active=True,
            created_at=now,
        )
        db.add(m1)
        db.flush()

        # Prior sub + renewal sub for m1
        sub1 = MemberSubscription(
            member_id=m1.id,
            plan_id=gold_plan.id,
            start_date=today - datetime.timedelta(days=50),
            end_date=today - datetime.timedelta(days=20),
            subscription_status="expired",
            price_paid=Decimal("1500.00"),
            plan_name_snapshot="Gold",
            duration_days_snapshot=30,
            court_discount_snapshot=Decimal("15.00"),
            shop_discount_snapshot=Decimal("10.00"),
            bar_discount_snapshot=Decimal("10.00"),
            created_at=now - datetime.timedelta(days=50),
        )
        db.add(sub1)
        sub2 = MemberSubscription(
            member_id=m1.id,
            plan_id=gold_plan.id,
            start_date=today - datetime.timedelta(days=20),
            end_date=today + datetime.timedelta(days=10),
            subscription_status="active",
            price_paid=Decimal("1500.00"),
            plan_name_snapshot="Gold",
            duration_days_snapshot=30,
            court_discount_snapshot=Decimal("15.00"),
            shop_discount_snapshot=Decimal("10.00"),
            bar_discount_snapshot=Decimal("10.00"),
            created_at=now,
        )
        db.add(sub2)

        # Member 2: Inactive
        m2 = Member(
            full_name="Inactive Member",
            email=f"m2_{uuid.uuid4().hex[:6]}@example.com",
            phone="9876543211",
            plan_id=gold_plan.id,
            start_date=today - datetime.timedelta(days=100),
            expiry_date=today - datetime.timedelta(days=10),
            is_active=False,
            created_at=now - datetime.timedelta(days=100),
        )
        db.add(m2)
        db.commit()

        resp = client.get("/api/v1/reports/members/overview?filter_type=this_month", headers=receptionist_headers)
        assert resp.status_code == 200
        data = resp.json()

        assert data["memberships"]["active_members"] >= 1
        assert data["memberships"]["inactive_members"] >= 1
        assert data["memberships"]["renewals_in_period"] >= 1
        assert data["expiring_soon_count"] >= 1
        # Gold plan has active members
        gold_dist = next(p for p in data["memberships"]["plan_distribution"] if p["plan_name"] == "Gold")
        assert gold_dist["active_member_count"] >= 1
    finally:
        db.close()


# ==============================================================================
# 5. Court Utilization & Peak Hours
# ==============================================================================

def test_court_utilization_and_peak_hours(receptionist_headers):
    db = TestingSessionLocal()
    today = datetime.date.today()
    try:
        c1 = db.query(Court).filter(Court.name == "Tennis Court 1").first()
        assert c1 is not None

        plan = db.query(MembershipPlan).first()
        mem = Member(
            full_name="Test Booking Member",
            email=f"bk_{uuid.uuid4().hex[:6]}@example.com",
            plan_id=plan.id,
            start_date=today,
            expiry_date=today + datetime.timedelta(days=30),
            is_active=True,
        )
        db.add(mem)
        db.flush()

        # Create 1 walk-in booking and 2 member bookings (1 confirmed, 1 cancelled) today
        # Local 18:00 (Kolkata is UTC+5:30 -> 12:30 UTC)
        start_utc_1 = datetime.datetime.combine(today, datetime.time(12, 30), tzinfo=datetime.timezone.utc)
        end_utc_1 = start_utc_1 + datetime.timedelta(hours=1)

        b1 = Booking(
            court_id=c1.id,
            start_time=start_utc_1,
            end_time=end_utc_1,
            status="confirmed",
            walk_in_name="Walkin User",
        )
        db.add(b1)

        # Local 19:00 (13:30 UTC) - Confirmed Member Booking
        start_utc_2 = datetime.datetime.combine(today, datetime.time(13, 30), tzinfo=datetime.timezone.utc)
        end_utc_2 = start_utc_2 + datetime.timedelta(hours=1)
        b2 = Booking(
            court_id=c1.id,
            member_id=mem.id,
            start_time=start_utc_2,
            end_time=end_utc_2,
            status="confirmed",
        )
        db.add(b2)

        # Cancelled Member Booking
        b3 = Booking(
            court_id=c1.id,
            member_id=mem.id,
            start_time=start_utc_2,
            end_time=end_utc_2,
            status="cancelled",
        )
        db.add(b3)
        db.commit()

        resp = client.get("/api/v1/reports/bookings/overview?filter_type=today", headers=receptionist_headers)
        assert resp.status_code == 200
        bdata = resp.json()["bookings"]

        assert bdata["total_bookings"] == 3
        assert bdata["confirmed_bookings"] == 2
        assert bdata["cancelled_bookings"] == 1
        assert Decimal(bdata["cancellation_rate_percent"]) == Decimal("33.33")
        assert bdata["walk_in_bookings"] == 1
        assert Decimal(bdata["total_booked_hours"]) == Decimal("2.00")
        assert len(bdata["peak_hours"]) >= 1
    finally:
        db.close()


# ==============================================================================
# 6. Commerce Overview & Low Stock Alerts
# ==============================================================================

def test_commerce_overview_and_low_stock(shop_staff_headers):
    db = TestingSessionLocal()
    now = datetime.datetime.now(datetime.timezone.utc)
    try:
        cat = ProductCategory(name=f"Gear_{uuid.uuid4().hex[:6]}", module_type="shop")
        db.add(cat)
        db.flush()

        # Product 1: Low Stock Alert
        p1 = Product(
            category_id=cat.id,
            name="Tennis Ball Can",
            sku=f"TB-{uuid.uuid4().hex[:6].upper()}",
            module_type="shop",
            unit_price=Decimal("300.00"),
            tax_rate=Decimal("12.00"),
            current_stock=2,
            reorder_threshold=5,
            inventory_tracked=True,
            is_active=True,
        )
        db.add(p1)

        # Product 2: Normal Stock
        p2 = Product(
            category_id=cat.id,
            name="Grip Tape",
            sku=f"GT-{uuid.uuid4().hex[:6].upper()}",
            module_type="shop",
            unit_price=Decimal("150.00"),
            tax_rate=Decimal("12.00"),
            current_stock=50,
            reorder_threshold=10,
            inventory_tracked=True,
            is_active=True,
        )
        db.add(p2)
        db.flush()

        # Order for p1 (3 cans sold)
        order = Order(
            order_number=f"ORD-{uuid.uuid4().hex[:6].upper()}",
            order_type="shop",
            customer_type="walk_in",
            order_status="completed",
            payment_status="paid",
            subtotal=Decimal("900.00"),
            tax_amount=Decimal("108.00"),
            discount_amount=Decimal("0.00"),
            total_amount=Decimal("1008.00"),
            created_at=now,
        )
        db.add(order)
        db.flush()

        oi = OrderItem(
            order_id=order.id,
            product_id=p1.id,
            product_name_snapshot="Tennis Ball Can",
            sku_snapshot=p1.sku,
            quantity=3,
            unit_price_snapshot=Decimal("300.00"),
            discount_percent_snapshot=Decimal("0.00"),
            discount_amount_snapshot=Decimal("0.00"),
            tax_rate_snapshot=Decimal("12.00"),
            tax_amount_snapshot=Decimal("108.00"),
            line_subtotal=Decimal("900.00"),
            line_total=Decimal("1008.00"),
        )
        db.add(oi)
        db.commit()

        resp = client.get("/api/v1/reports/commerce/overview?filter_type=today", headers=shop_staff_headers)
        assert resp.status_code == 200
        cdata = resp.json()["commerce"]

        assert cdata["total_orders_count"] == 1
        assert cdata["shop_orders_count"] == 1
        assert cdata["completed_orders_value"] == "1008.00"
        assert cdata["low_stock_alerts_count"] == 1
        assert cdata["low_stock_products"][0]["product_id"] == str(p1.id)
        assert len(cdata["top_selling_products"]) == 1
        assert cdata["top_selling_products"][0]["total_units_sold"] == 3
    finally:
        db.close()


# ==============================================================================
# 7. HR & Workforce Overview
# ==============================================================================

def test_hr_and_payroll_overview(hr_staff_headers):
    db = TestingSessionLocal()
    today = datetime.date.today()
    now = datetime.datetime.now(datetime.timezone.utc)
    try:
        dept = Department(name=f"Coaching_{uuid.uuid4().hex[:6]}")
        db.add(dept)
        db.flush()

        desig = Designation(department_id=dept.id, title=f"Head Coach_{uuid.uuid4().hex[:6]}")
        db.add(desig)
        db.flush()

        emp = Employee(
            department_id=dept.id,
            designation_id=desig.id,
            employee_code=f"EMP-{uuid.uuid4().hex[:6].upper()}",
            first_name="Roger",
            last_name="Federer",
            work_email=f"roger_{uuid.uuid4().hex[:6]}@champions.club",
            joining_date=today,
            employment_status="active",
            employment_type="full_time",
        )
        db.add(emp)
        db.flush()

        att = Attendance(
            employee_id=emp.id,
            attendance_date=today,
            check_in=now,
            check_out=now + datetime.timedelta(hours=8),
            status="present",
        )
        db.add(att)
        db.commit()

        resp = client.get("/api/v1/reports/hr/overview?filter_type=today", headers=hr_staff_headers)
        assert resp.status_code == 200
        hdata = resp.json()["hr"]

        assert hdata["total_employees"] >= 1
        assert hdata["active_employees"] >= 1
        assert hdata["attendance_records_count"] >= 1
        assert hdata["present_records_count"] >= 1
    finally:
        db.close()


# ==============================================================================
# 8. Tax Deduplication Check (Orders vs Direct Invoices)
# ==============================================================================

def test_tax_summary_and_deduplication(owner_headers):
    db = TestingSessionLocal()
    today = datetime.date.today()
    now = datetime.datetime.now(datetime.timezone.utc)
    try:
        # 1. Retail order with 50 tax
        order = Order(
            order_number=f"ORD-TAX-{uuid.uuid4().hex[:6].upper()}",
            order_type="shop",
            customer_type="walk_in",
            order_status="completed",
            payment_status="paid",
            subtotal=Decimal("500.00"),
            tax_amount=Decimal("50.00"),
            discount_amount=Decimal("0.00"),
            total_amount=Decimal("550.00"),
            created_at=now,
        )
        db.add(order)
        db.flush()

        # 2. Invoice created FOR the order above (has order_id)
        inv_order = Invoice(
            invoice_number=f"INV-ORD-{uuid.uuid4().hex[:6].upper()}",
            order_id=order.id,
            issue_date=today,
            due_date=today,
            subtotal=Decimal("500.00"),
            tax_amount=Decimal("50.00"),
            total_amount=Decimal("550.00"),
            amount_paid=Decimal("550.00"),
            invoice_status="paid",
        )
        db.add(inv_order)

        # 3. Direct non-order invoice with 30 tax (order_id is NULL)
        inv_direct = Invoice(
            invoice_number=f"INV-DIR-{uuid.uuid4().hex[:6].upper()}",
            order_id=None,
            issue_date=today,
            due_date=today,
            subtotal=Decimal("300.00"),
            tax_amount=Decimal("30.00"),
            total_amount=Decimal("330.00"),
            amount_paid=Decimal("330.00"),
            invoice_status="paid",
        )
        db.add(inv_direct)
        db.commit()

        # Correct Output Tax must be: 50 (order) + 30 (direct invoice) = 80.00
        # If invoice_order was also counted, it would erroneously be 130.00!
        resp = client.get("/api/v1/reports/tax/summary?filter_type=today", headers=owner_headers)
        assert resp.status_code == 200
        tdata = resp.json()

        assert tdata["commerce_tax"]["tax_collected"] == "50.00"
        assert tdata["direct_invoicing_tax"]["tax_collected"] == "30.00"
        assert tdata["total_output_tax_collected"] == "80.00"
        assert tdata["total_taxable_turnover"] == "800.00"
    finally:
        db.close()


# ==============================================================================
# 9. RBAC Enforcement Across All Reporting Endpoints
# ==============================================================================

def test_rbac_reporting_endpoints(
    owner_headers,
    receptionist_headers,
    shop_staff_headers,
    hr_staff_headers,
    member_headers,
    business_client_headers,
):
    # Owner has unrestricted access to everything
    assert client.get("/api/v1/reports/dashboard", headers=owner_headers).status_code == 200
    assert client.get("/api/v1/reports/finance/overview", headers=owner_headers).status_code == 200
    assert client.get("/api/v1/reports/members/overview", headers=owner_headers).status_code == 200
    assert client.get("/api/v1/reports/bookings/overview", headers=owner_headers).status_code == 200
    assert client.get("/api/v1/reports/commerce/overview", headers=owner_headers).status_code == 200
    assert client.get("/api/v1/reports/hr/overview", headers=owner_headers).status_code == 200
    assert client.get("/api/v1/reports/tax/summary", headers=owner_headers).status_code == 200
    assert client.get("/api/v1/reports/export/csv?report_type=dashboard", headers=owner_headers).status_code == 200

    # Receptionist: members + bookings only
    assert client.get("/api/v1/reports/members/overview", headers=receptionist_headers).status_code == 200
    assert client.get("/api/v1/reports/bookings/overview", headers=receptionist_headers).status_code == 200
    assert client.get("/api/v1/reports/dashboard", headers=receptionist_headers).status_code == 403
    assert client.get("/api/v1/reports/finance/overview", headers=receptionist_headers).status_code == 403
    assert client.get("/api/v1/reports/tax/summary", headers=receptionist_headers).status_code == 403

    # Shop Staff: commerce only
    assert client.get("/api/v1/reports/commerce/overview", headers=shop_staff_headers).status_code == 200
    assert client.get("/api/v1/reports/dashboard", headers=shop_staff_headers).status_code == 403
    assert client.get("/api/v1/reports/hr/overview", headers=shop_staff_headers).status_code == 403

    # HR Staff: HR only
    assert client.get("/api/v1/reports/hr/overview", headers=hr_staff_headers).status_code == 200
    assert client.get("/api/v1/reports/dashboard", headers=hr_staff_headers).status_code == 403
    assert client.get("/api/v1/reports/finance/overview", headers=hr_staff_headers).status_code == 403

    # Member: Forbidden from all reports
    assert client.get("/api/v1/reports/dashboard", headers=member_headers).status_code == 403
    assert client.get("/api/v1/reports/finance/overview", headers=member_headers).status_code == 403
    assert client.get("/api/v1/reports/members/overview", headers=member_headers).status_code == 403
    assert client.get("/api/v1/reports/bookings/overview", headers=member_headers).status_code == 403
    assert client.get("/api/v1/reports/commerce/overview", headers=member_headers).status_code == 403
    assert client.get("/api/v1/reports/hr/overview", headers=member_headers).status_code == 403
    assert client.get("/api/v1/reports/tax/summary", headers=member_headers).status_code == 403

    # Business Client: Forbidden from all reports
    assert client.get("/api/v1/reports/dashboard", headers=business_client_headers).status_code == 403
    assert client.get("/api/v1/reports/finance/overview", headers=business_client_headers).status_code == 403


# ==============================================================================
# 10. CSV Export Capabilities
# ==============================================================================

def test_csv_export_endpoint(owner_headers):
    # Financial CSV
    resp = client.get("/api/v1/reports/export/csv?report_type=financial&filter_type=this_month", headers=owner_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert "CHAMPIONS CLUB - FINANCIAL REPORT" in resp.text
    assert "Estimated Operating Surplus" in resp.text

    # Dashboard CSV
    resp = client.get("/api/v1/reports/export/csv?report_type=dashboard&filter_type=today", headers=owner_headers)
    assert resp.status_code == 200
    assert "CHAMPIONS CLUB - UNIFIED OWNER DASHBOARD" in resp.text

    # Tax CSV
    resp = client.get("/api/v1/reports/export/csv?report_type=tax&filter_type=this_year", headers=owner_headers)
    assert resp.status_code == 200
    assert "CHAMPIONS CLUB - TAX SUMMARY REPORT" in resp.text

    # Invalid report_type
    resp = client.get("/api/v1/reports/export/csv?report_type=unknown_type", headers=owner_headers)
    assert resp.status_code == 400
    assert "Unsupported report_type" in resp.json()["detail"]
