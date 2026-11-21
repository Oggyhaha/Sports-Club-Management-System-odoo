import threading
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.core.jwt import create_access_token
from app.core.security import hash_password
from app.main import app
from app.models import (
    BusinessClient,
    Invoice,
    Member,
    MembershipPlan,
    MemberSubscription,
    Order,
    OrderItem,
    Payment,
    PaymentAllocation,
    PaymentAllocationReversal,
    PaymentReceipt,
    PaymentRefund,
    Product,
    ProductCategory,
    Role,
    RoleEnum,
    User,
)

client = TestClient(app)


# ---------------------------------------------------------------------------
# Test Helpers
# ---------------------------------------------------------------------------
def _create_test_business_client(owner_headers, user_id=None):
    uid = uuid.uuid4().hex[:6]
    resp = client.post(
        "/api/v1/business-clients",
        headers=owner_headers,
        json={
            "company_name": f"Corporate Titans {uid}",
            "contact_person": "Jane Titan",
            "email": f"biz_{uid}@corporatetitans.com",
            "phone": "9876543210",
            "billing_address": "Tech Park Tower 3, Bengaluru",
            "tax_id_gstin": f"29ABCDE{uid.upper()}1Z5",
            "user_id": str(user_id) if user_id else None,
        },
    )
    assert resp.status_code == 201
    return resp.json()


def _create_test_order(shop_staff_headers, owner_headers):
    # Setup category and product
    cat_resp = client.post(
        "/api/v1/shop/categories",
        headers=owner_headers,
        json={"name": f"FinCat-{uuid.uuid4().hex[:6]}", "module_type": "shop"},
    )
    cat_id = cat_resp.json()["id"]

    prod_resp = client.post(
        "/api/v1/shop/products",
        headers=owner_headers,
        json={
            "name": "Finance Tennis Ball",
            "category_id": cat_id,
            "module_type": "shop",
            "unit_price": "50.00",
            "tax_rate": "10.00",
            "initial_stock": 20,
        },
    )
    prod_id = prod_resp.json()["id"]

    # Place walk-in order
    order_resp = client.post(
        "/api/v1/shop/orders",
        headers=shop_staff_headers,
        json={
            "customer_type": "walk_in",
            "walk_in_name": "Finance Walkin",
            "items": [{"product_id": prod_id, "quantity": 2}],
        },
    )
    assert order_resp.status_code == 201
    return order_resp.json()


def _create_test_member_and_subscription(owner_headers):
    db = SessionLocal()
    try:
        uid = uuid.uuid4().hex[:6]
        user = User(
            email=f"fin_mem_{uid}@example.com",
            hashed_password=hash_password("Pass123!"),
            full_name=f"Finance Member {uid}",
            is_active=True,
            token_version=1,
        )
        mem_role = db.query(Role).filter(Role.name == RoleEnum.MEMBER.value).first()
        user.roles.append(mem_role)
        db.add(user)
        db.flush()

        plan = db.query(MembershipPlan).filter(MembershipPlan.name == "Gold").first()
        today = date.today()
        member = Member(
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            plan_id=plan.id,
            start_date=today,
            expiry_date=today + timedelta(days=30),
            is_active=True,
        )
        db.add(member)
        db.flush()

        sub = MemberSubscription(
            member_id=member.id,
            plan_id=plan.id,
            start_date=member.start_date,
            end_date=member.expiry_date,
            price_paid=Decimal("150.00"),
            plan_name_snapshot=plan.name,
            duration_days_snapshot=30,
            court_discount_snapshot=Decimal("20.00"),
            shop_discount_snapshot=Decimal("15.00"),
            bar_discount_snapshot=Decimal("10.00"),
            subscription_status="active",
            payment_status="unpaid",
        )
        db.add(sub)
        db.commit()

        sub_id = sub.id
        member_id = member.id
        user_id = user.id
        token = create_access_token(user_id=user.id, token_version=user.token_version)
        headers = {"Authorization": f"Bearer {token}"}
        return user_id, member_id, sub_id, headers
    finally:
        db.close()


