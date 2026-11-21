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
    Member,
    MembershipPlan,
    MemberSubscription,
    Role,
    RoleEnum,
    User,
)
from app.modules.shop.models import (
    InventoryMovement,
    Order,
    OrderItem,
    Product,
    ProductCategory,
)

client = TestClient(app)


# ---------------------------------------------------------------------------
# Test Helpers
# ---------------------------------------------------------------------------
def _create_category(headers, name="Test Equipment", module_type="shop"):
    resp = client.post(
        "/api/v1/shop/categories",
        headers=headers,
        json={"name": name, "module_type": module_type, "description": "Test category"},
    )
    assert resp.status_code == 201
    return resp.json()


def _create_product(
    headers,
    category_id,
    name="Pro Racket",
    sku=None,
    module_type="shop",
    unit_price="100.00",
    tax_rate="10.00",
    initial_stock=20,
    inventory_tracked=True,
    discount_eligible=True,
):
    if sku is None:
        sku = f"SKU-{uuid.uuid4().hex[:8].upper()}"
    resp = client.post(
        "/api/v1/shop/products",
        headers=headers,
        json={
            "name": name,
            "sku": sku,
            "category_id": category_id,
            "module_type": module_type,
            "unit_price": unit_price,
            "tax_rate": tax_rate,
            "initial_stock": initial_stock,
            "inventory_tracked": inventory_tracked,
            "discount_eligible": discount_eligible,
            "reorder_threshold": 5,
        },
    )
    assert resp.status_code == 201
    return resp.json()


def _create_member_with_subscription(
    db_session,
    shop_discount=Decimal("15.00"),
    bar_discount=Decimal("10.00"),
    sub_status="active",
    start_offset_days=-5,
    end_offset_days=25,
):
    """Creates a user, linked member, and authoritative subscription record."""
    uid = uuid.uuid4().hex[:6]
    user = User(
        email=f"sub_member_{uid}@example.com",
        hashed_password=hash_password("Pass123!"),
        full_name=f"Subscribed Member {uid}",
        is_active=True,
        token_version=1,
    )
    mem_role = db_session.query(Role).filter(Role.name == RoleEnum.MEMBER.value).first()
    user.roles.append(mem_role)
    db_session.add(user)
    db_session.flush()

    plan = db_session.query(MembershipPlan).filter(MembershipPlan.name == "Gold").first()
    today = date.today()
    member = Member(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        plan_id=plan.id,
        start_date=today + timedelta(days=start_offset_days),
        expiry_date=today + timedelta(days=end_offset_days),
        is_active=True,
    )
    db_session.add(member)
    db_session.flush()

    sub = MemberSubscription(
        member_id=member.id,
        plan_id=plan.id,
        start_date=member.start_date,
        end_date=member.expiry_date,
        price_paid=Decimal("100.00"),
        plan_name_snapshot=plan.name,
        duration_days_snapshot=30,
        court_discount_snapshot=Decimal("20.00"),
        shop_discount_snapshot=shop_discount,
        bar_discount_snapshot=bar_discount,
        subscription_status=sub_status,
        payment_status="paid",
    )
    db_session.add(sub)
    db_session.commit()
    db_session.refresh(user)
    db_session.refresh(member)
    db_session.refresh(sub)
    db_session.expunge_all()

    token = create_access_token(user_id=user.id, token_version=user.token_version)
    headers = {"Authorization": f"Bearer {token}"}
    return user, member, sub, headers


# ---------------------------------------------------------------------------
# 1. Product & Category Management Tests
# ---------------------------------------------------------------------------
def test_category_crud_and_duplicate_handling(owner_headers):
    cat_name = f"Apparel-{uuid.uuid4().hex[:6]}"
    cat = _create_category(owner_headers, name=cat_name, module_type="shop")
    assert cat["name"] == cat_name
    assert cat["module_type"] == "shop"

    # Duplicate creation rejected with 409
    dup_resp = client.post(
        "/api/v1/shop/categories",
        headers=owner_headers,
        json={"name": cat_name, "module_type": "shop"},
    )
    assert dup_resp.status_code == 409

    # Public list contains category
    list_resp = client.get("/api/v1/shop/categories?module_type=shop")
    assert list_resp.status_code == 200
    assert any(c["id"] == cat["id"] for c in list_resp.json())


