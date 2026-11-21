import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import Court, Member, MembershipPlan, MemberSubscription
from tests.conftest import TestingSessionLocal

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def create_test_plan(name="Diamond Tier", monthly_fee=120.00, court_discount=30.00, duration_days=30):
    db = TestingSessionLocal()
    try:
        plan = MembershipPlan(
            name=f"{name}_{uuid.uuid4().hex[:6]}",
            monthly_fee=Decimal(str(monthly_fee)),
            court_discount_percent=Decimal(str(court_discount)),
            shop_discount_percent=Decimal("10.00"),
            bar_discount_percent=Decimal("5.00"),
            duration_days=duration_days,
            description="Test plan tier",
            is_active=True,
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
        return plan
    finally:
        db.close()


def create_test_member(plan_id, full_name="Test Walkin Member", email=None, user_id=None, is_active=True, expiry_offset_days=30):
    db = TestingSessionLocal()
    try:
        m_email = email or f"member_{uuid.uuid4().hex[:8]}@example.com"
        today = date.today()
        member = Member(
            full_name=full_name,
            email=m_email,
            phone="+1234567890",
            plan_id=plan_id,
            user_id=user_id,
            start_date=today,
            expiry_date=today + timedelta(days=expiry_offset_days),
            is_active=is_active,
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        return member
    finally:
        db.close()


# ---------------------------------------------------------------------------
# 1. Membership Plan Management Tests
# ---------------------------------------------------------------------------
def test_create_membership_plan_by_owner(owner_headers):
    """Owner successfully creates a new membership tier."""
    unique_name = f"Platinum Tier {uuid.uuid4().hex[:6]}"
    payload = {
        "name": unique_name,
        "monthly_fee": "150.00",
        "court_discount_percent": "40.00",
        "shop_discount_percent": "15.00",
        "bar_discount_percent": "10.00",
        "duration_days": 90,
        "description": "Premium 90-day access",
        "is_active": True,
    }
    res = client.post("/api/v1/members/plans", json=payload, headers=owner_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == unique_name
    assert Decimal(str(data["monthly_fee"])) == Decimal("150.00")
    assert Decimal(str(data["court_discount_percent"])) == Decimal("40.00")
    assert data["duration_days"] == 90
    assert data["is_active"] is True


def test_receptionist_cannot_create_or_update_plans(receptionist_headers):
    """Receptionist is strictly forbidden from creating or updating membership plans (Owner only)."""
    payload = {
        "name": "Hacker Plan",
        "monthly_fee": "1.00",
        "court_discount_percent": "99.00",
        "duration_days": 30,
    }
    # Create attempt
    post_res = client.post("/api/v1/members/plans", json=payload, headers=receptionist_headers)
    assert post_res.status_code == 403

    # Update attempt on existing plan
    plan = create_test_plan()
    put_res = client.put(f"/api/v1/members/plans/{plan.id}", json={"monthly_fee": "0.00"}, headers=receptionist_headers)
    assert put_res.status_code == 403


def test_plan_validation_invalid_pricing_and_discounts(owner_headers):
    """Validation rejects negative fees, discounts outside [0, 100], and duplicate names."""
    # Negative monthly fee
    res = client.post(
        "/api/v1/members/plans",
        json={"name": "Bad Price", "monthly_fee": "-10.00", "court_discount_percent": "10.00"},
        headers=owner_headers,
    )
    assert res.status_code == 422

    # Discount > 100
    res = client.post(
        "/api/v1/members/plans",
        json={"name": "Excessive Discount", "monthly_fee": "50.00", "court_discount_percent": "105.00"},
        headers=owner_headers,
    )
    assert res.status_code == 422

    # Discount < 0
    res = client.post(
        "/api/v1/members/plans",
        json={"name": "Negative Discount", "monthly_fee": "50.00", "court_discount_percent": "-5.00"},
        headers=owner_headers,
    )
    assert res.status_code == 422

    # Duplicate plan name
    existing_plan = create_test_plan(name="Unique Tier")
    dup_res = client.post(
        "/api/v1/members/plans",
        json={"name": existing_plan.name, "monthly_fee": "80.00", "court_discount_percent": "20.00"},
        headers=owner_headers,
    )
    assert dup_res.status_code == 409


def test_owner_update_plan(owner_headers):
    """Owner can update plan fee, discounts, and duration."""
    plan = create_test_plan(monthly_fee=100.00, court_discount=25.00)
    update_payload = {
        "monthly_fee": "125.00",
        "court_discount_percent": "35.00",
        "duration_days": 60,
    }
    res = client.put(f"/api/v1/members/plans/{plan.id}", json=update_payload, headers=owner_headers)
    assert res.status_code == 200
    updated = res.json()
    assert Decimal(str(updated["monthly_fee"])) == Decimal("125.00")
    assert Decimal(str(updated["court_discount_percent"])) == Decimal("35.00")
    assert updated["duration_days"] == 60


# ---------------------------------------------------------------------------
# 2. Subscription Purchase, Date Calculation, and Snapshots
# ---------------------------------------------------------------------------
def test_subscription_creation_fails_without_configured_duration(receptionist_headers):
    """A plan without configured duration_days cannot be purchased."""
    plan_no_duration = create_test_plan(duration_days=None)
    member = create_test_member(plan_id=plan_no_duration.id)

    payload = {"plan_id": str(plan_no_duration.id)}
    res = client.post(f"/api/v1/members/{member.id}/subscriptions", json=payload, headers=receptionist_headers)
    assert res.status_code == 400
    assert "no configured duration_days" in res.json()["detail"]


def test_subscription_creation_and_member_projection_sync(receptionist_headers):
    """
    Subscription purchase:
    1. Creates subscription history record.
    2. Synchronizes Member current plan and dates atomically.
    3. Calculates end_date = start_date + duration_days.
    """
    plan = create_test_plan(duration_days=30, monthly_fee=75.00, court_discount=20.00)
    # Create expired member so they can purchase new subscription
    member = create_test_member(plan_id=plan.id, expiry_offset_days=-5, is_active=False)

    start_d = date.today()
    payload = {
        "plan_id": str(plan.id),
        "payment_status": "paid",
        "notes": "Direct counter purchase",
    }
    res = client.post(f"/api/v1/members/{member.id}/subscriptions", json=payload, headers=receptionist_headers)
    assert res.status_code == 201
    sub = res.json()

    assert sub["member_id"] == str(member.id)
    assert sub["plan_id"] == str(plan.id)
    assert sub["start_date"] == start_d.isoformat()
    expected_end = start_d + timedelta(days=30)
    assert sub["end_date"] == expected_end.isoformat()
    assert Decimal(str(sub["price_paid"])) == Decimal("75.00")
    assert sub["plan_name_snapshot"] == plan.name
    assert sub["duration_days_snapshot"] == 30
    assert Decimal(str(sub["court_discount_snapshot"])) == Decimal("20.00")
    assert sub["subscription_status"] == "active"
    assert sub["payment_status"] == "paid"

    # Verify Member projection was synchronized
    db = TestingSessionLocal()
    try:
        updated_member = db.query(Member).filter(Member.id == member.id).first()
        assert updated_member.plan_id == plan.id
        assert updated_member.start_date == start_d
        assert updated_member.expiry_date == expected_end
        assert updated_member.is_active is True
    finally:
        db.close()


def test_snapshots_preserved_when_plan_later_changes(receptionist_headers, owner_headers):
    """
    Snapshots are immutable: If the plan's fee or discounts are altered later,
    historical subscriptions must retain their original snapshot values.
    """
    plan = create_test_plan(duration_days=30, monthly_fee=100.00, court_discount=50.00)
    member = create_test_member(plan_id=plan.id, expiry_offset_days=-10, is_active=False)

    # 1. Purchase subscription under original plan terms
    res = client.post(
        f"/api/v1/members/{member.id}/subscriptions",
        json={"plan_id": str(plan.id), "payment_status": "paid"},
        headers=receptionist_headers,
    )
    assert res.status_code == 201
    sub_id = res.json()["id"]

    # 2. Owner raises price to $200 and lowers discount to 10%
    client.put(
        f"/api/v1/members/plans/{plan.id}",
        json={"monthly_fee": "200.00", "court_discount_percent": "10.00"},
        headers=owner_headers,
    )

    # 3. Verify the previous subscription retains original snapshots
    history_res = client.get(f"/api/v1/members/{member.id}/subscriptions", headers=receptionist_headers)
    assert history_res.status_code == 200
    sub_history = history_res.json()
    assert len(sub_history) == 1
    historic_sub = sub_history[0]
    assert historic_sub["id"] == sub_id
    assert Decimal(str(historic_sub["price_paid"])) == Decimal("100.00")
    assert Decimal(str(historic_sub["court_discount_snapshot"])) == Decimal("50.00")


def test_duplicate_active_subscription_prevention(receptionist_headers):
    """A member with an existing active subscription cannot purchase a duplicate active subscription."""
    plan = create_test_plan(duration_days=30)
    member = create_test_member(plan_id=plan.id, expiry_offset_days=-5, is_active=False)

    # Initial purchase succeeds
    res1 = client.post(
        f"/api/v1/members/{member.id}/subscriptions",
        json={"plan_id": str(plan.id)},
        headers=receptionist_headers,
    )
    assert res1.status_code == 201

    # Second purchase attempt on active member fails
    res2 = client.post(
        f"/api/v1/members/{member.id}/subscriptions",
        json={"plan_id": str(plan.id)},
        headers=receptionist_headers,
    )
    assert res2.status_code == 400
    assert "already has an active subscription" in res2.json()["detail"]


# ---------------------------------------------------------------------------
# 3. Separate Subscription & Payment Statuses
# ---------------------------------------------------------------------------
def test_separate_subscription_and_payment_statuses(receptionist_headers):
    """Subscription lifecycle ('active') is separate from payment lifecycle ('unpaid', 'partially_paid', 'paid')."""
    plan = create_test_plan(duration_days=30)
    member = create_test_member(plan_id=plan.id, expiry_offset_days=-5, is_active=False)

    # Default payment status is 'unpaid'
    res = client.post(
        f"/api/v1/members/{member.id}/subscriptions",
        json={"plan_id": str(plan.id)},
        headers=receptionist_headers,
    )
    assert res.status_code == 201
    assert res.json()["subscription_status"] == "active"
    assert res.json()["payment_status"] == "unpaid"

    # Invalid payment status rejected by schema validation
    res_bad = client.post(
        f"/api/v1/members/{member.id}/subscriptions",
        json={"plan_id": str(plan.id), "payment_status": "fraudulent_status"},
        headers=receptionist_headers,
    )
    assert res_bad.status_code == 422


# ---------------------------------------------------------------------------
# 4. Renewal & Plan Change Workflows
# ---------------------------------------------------------------------------
def test_renewal_active_member_continuous_coverage(receptionist_headers):
    """
    Active renewal:
    When member is active (expiry >= today), renewal extends continuously:
    new start_date = current expiry_date + 1 day
    new end_date = new start_date + duration_days
    """
    plan = create_test_plan(duration_days=30)
    today = date.today()
    current_expiry = today + timedelta(days=15)
    member = create_test_member(plan_id=plan.id, expiry_offset_days=15, is_active=True)

    res = client.post(
        f"/api/v1/members/{member.id}/renew",
        json={"payment_status": "paid", "notes": "Continuous renewal"},
        headers=receptionist_headers,
    )
    assert res.status_code == 200
    renewal_sub = res.json()

    expected_start = current_expiry + timedelta(days=1)
    expected_end = expected_start + timedelta(days=30)
    assert renewal_sub["start_date"] == expected_start.isoformat()
    assert renewal_sub["end_date"] == expected_end.isoformat()

    # Member projection expiry_date extended
    db = TestingSessionLocal()
    try:
        updated_member = db.query(Member).filter(Member.id == member.id).first()
        assert updated_member.expiry_date == expected_end
    finally:
        db.close()


def test_renewal_expired_member_resumes_today(receptionist_headers):
    """
    Expired renewal:
    When member is expired (expiry < today), renewal resumes from today:
    new start_date = today
    new end_date = today + duration_days
    """
    plan = create_test_plan(duration_days=30)
    member = create_test_member(plan_id=plan.id, expiry_offset_days=-20, is_active=False)

    res = client.post(f"/api/v1/members/{member.id}/renew", json={"payment_status": "paid"}, headers=receptionist_headers)
    assert res.status_code == 200
    renewal_sub = res.json()

    today = date.today()
    expected_end = today + timedelta(days=30)
    assert renewal_sub["start_date"] == today.isoformat()
    assert renewal_sub["end_date"] == expected_end.isoformat()

    db = TestingSessionLocal()
    try:
        updated_member = db.query(Member).filter(Member.id == member.id).first()
        assert updated_member.expiry_date == expected_end
        assert updated_member.is_active is True
    finally:
        db.close()


def test_plan_change_cancels_old_subscription_and_preserves_history(receptionist_headers):
    """
    Plan change:
    1. Cancels previous active subscription with audit timestamp.
    2. Creates new active subscription under new plan benefits.
    3. Preserves both in history.
    """
    silver_plan = create_test_plan(name="Silver Tier", monthly_fee=50.00, court_discount=20.00, duration_days=30)
    gold_plan = create_test_plan(name="Gold Tier", monthly_fee=100.00, court_discount=50.00, duration_days=60)

    member = create_test_member(plan_id=silver_plan.id, expiry_offset_days=-5, is_active=False)

    # Initial purchase of Silver
    res_buy = client.post(
        f"/api/v1/members/{member.id}/subscriptions",
        json={"plan_id": str(silver_plan.id)},
        headers=receptionist_headers,
    )
    assert res_buy.status_code == 201
    silver_sub_id = res_buy.json()["id"]

    # Upgrade to Gold
    res_change = client.post(
        f"/api/v1/members/{member.id}/change-plan",
        json={"new_plan_id": str(gold_plan.id), "payment_status": "paid", "notes": "Upgrade to Gold"},
        headers=receptionist_headers,
    )
    assert res_change.status_code == 200
    gold_sub = res_change.json()
    assert gold_sub["plan_name_snapshot"] == gold_plan.name
    assert Decimal(str(gold_sub["court_discount_snapshot"])) == Decimal("50.00")
    assert gold_sub["subscription_status"] == "active"

    # Check history: 2 records exist, Silver is cancelled, Gold is active
    history_res = client.get(f"/api/v1/members/{member.id}/subscriptions", headers=receptionist_headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) == 2

    cancelled_sub = next(s for s in history if s["id"] == silver_sub_id)
    assert cancelled_sub["subscription_status"] == "cancelled"
    assert cancelled_sub["cancelled_at"] is not None
    assert "Superseded by plan change" in cancelled_sub["notes"]


# ---------------------------------------------------------------------------
# 5. Member Self-Service & Authorization Ownership
# ---------------------------------------------------------------------------
def test_member_self_service_profile(member_headers, member_user):
    """Authenticated member can view their own profile via GET /members/me."""
    plan = create_test_plan()
    member = create_test_member(plan_id=plan.id, user_id=member_user.id, full_name="Self Service User")

    res = client.get("/api/v1/members/me", headers=member_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == str(member.id)
    assert data["full_name"] == "Self Service User"
    assert data["email"] == member.email


def test_member_self_service_404_when_no_linked_profile(owner_headers):
    """User without a linked member profile gets 404 from GET /members/me."""
    res = client.get("/api/v1/members/me", headers=owner_headers)
    assert res.status_code == 404
    assert "No member profile linked" in res.json()["detail"]


def test_member_subscription_ownership_authorization(member_headers, member_user, receptionist_headers):
    """
    A member can only view their own subscriptions.
    Attempting to view another member's subscriptions returns 403 Forbidden.
    """
    plan = create_test_plan(duration_days=30)
    my_member = create_test_member(plan_id=plan.id, user_id=member_user.id, full_name="My Member")
    other_member = create_test_member(plan_id=plan.id, user_id=None, full_name="Other Member")

    # Purchase subscription for other member
    client.post(
        f"/api/v1/members/{other_member.id}/subscriptions",
        json={"plan_id": str(plan.id)},
        headers=receptionist_headers,
    )

    # I can view my own (empty list)
    my_res = client.get(f"/api/v1/members/{my_member.id}/subscriptions", headers=member_headers)
    assert my_res.status_code == 200
    assert my_res.json() == []

    # I cannot view other member's subscriptions -> 403 Forbidden
    forbidden_res = client.get(f"/api/v1/members/{other_member.id}/subscriptions", headers=member_headers)
    assert forbidden_res.status_code == 403

    # Receptionist can view both
    staff_res = client.get(f"/api/v1/members/{other_member.id}/subscriptions", headers=receptionist_headers)
    assert staff_res.status_code == 200
    assert len(staff_res.json()) == 1


# ---------------------------------------------------------------------------
# 6. Walk-In Member Support & Booking Fee Preservation
# ---------------------------------------------------------------------------
def test_walk_in_member_preservation(receptionist_headers):
    """Walk-in member has user_id = None; staff can purchase and renew subscriptions without forcing account creation."""
    plan = create_test_plan(duration_days=30)
    walkin = create_test_member(plan_id=plan.id, user_id=None, expiry_offset_days=-5, is_active=False)
    assert walkin.user_id is None

    # Purchase subscription
    res = client.post(f"/api/v1/members/{walkin.id}/subscriptions", json={"plan_id": str(plan.id)}, headers=receptionist_headers)
    assert res.status_code == 201

    # Verify walkin user_id remains None
    db = TestingSessionLocal()
    try:
        refreshed = db.query(Member).filter(Member.id == walkin.id).first()
        assert refreshed.user_id is None
    finally:
        db.close()


def test_booking_discount_integration_and_historical_price_preservation(receptionist_headers):
    """
    1. Court rate = $40.00.
    2. Member on Silver (20% discount) books court -> fee is $32.00.
    3. Member changes plan to Gold (50% discount).
    4. The existing booking fee remains $32.00 (NOT repriced retroactively).
    5. A new booking created on Gold gets 50% discount ($20.00).
    """
    silver_plan = create_test_plan(name="Silver 20", monthly_fee=50.00, court_discount=20.00, duration_days=30)
    gold_plan = create_test_plan(name="Gold 50", monthly_fee=100.00, court_discount=50.00, duration_days=30)

    member = create_test_member(plan_id=silver_plan.id, expiry_offset_days=30, is_active=True)

    # Create court
    db = TestingSessionLocal()
    court = Court(name=f"Court_{uuid.uuid4().hex[:6]}", sport_type="Tennis", hourly_rate=Decimal("40.00"), is_active=True)
    db.add(court)
    db.commit()
    db.refresh(court)
    court_id = court.id
    db.close()

    # 1. First booking on Silver (20% off $40 = $32)
    t1 = (datetime.now(timezone.utc) + timedelta(days=10)).replace(hour=10, minute=0, second=0, microsecond=0)
    b1_payload = {
        "member_id": str(member.id),
        "court_id": str(court_id),
        "start_time": t1.isoformat(),
    }
    res_b1 = client.post("/api/v1/bookings", json=b1_payload, headers=receptionist_headers)
    assert res_b1.status_code == 201
    booking1 = res_b1.json()
    assert Decimal(str(booking1["calculated_fee"])) == Decimal("32.00")

    # 2. Member switches to Gold plan (50% off)
    client.post(
        f"/api/v1/members/{member.id}/change-plan",
        json={"new_plan_id": str(gold_plan.id)},
        headers=receptionist_headers,
    )

    # 3. Existing booking fee must remain $32.00
    res_b1_check = client.get(f"/api/v1/bookings/{booking1['id']}", headers=receptionist_headers)
    assert res_b1_check.status_code == 200
    assert Decimal(str(res_b1_check.json()["calculated_fee"])) == Decimal("32.00")

    # 4. New booking created under Gold gets 50% discount ($20.00)
    t2 = (datetime.now(timezone.utc) + timedelta(days=11)).replace(hour=10, minute=0, second=0, microsecond=0)
    b2_payload = {
        "member_id": str(member.id),
        "court_id": str(court_id),
        "start_time": t2.isoformat(),
    }
    res_b2 = client.post("/api/v1/bookings", json=b2_payload, headers=receptionist_headers)
    assert res_b2.status_code == 201
    booking2 = res_b2.json()
    assert Decimal(str(booking2["calculated_fee"])) == Decimal("20.00")