# ---------------------------------------------------------------------------
# 1. Business Client Management Tests
# ---------------------------------------------------------------------------
def test_business_client_crud_and_isolation(owner_headers, business_client_headers, business_client_user):
    # 1. Owner creates business client linked to business_client_user
    biz_client = _create_test_business_client(owner_headers, user_id=business_client_user.id)
    assert biz_client["company_name"].startswith("Corporate Titans")
    assert biz_client["user_id"] == str(business_client_user.id)

    # 2. Business client accesses their own profile via /me
    me_resp = client.get("/api/v1/business-clients/me", headers=business_client_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["id"] == biz_client["id"]

    # 3. Create a second business client not linked to business_client_user
    biz_client_2 = _create_test_business_client(owner_headers)

    # 4. Business client 1 cannot access Business client 2's profile (403)
    unauth_resp = client.get(f"/api/v1/business-clients/{biz_client_2['id']}", headers=business_client_headers)
    assert unauth_resp.status_code == 403


# ---------------------------------------------------------------------------
# 2. Invoice Source & Customer Integrity Tests
# ---------------------------------------------------------------------------
def test_invoice_creation_from_shop_order(owner_headers, shop_staff_headers):
    order = _create_test_order(shop_staff_headers, owner_headers)

    # Create invoice from order
    inv_resp = client.post(
        "/api/v1/invoices",
        headers=shop_staff_headers,
        json={
            "order_id": order["id"],
            "due_date": (date.today() + timedelta(days=7)).isoformat(),
            "notes": "Invoice for walkin pro-shop sale",
        },
    )
    assert inv_resp.status_code == 201
    inv = inv_resp.json()
    assert inv["invoice_number"].startswith("INV-")
    assert inv["order_id"] == order["id"]
    assert Decimal(str(inv["total_amount"])) == Decimal(str(order["total_amount"]))
    assert Decimal(str(inv["amount_paid"])) == Decimal("0.00")
    assert inv["invoice_status"] == "issued"


def test_invoice_mutual_exclusivity_enforced(owner_headers, shop_staff_headers):
    order = _create_test_order(shop_staff_headers, owner_headers)
    _, _, sub_id, _ = _create_test_member_and_subscription(owner_headers)

    # Cannot reference BOTH order_id and subscription_id
    bad_resp = client.post(
        "/api/v1/invoices",
        headers=owner_headers,
        json={
            "order_id": order["id"],
            "subscription_id": str(sub_id),
            "due_date": (date.today() + timedelta(days=7)).isoformat(),
        },
    )
    assert bad_resp.status_code == 400
    assert "simultaneously reference both" in bad_resp.json()["detail"].lower()


def test_direct_custom_invoice_with_items(owner_headers):
    biz_client = _create_test_business_client(owner_headers)

    inv_resp = client.post(
        "/api/v1/invoices",
        headers=owner_headers,
        json={
            "business_client_id": biz_client["id"],
            "due_date": (date.today() + timedelta(days=14)).isoformat(),
            "items": [
                {
                    "description": "Corporate Tennis Court Rental (Full Day)",
                    "quantity": 1,
                    "unit_price": "5000.00",
                    "tax_amount": "900.00",
                },
                {
                    "description": "Equipment Bundle",
                    "quantity": 2,
                    "unit_price": "1000.00",
                    "tax_amount": "360.00",
                },
            ],
        },
    )
    assert inv_resp.status_code == 201
    inv = inv_resp.json()
    # 5000 + 2000 = 7000 subtotal; 900 + 360 = 1260 tax; total = 8260.00
    assert Decimal(str(inv["subtotal"])) == Decimal("7000.00")
    assert Decimal(str(inv["tax_amount"])) == Decimal("1260.00")
    assert Decimal(str(inv["total_amount"])) == Decimal("8260.00")
    assert len(inv["items"]) == 2


# ---------------------------------------------------------------------------
# 3. Payment Recording & Idempotency Tests
# ---------------------------------------------------------------------------
def test_payment_recording_and_idempotency_replay(owner_headers, shop_staff_headers):
    idempotency_key = f"IDEM-{uuid.uuid4().hex[:12]}"

    # Step 1: Record payment
    p1 = client.post(
        "/api/v1/payments",
        headers=shop_staff_headers,
        json={
            "amount": "2500.00",
            "payment_method": "upi",
            "external_reference": "UPI-UTR-9988776655",
            "idempotency_key": idempotency_key,
        },
    )
    assert p1.status_code == 201
    pmt_data = p1.json()
    assert pmt_data["payment_status"] == "successful"
    assert Decimal(str(pmt_data["amount"])) == Decimal("2500.00")

    # Receipt was generated automatically for successful payment
    receipts_resp = client.get("/api/v1/receipts", headers=shop_staff_headers)
    assert receipts_resp.status_code == 200
    assert any(r["payment_id"] == pmt_data["id"] for r in receipts_resp.json())

    # Step 2: Idempotent replay with same idempotency key returns identical record
    p2 = client.post(
        "/api/v1/payments",
        headers=shop_staff_headers,
        json={
            "amount": "2500.00",
            "payment_method": "upi",
            "external_reference": "UPI-UTR-9988776655",
            "idempotency_key": idempotency_key,
        },
    )
    assert p2.status_code in (200, 201)
    assert p2.json()["id"] == pmt_data["id"]


# ---------------------------------------------------------------------------
# 4. Payment Allocation & Over-Payment Prevention Tests
# ---------------------------------------------------------------------------
def test_payment_allocation_lifecycle_and_overpayment_prevention(owner_headers, shop_staff_headers):
    biz = _create_test_business_client(owner_headers)

    # Create Invoice for ₹1,000
    inv = client.post(
        "/api/v1/invoices",
        headers=owner_headers,
        json={
            "business_client_id": biz["id"],
            "due_date": (date.today() + timedelta(days=7)).isoformat(),
            "items": [{"description": "Monthly Net Usage", "quantity": 1, "unit_price": "1000.00"}],
        },
    ).json()

    # Record Payment of ₹1,500
    pmt = client.post(
        "/api/v1/payments",
        headers=shop_staff_headers,
        json={"amount": "1500.00", "payment_method": "bank_transfer"},
    ).json()

    # Step 1: Partial allocation of ₹400
    alloc1 = client.post(
        f"/api/v1/payments/{pmt['id']}/allocations",
        headers=shop_staff_headers,
        json={"invoice_id": inv["id"], "amount": "400.00"},
    )
    assert alloc1.status_code == 201

    # Check invoice status: partially_paid, paid = 400, outstanding = 600
    bal1 = client.get(f"/api/v1/invoices/{inv['id']}/balance", headers=shop_staff_headers).json()
    assert bal1["invoice_status"] == "partially_paid"
    assert Decimal(str(bal1["amount_paid"])) == Decimal("400.00")
    assert Decimal(str(bal1["outstanding_amount"])) == Decimal("600.00")

    # Step 2: Attempting to allocate ₹800 (exceeds invoice outstanding balance of ₹600) -> 409 Conflict
    bad_alloc = client.post(
        f"/api/v1/payments/{pmt['id']}/allocations",
        headers=shop_staff_headers,
        json={"invoice_id": inv["id"], "amount": "800.00"},
    )
    assert bad_alloc.status_code == 409
    assert "exceeds invoice outstanding balance" in bad_alloc.json()["detail"].lower()

    # Step 3: Complete allocation with exact remaining ₹600
    alloc2 = client.post(
        f"/api/v1/payments/{pmt['id']}/allocations",
        headers=shop_staff_headers,
        json={"invoice_id": inv["id"], "amount": "600.00"},
    )
    assert alloc2.status_code == 201

    # Invoice is now fully PAID
    bal2 = client.get(f"/api/v1/invoices/{inv['id']}/balance", headers=shop_staff_headers).json()
    assert bal2["invoice_status"] == "paid"
    assert Decimal(str(bal2["amount_paid"])) == Decimal("1000.00")
    assert Decimal(str(bal2["outstanding_amount"])) == Decimal("0.00")


# ---------------------------------------------------------------------------
# 5. Amount-Based Allocation Reversal Tests (Correction #2)
# ---------------------------------------------------------------------------
def test_amount_based_allocation_reversal(owner_headers, shop_staff_headers):
    """
    Verifies Correction #2:
    An original ₹1,000 allocation followed by a ₹400 reversal must result in
    ₹600 net allocated and ₹400 outstanding!
    """
    biz = _create_test_business_client(owner_headers)
    inv = client.post(
        "/api/v1/invoices",
        headers=owner_headers,
        json={
            "business_client_id": biz["id"],
            "due_date": (date.today() + timedelta(days=7)).isoformat(),
            "items": [{"description": "Court Booking Fee", "quantity": 1, "unit_price": "1000.00"}],
        },
    ).json()

    pmt = client.post(
        "/api/v1/payments",
        headers=shop_staff_headers,
        json={"amount": "1000.00", "payment_method": "card"},
    ).json()

    # Fully allocate ₹1,000 -> Invoice is paid
    alloc = client.post(
        f"/api/v1/payments/{pmt['id']}/allocations",
        headers=shop_staff_headers,
        json={"invoice_id": inv["id"], "amount": "1000.00"},
    ).json()
    alloc_id = alloc["id"]

    # Partial Reversal of ₹400
    rev_resp = client.post(
        f"/api/v1/allocations/{alloc_id}/reverse",
        headers=owner_headers,
        json={"amount": "400.00", "reason": "Customer dispute adjustment"},
    )
    assert rev_resp.status_code == 201
    reversal = rev_resp.json()
    assert Decimal(str(reversal["amount"])) == Decimal("400.00")

    # Authoritative balance verification:
    # Net paid must be ₹600.00, outstanding must be ₹400.00, status must revert to partially_paid!
    bal = client.get(f"/api/v1/invoices/{inv['id']}/balance", headers=shop_staff_headers).json()
    assert bal["invoice_status"] == "partially_paid"
    assert Decimal(str(bal["amount_paid"])) == Decimal("600.00")
    assert Decimal(str(bal["outstanding_amount"])) == Decimal("400.00")


# ---------------------------------------------------------------------------
# 6. Refund Tests & Immutable Audit Ledger
# ---------------------------------------------------------------------------
def test_payment_refund_lifecycle(owner_headers, shop_staff_headers):
    # Record payment of ₹500
    pmt = client.post(
        "/api/v1/payments",
        headers=shop_staff_headers,
        json={"amount": "500.00", "payment_method": "cash"},
    ).json()

    # Process partial refund of ₹200
    ref1 = client.post(
        f"/api/v1/payments/{pmt['id']}/refund",
        headers=owner_headers,
        json={"amount": "200.00", "reason": "Accidental overcharge refund"},
    )
    assert ref1.status_code == 201
    assert ref1.json()["refund_reference"].startswith("REF-")

    # Payment status is now partially_refunded
    p_check = client.get(f"/api/v1/payments/{pmt['id']}", headers=shop_staff_headers).json()
    assert p_check["payment_status"] == "partially_refunded"
    assert Decimal(str(p_check["unallocated_amount"])) == Decimal("300.00")

    # Attempting to refund ₹400 (exceeds remaining ₹300) -> 400 Bad Request
    bad_ref = client.post(
        f"/api/v1/payments/{pmt['id']}/refund",
        headers=owner_headers,
        json={"amount": "400.00", "reason": "Over refund"},
    )
    assert bad_ref.status_code == 400


# ---------------------------------------------------------------------------
# 7. Membership & Order Financial Integration Tests
# ---------------------------------------------------------------------------
def test_membership_subscription_invoice_and_payment_sync(owner_headers, shop_staff_headers):
    user_id, member_id, sub_id, mem_headers = _create_test_member_and_subscription(owner_headers)

    # 1. Create invoice for the subscription
    inv_resp = client.post(
        "/api/v1/invoices",
        headers=shop_staff_headers,
        json={
            "subscription_id": str(sub_id),
            "due_date": (date.today() + timedelta(days=7)).isoformat(),
        },
    )
    assert inv_resp.status_code == 201
    inv = inv_resp.json()
    assert Decimal(str(inv["total_amount"])) == Decimal("150.00")

    # 2. Record payment and allocate
    pmt = client.post(
        "/api/v1/payments",
        headers=shop_staff_headers,
        json={"amount": "150.00", "payment_method": "upi"},
    ).json()

    client.post(
        f"/api/v1/payments/{pmt['id']}/allocations",
        headers=shop_staff_headers,
        json={"invoice_id": inv["id"], "amount": "150.00"},
    )

    # 3. Verify subscription.payment_status synced to 'paid' in DB!
    db = SessionLocal()
    try:
        sub = db.get(MemberSubscription, sub_id)
        assert sub.payment_status == "paid"
    finally:
        db.close()


def test_shop_order_invoice_and_payment_sync(owner_headers, shop_staff_headers):
    order = _create_test_order(shop_staff_headers, owner_headers)

    # 1. Create invoice
    inv = client.post(
        "/api/v1/invoices",
        headers=shop_staff_headers,
        json={
            "order_id": order["id"],
            "due_date": (date.today() + timedelta(days=3)).isoformat(),
        },
    ).json()

    # 2. Pay invoice
    pmt = client.post(
        "/api/v1/payments",
        headers=shop_staff_headers,
        json={"amount": str(order["total_amount"]), "payment_method": "cash"},
    ).json()

    client.post(
        f"/api/v1/payments/{pmt['id']}/allocations",
        headers=shop_staff_headers,
        json={"invoice_id": inv["id"], "amount": str(order["total_amount"])},
    )

    # 3. Verify order.payment_status synced to 'paid' in DB!
    db = SessionLocal()
    try:
        ord_db = db.get(Order, order["id"])
        assert ord_db.payment_status == "paid"
    finally:
        db.close()


# ---------------------------------------------------------------------------
# 8. Concurrency & Security Tests
# ---------------------------------------------------------------------------
def test_concurrent_payment_allocations_cannot_overallocate(owner_headers, shop_staff_headers):
    """
    Two concurrent allocations attempt to claim the last ₹500 on an invoice of ₹500.
    PostgreSQL row-level locking ensures exactly one succeeds and one is rejected with 409.
    """
    biz = _create_test_business_client(owner_headers)
    inv = client.post(
        "/api/v1/invoices",
        headers=owner_headers,
        json={
            "business_client_id": biz["id"],
            "due_date": (date.today() + timedelta(days=7)).isoformat(),
            "items": [{"description": "Single Event Ticket", "quantity": 1, "unit_price": "500.00"}],
        },
    ).json()

    pmt = client.post(
        "/api/v1/payments",
        headers=shop_staff_headers,
        json={"amount": "1000.00", "payment_method": "bank_transfer"},
    ).json()

    results = []

    def allocate():
        resp = client.post(
            f"/api/v1/payments/{pmt['id']}/allocations",
            headers=shop_staff_headers,
            json={"invoice_id": inv["id"], "amount": "500.00"},
        )
        results.append(resp.status_code)

    t1 = threading.Thread(target=allocate)
    t2 = threading.Thread(target=allocate)

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # One succeeded (201) and one received 409 Conflict
    assert 201 in results
    assert 409 in results

    # Final invoice amount_paid is exactly 500.00
    bal = client.get(f"/api/v1/invoices/{inv['id']}/balance", headers=shop_staff_headers).json()
    assert Decimal(str(bal["amount_paid"])) == Decimal("500.00")
    assert Decimal(str(bal["outstanding_amount"])) == Decimal("0.00")


def test_security_rbac_and_price_tampering_blocked(owner_headers, shop_staff_headers, hr_staff_headers):
    # 1. HR staff blocked from invoices (403)
    hr_inv = client.get("/api/v1/invoices", headers=hr_staff_headers)
    assert hr_inv.status_code == 403

    # 2. Shop staff cannot modify product prices (Owner only per Area 1 correction)
    cat = client.post(
        "/api/v1/shop/categories",
        headers=owner_headers,
        json={"name": f"PermCat-{uuid.uuid4().hex[:6]}", "module_type": "shop"},
    ).json()

    prod = client.post(
        "/api/v1/shop/products",
        headers=owner_headers,
        json={"name": "Perm Racket", "category_id": cat["id"], "unit_price": "100.00"},
    ).json()

    # Shop staff attempts to change price -> 403 Forbidden!
    tamper_resp = client.put(
        f"/api/v1/shop/products/{prod['id']}",
        headers=shop_staff_headers,
        json={"unit_price": "20.00"},
    )
    assert tamper_resp.status_code == 403
    assert "only club owners" in tamper_resp.json()["detail"].lower()