def test_product_creation_and_negative_validation(owner_headers, shop_staff_headers):
    cat = _create_category(owner_headers, name=f"Rackets-{uuid.uuid4().hex[:6]}")

    # Valid product created by shop staff
    prod = _create_product(
        shop_staff_headers,
        category_id=cat["id"],
        name="Yonex Voltric 7",
        unit_price="150.00",
        tax_rate="18.00",
        initial_stock=10,
    )
    assert prod["name"] == "Yonex Voltric 7"
    assert prod["current_stock"] == 10

    # Negative price rejected by Pydantic validation (422)
    bad_price = client.post(
        "/api/v1/shop/products",
        headers=owner_headers,
        json={
            "name": "Bad Price",
            "category_id": cat["id"],
            "module_type": "shop",
            "unit_price": "-10.00",
        },
    )
    assert bad_price.status_code == 422

    # Negative tax rate rejected (422)
    bad_tax = client.post(
        "/api/v1/shop/products",
        headers=owner_headers,
        json={
            "name": "Bad Tax",
            "category_id": cat["id"],
            "module_type": "shop",
            "unit_price": "50.00",
            "tax_rate": "-5.00",
        },
    )
    assert bad_tax.status_code == 422

    # Duplicate SKU rejected with 409
    dup_sku = client.post(
        "/api/v1/shop/products",
        headers=owner_headers,
        json={
            "name": "Duplicate SKU item",
            "sku": prod["sku"],
            "category_id": cat["id"],
            "module_type": "shop",
            "unit_price": "75.00",
        },
    )
    assert dup_sku.status_code == 409


def test_module_type_mismatch_rejected(owner_headers):
    # Category is cafeteria, product says shop -> 400
    cat = _create_category(owner_headers, name=f"Beverages-{uuid.uuid4().hex[:6]}", module_type="cafeteria")
    resp = client.post(
        "/api/v1/shop/products",
        headers=owner_headers,
        json={
            "name": "Mismatched Product",
            "category_id": cat["id"],
            "module_type": "shop",
            "unit_price": "20.00",
        },
    )
    assert resp.status_code == 400
    assert "module type" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# 2. Shared Inventory & Stock Ledger Tests
# ---------------------------------------------------------------------------
def test_inventory_ledger_initial_stock_and_restock(owner_headers, shop_staff_headers):
    cat = _create_category(owner_headers, name=f"Balls-{uuid.uuid4().hex[:6]}")
    prod = _create_product(
        owner_headers,
        category_id=cat["id"],
        name="Tennis Ball Pack",
        initial_stock=15,
    )
    prod_id = prod["id"]

    # Initial movement created
    movements_resp = client.get(
        f"/api/v1/shop/inventory/{prod_id}/movements",
        headers=shop_staff_headers,
    )
    assert movements_resp.status_code == 200
    movements = movements_resp.json()
    assert len(movements) == 1
    assert movements[0]["movement_type"] == "initial_stock"
    assert movements[0]["quantity_change"] == 15
    assert movements[0]["resulting_stock"] == 15

    # Restock by shop staff
    restock_resp = client.post(
        "/api/v1/shop/inventory/restock",
        headers=shop_staff_headers,
        json={"product_id": prod_id, "quantity": 10, "reason": "Fresh batch"},
    )
    assert restock_resp.status_code == 200
    assert restock_resp.json()["resulting_stock"] == 25

    # Check updated movements
    movements2 = client.get(
        f"/api/v1/shop/inventory/{prod_id}/movements",
        headers=shop_staff_headers,
    ).json()
    assert len(movements2) == 2
    assert movements2[0]["movement_type"] == "restock"
    assert movements2[0]["quantity_change"] == 10
    assert movements2[0]["resulting_stock"] == 25


def test_inventory_manual_adjustment_and_shrinkage(owner_headers):
    cat = _create_category(owner_headers, name=f"Grips-{uuid.uuid4().hex[:6]}")
    prod = _create_product(owner_headers, category_id=cat["id"], name="Overgrip", initial_stock=30)
    prod_id = prod["id"]

    # Adjust downwards (shrinkage/damage)
    adj_resp = client.post(
        "/api/v1/shop/inventory/adjust",
        headers=owner_headers,
        json={"product_id": prod_id, "new_stock": 25, "reason": "5 units damaged in storage"},
    )
    assert adj_resp.status_code == 200
    adj_data = adj_resp.json()
    assert adj_data["movement_type"] == "shrinkage"
    assert adj_data["quantity_change"] == -5
    assert adj_data["resulting_stock"] == 25


# ---------------------------------------------------------------------------
# 3. Shop POS & Order Processing Tests
# ---------------------------------------------------------------------------
def test_shop_pos_walk_in_sale(owner_headers, shop_staff_headers):
    cat = _create_category(owner_headers, name=f"Strings-{uuid.uuid4().hex[:6]}")
    prod = _create_product(
        owner_headers,
        category_id=cat["id"],
        name="Gut String",
        unit_price="40.00",
        tax_rate="10.00",
        initial_stock=10,
    )

    # Walk-in sale at counter
    sale_resp = client.post(
        "/api/v1/shop/orders",
        headers=shop_staff_headers,
        json={
            "customer_type": "walk_in",
            "walk_in_name": "John Walkin",
            "walk_in_phone": "9876543210",
            "items": [{"product_id": prod["id"], "quantity": 2}],
            "notes": "Cash sale at counter",
        },
    )
    assert sale_resp.status_code == 201
    order = sale_resp.json()
    assert order["order_type"] == "shop"
    assert order["customer_type"] == "walk_in"
    assert order["order_status"] == "completed"
    # Financial calculation: 2 * 40.00 = 80.00 gross; 0 discount; 10% tax on 80.00 = 8.00; total = 88.00
    assert Decimal(str(order["subtotal"])) == Decimal("80.00")
    assert Decimal(str(order["discount_amount"])) == Decimal("0.00")
    assert Decimal(str(order["tax_amount"])) == Decimal("8.00")
    assert Decimal(str(order["total_amount"])) == Decimal("88.00")

    # Verify inventory was decremented from 10 to 8
    inv_check = client.get(
        f"/api/v1/shop/inventory/{prod['id']}/movements",
        headers=shop_staff_headers,
    ).json()
    assert inv_check[0]["movement_type"] == "sale"
    assert inv_check[0]["quantity_change"] == -2
    assert inv_check[0]["resulting_stock"] == 8


def test_shop_pos_member_sale_with_discount(owner_headers, shop_staff_headers):
    db = SessionLocal()
    try:
        user, member, sub, _ = _create_member_with_subscription(
            db, shop_discount=Decimal("20.00")
        )
    finally:
        db.close()

    cat = _create_category(owner_headers, name=f"Shoes-{uuid.uuid4().hex[:6]}")
    prod = _create_product(
        owner_headers,
        category_id=cat["id"],
        name="Court Shoes",
        unit_price="100.00",
        tax_rate="5.00",
        initial_stock=5,
        discount_eligible=True,
    )

    # Member sale: 1 unit of 100.00
    # Gross: 100.00, Discount (20%): 20.00, Net: 80.00, Tax (5% of 80): 4.00, Total: 84.00
    resp = client.post(
        "/api/v1/shop/orders",
        headers=shop_staff_headers,
        json={
            "customer_type": "member",
            "member_id": str(member.id),
            "items": [{"product_id": prod["id"], "quantity": 1}],
        },
    )
    assert resp.status_code == 201
    order = resp.json()
    assert Decimal(str(order["subtotal"])) == Decimal("100.00")
    assert Decimal(str(order["discount_amount"])) == Decimal("20.00")
    assert Decimal(str(order["tax_amount"])) == Decimal("4.00")
    assert Decimal(str(order["total_amount"])) == Decimal("84.00")


def test_shop_pos_insufficient_stock_rejected(owner_headers, shop_staff_headers):
    cat = _create_category(owner_headers, name=f"Caps-{uuid.uuid4().hex[:6]}")
    prod = _create_product(
        owner_headers,
        category_id=cat["id"],
        name="Club Cap",
        unit_price="25.00",
        initial_stock=2,
    )

    # Requesting 5 when stock is 2 -> 409 Conflict
    resp = client.post(
        "/api/v1/shop/orders",
        headers=shop_staff_headers,
        json={
            "customer_type": "walk_in",
            "items": [{"product_id": prod["id"], "quantity": 5}],
        },
    )
    assert resp.status_code == 409
    assert "insufficient stock" in resp.json()["detail"].lower()


def test_historical_price_preservation(owner_headers, shop_staff_headers):
    """Verifies that future price changes do not rewrite historical order snapshots."""
    cat = _create_category(owner_headers, name=f"Towels-{uuid.uuid4().hex[:6]}")
    prod = _create_product(
        owner_headers,
        category_id=cat["id"],
        name="Gym Towel",
        unit_price="30.00",
        initial_stock=10,
    )

    # Place order at 30.00
    sale = client.post(
        "/api/v1/shop/orders",
        headers=shop_staff_headers,
        json={
            "customer_type": "walk_in",
            "items": [{"product_id": prod["id"], "quantity": 1}],
        },
    ).json()
    order_id = sale["id"]
    assert Decimal(str(sale["subtotal"])) == Decimal("30.00")

    # Owner updates product price to 50.00
    client.put(
        f"/api/v1/shop/products/{prod['id']}",
        headers=owner_headers,
        json={"unit_price": "50.00"},
    )

    # Fetch historical order: must STILL be 30.00!
    fetched = client.get(f"/api/v1/shop/orders/{order_id}", headers=shop_staff_headers).json()
    assert Decimal(str(fetched["subtotal"])) == Decimal("30.00")
    assert Decimal(str(fetched["items"][0]["unit_price_snapshot"])) == Decimal("30.00")


# ---------------------------------------------------------------------------
# 4. Online Member Orders & Self-Service Cancellation
# ---------------------------------------------------------------------------
def test_member_online_order_and_cancellation_stock_restoration(owner_headers):
    db = SessionLocal()
    try:
        user, member, sub, member_headers = _create_member_with_subscription(
            db, shop_discount=Decimal("10.00")
        )
    finally:
        db.close()

    cat = _create_category(owner_headers, name=f"Bottles-{uuid.uuid4().hex[:6]}")
    prod = _create_product(
        owner_headers,
        category_id=cat["id"],
        name="Water Bottle",
        unit_price="20.00",
        initial_stock=5,
    )

    # Member places online order
    order_resp = client.post(
        "/api/v1/shop/orders",
        headers=member_headers,
        json={"items": [{"product_id": prod["id"], "quantity": 2}]},
    )
    assert order_resp.status_code == 201
    order = order_resp.json()
    assert order["order_status"] == "pending"
    assert order["member_id"] == str(member.id)

    # Stock is now 3
    inv = client.get(f"/api/v1/shop/inventory/{prod['id']}/movements", headers=owner_headers).json()
    assert inv[0]["resulting_stock"] == 3

    # Member cancels their own pending order
    cancel_resp = client.post(
        f"/api/v1/shop/orders/{order['id']}/cancel",
        headers=member_headers,
        json={"reason": "Ordered wrong size"},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["order_status"] == "cancelled"

    # Stock is restored to 5 exactly once with movement_type="cancellation_restore"
    inv2 = client.get(f"/api/v1/shop/inventory/{prod['id']}/movements", headers=owner_headers).json()
    assert inv2[0]["movement_type"] == "cancellation_restore"
    assert inv2[0]["quantity_change"] == 2
    assert inv2[0]["resulting_stock"] == 5

    # Attempting to cancel again fails
    second_cancel = client.post(
        f"/api/v1/shop/orders/{order['id']}/cancel",
        headers=member_headers,
    )
    assert second_cancel.status_code == 400


def test_member_order_isolation_and_ownership(owner_headers):
    db = SessionLocal()
    try:
        u1, m1, s1, h1 = _create_member_with_subscription(db)
        u2, m2, s2, h2 = _create_member_with_subscription(db)
    finally:
        db.close()

    cat = _create_category(owner_headers, name=f"Isolation-{uuid.uuid4().hex[:6]}")
    prod = _create_product(owner_headers, category_id=cat["id"], initial_stock=10)

    # Member 1 places order
    order1 = client.post(
        "/api/v1/shop/orders",
        headers=h1,
        json={"items": [{"product_id": prod["id"], "quantity": 1}]},
    ).json()

    # Member 2 cannot access Member 1's order details (403)
    resp = client.get(f"/api/v1/shop/orders/{order1['id']}", headers=h2)
    assert resp.status_code == 403

    # Member 2 cannot cancel Member 1's order (403)
    cancel_resp = client.post(f"/api/v1/shop/orders/{order1['id']}/cancel", headers=h2)
    assert cancel_resp.status_code == 403


# ---------------------------------------------------------------------------
# 5. Cafeteria Operations & Kitchen Lifecycle Tests
# ---------------------------------------------------------------------------
def test_cafeteria_order_lifecycle_state_machine(owner_headers, receptionist_headers):
    cat = _create_category(owner_headers, name=f"Meals-{uuid.uuid4().hex[:6]}", module_type="cafeteria")
    meal = _create_product(
        owner_headers,
        category_id=cat["id"],
        name="Club Sandwich",
        module_type="cafeteria",
        unit_price="15.00",
        tax_rate="5.00",
        initial_stock=10,
    )

    # Receptionist places cafeteria order
    order_resp = client.post(
        "/api/v1/cafeteria/orders",
        headers=receptionist_headers,
        json={
            "customer_type": "walk_in",
            "table_number": "T4",
            "kitchen_notes": "Extra mustard, toasted",
            "items": [{"product_id": meal["id"], "quantity": 2}],
        },
    )
    assert order_resp.status_code == 201
    order = order_resp.json()
    order_id = order["id"]
    assert order["order_type"] == "cafeteria"
    assert order["order_status"] == "pending"
    assert order["table_number"] == "T4"

    # Step 1: pending -> preparing
    s1 = client.patch(
        f"/api/v1/cafeteria/orders/{order_id}/status",
        headers=receptionist_headers,
        json={"new_status": "preparing", "notes": "Chef started"},
    )
    assert s1.status_code == 200
    assert s1.json()["order_status"] == "preparing"

    # Step 2: Invalid transition: preparing -> served directly rejected with 400
    bad_step = client.patch(
        f"/api/v1/cafeteria/orders/{order_id}/status",
        headers=receptionist_headers,
        json={"new_status": "served"},
    )
    assert bad_step.status_code == 400

    # Step 3: preparing -> ready
    s2 = client.patch(
        f"/api/v1/cafeteria/orders/{order_id}/status",
        headers=receptionist_headers,
        json={"new_status": "ready"},
    )
    assert s2.status_code == 200
    assert s2.json()["order_status"] == "ready"

    # Step 4: ready -> served
    s3 = client.patch(
        f"/api/v1/cafeteria/orders/{order_id}/status",
        headers=receptionist_headers,
        json={"new_status": "served"},
    )
    assert s3.status_code == 200
    final_order = s3.json()
    assert final_order["order_status"] == "served"
    assert final_order["completed_at"] is not None


# ---------------------------------------------------------------------------
# 6. Concurrency & ACID Multi-Product Order Safety
# ---------------------------------------------------------------------------
def test_concurrent_sales_cannot_oversell(owner_headers, shop_staff_headers):
    """
    Simulates two simultaneous sales competing for the last item in stock.
    Exactly one must succeed and one must be rejected with 409 Conflict.
    """
    cat = _create_category(owner_headers, name=f"Limited-{uuid.uuid4().hex[:6]}")
    prod = _create_product(
        owner_headers,
        category_id=cat["id"],
        name="Last Exclusive Jersey",
        initial_stock=1,  # Only 1 in stock!
    )
    prod_id = prod["id"]

    results = []

    def make_sale():
        resp = client.post(
            "/api/v1/shop/orders",
            headers=shop_staff_headers,
            json={
                "customer_type": "walk_in",
                "items": [{"product_id": prod_id, "quantity": 1}],
            },
        )
        results.append(resp.status_code)

    t1 = threading.Thread(target=make_sale)
    t2 = threading.Thread(target=make_sale)

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # One succeeded (201) and one received conflict (409)
    assert 201 in results
    assert 409 in results

    # Final stock must be exactly 0 (never negative)
    final_inv = client.get(
        f"/api/v1/shop/inventory/{prod_id}/movements",
        headers=shop_staff_headers,
    ).json()
    assert final_inv[0]["resulting_stock"] == 0


def test_failed_multi_item_order_atomic_rollback(owner_headers, shop_staff_headers):
    """
    An order requests Item A (in stock) and Item B (out of stock).
    The entire transaction must roll back; Item A stock must not decrement.
    """
    cat = _create_category(owner_headers, name=f"Atomic-{uuid.uuid4().hex[:6]}")
    prod_a = _create_product(owner_headers, category_id=cat["id"], name="Item A", initial_stock=10)
    prod_b = _create_product(owner_headers, category_id=cat["id"], name="Item B", initial_stock=0)

    resp = client.post(
        "/api/v1/shop/orders",
        headers=shop_staff_headers,
        json={
            "customer_type": "walk_in",
            "items": [
                {"product_id": prod_a["id"], "quantity": 2},
                {"product_id": prod_b["id"], "quantity": 1},
            ],
        },
    )
    assert resp.status_code == 409

    # Verify Item A stock remained 10
    inv_a = client.get(
        f"/api/v1/shop/inventory/{prod_a['id']}/movements",
        headers=shop_staff_headers,
    ).json()
    assert inv_a[0]["resulting_stock"] == 10
    assert len(inv_a) == 1  # only initial stock


# ---------------------------------------------------------------------------
# 7. Role-Based Access Control (RBAC) Security Tests
# ---------------------------------------------------------------------------
def test_unauthorized_roles_blocked_from_inventory(owner_headers, hr_staff_headers, member_headers):
    cat = _create_category(owner_headers, name=f"Sec-{uuid.uuid4().hex[:6]}")
    prod = _create_product(owner_headers, category_id=cat["id"], initial_stock=10)

    # HR Staff cannot adjust inventory (403)
    hr_resp = client.post(
        "/api/v1/shop/inventory/adjust",
        headers=hr_staff_headers,
        json={"product_id": prod["id"], "new_stock": 20, "reason": "HR test"},
    )
    assert hr_resp.status_code == 403

    # Member cannot adjust inventory (403)
    mem_resp = client.post(
        "/api/v1/shop/inventory/adjust",
        headers=member_headers,
        json={"product_id": prod["id"], "new_stock": 20, "reason": "Member test"},
    )
    assert mem_resp.status_code == 403

    # Unauthenticated cannot view inventory ledger (401)
    unauth_resp = client.get(f"/api/v1/shop/inventory/{prod['id']}/movements")
    assert unauth_resp.status_code == 401


# ---------------------------------------------------------------------------
# 8. Milestone C Pre-Implementation Verification Tests
# ---------------------------------------------------------------------------
def test_milestone_c_operating_hours_enforced(owner_headers):
    """Verifies that bookings outside 06:00 to 22:00 are rejected."""
    court_resp = client.get("/api/v1/courts", headers=owner_headers)
    court_id = court_resp.json()[0]["id"]

    # 03:00 UTC is outside operating hours (06:00 - 22:00) -> 400
    early_start = datetime(2026, 12, 15, 3, 0, 0, tzinfo=timezone.utc)
    resp = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "court_id": court_id,
            "start_time": early_start.isoformat(),
            "walk_in_name": "Night Owl",
        },
    )
    assert resp.status_code == 400
    assert "operating hours" in resp.json()["detail"].lower()


def test_milestone_c_cancelled_subscription_gets_zero_discount(owner_headers):
    """
    Verifies that a member whose subscription is cancelled receives 0% discount
    on court bookings, rather than defaulting to the plan's court discount.
    """
    db = SessionLocal()
    try:
        user, member, sub, _ = _create_member_with_subscription(
            db, sub_status="cancelled"
        )
    finally:
        db.close()

    court_resp = client.get("/api/v1/courts", headers=owner_headers)
    court = court_resp.json()[0]
    hourly = Decimal(str(court["hourly_rate"]))

    # Booking start at 10:00 UTC (valid operating hours)
    start = datetime(2026, 12, 16, 10, 0, 0, tzinfo=timezone.utc)
    resp = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "member_id": str(member.id),
            "court_id": court["id"],
            "start_time": start.isoformat(),
        },
    )
    assert resp.status_code == 201
    booking = resp.json()
    # Cancelled subscription must get 0% discount -> full hourly rate
    assert Decimal(str(booking["calculated_fee"])) == hourly


def test_milestone_c_availability_slot_boundaries_close_at_2200(owner_headers):
    """Verifies that the candidate slots from GET /availability do not exceed 22:00."""
    target_date = date(2026, 12, 18)
    resp = client.get(f"/api/v1/bookings/availability?date={target_date.isoformat()}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0

    slots = data[0]["slots"]
    # Total candidate slots = 31 (06:00 to 21:00 step 30m)
    assert len(slots) == 31
    # First slot: 06:00 to 07:00
    first = slots[0]
    assert datetime.fromisoformat(first["start_time"]).hour == 6
    assert datetime.fromisoformat(first["end_time"]).hour == 7

    # Last slot: 21:00 to 22:00
    last = slots[-1]
    assert datetime.fromisoformat(last["start_time"]).hour == 21
    assert datetime.fromisoformat(last["end_time"]).hour == 22
    assert datetime.fromisoformat(last["end_time"]).minute == 0
