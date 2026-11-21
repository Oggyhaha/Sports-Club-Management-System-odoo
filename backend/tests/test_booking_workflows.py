import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import Booking, Court, Member, MembershipPlan, Role, RoleEnum, SocialPlayParticipant, SocialPlaySession, User
from tests.conftest import TestingSessionLocal

client = TestClient(app)


# ---------------------------------------------------------------------------
# Test Helpers & Fixtures
# ---------------------------------------------------------------------------
def create_test_court(name="Centre Court", sport_type="tennis", hourly_rate=40.00, walk_in_rate=60.00, is_active=True):
    db = TestingSessionLocal()
    try:
        court = Court(
            name=f"{name}_{uuid.uuid4().hex[:6]}",
            sport_type=sport_type.lower(),
            hourly_rate=Decimal(str(hourly_rate)),
            walk_in_rate=Decimal(str(walk_in_rate)) if walk_in_rate is not None else None,
            is_active=is_active,
        )
        db.add(court)
        db.commit()
        db.refresh(court)
        return court
    finally:
        db.close()


def create_test_member(plan_name="Gold", full_name="Court Test Member", user_id=None, is_active=True, expiry_offset_days=30):
    db = TestingSessionLocal()
    try:
        plan = db.query(MembershipPlan).filter(MembershipPlan.name == plan_name).first()
        if not plan:
            plan = MembershipPlan(
                name=f"{plan_name}_{uuid.uuid4().hex[:4]}",
                monthly_fee=Decimal("100.00"),
                court_discount_percent=Decimal("50.00"),
                duration_days=30,
                is_active=True,
            )
            db.add(plan)
            db.flush()

        today = date.today()
        member = Member(
            full_name=full_name,
            email=f"member_{uuid.uuid4().hex[:8]}@example.com",
            phone="+1987654321",
            plan_id=plan.id,
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
# 1. Court Management & Authorization Tests
# ---------------------------------------------------------------------------
def test_public_court_listing_and_details():
    """Court listing and detail endpoints are publicly accessible without authentication."""
    court = create_test_court(name="Public Court", hourly_rate=35.00, walk_in_rate=50.00)

    # 1. List courts
    res = client.get("/api/v1/courts")
    assert res.status_code == 200
    courts = res.json()
    assert any(c["id"] == str(court.id) for c in courts)

    # 2. Get specific court
    res_single = client.get(f"/api/v1/courts/{court.id}")
    assert res_single.status_code == 200
    data = res_single.json()
    assert data["name"] == court.name
    assert Decimal(str(data["hourly_rate"])) == Decimal("35.00")
    assert Decimal(str(data["walk_in_rate"])) == Decimal("50.00")


def test_court_creation_permissions(owner_headers, receptionist_headers):
    """Only Owner can create courts; Receptionists receive 403 Forbidden."""
    court_payload = {
        "name": f"Squash Court {uuid.uuid4().hex[:6]}",
        "sport_type": "squash",
        "hourly_rate": "30.00",
        "walk_in_rate": "45.00",
        "is_active": True,
    }

    # Receptionist creation attempt -> 403
    rec_res = client.post("/api/v1/courts", json=court_payload, headers=receptionist_headers)
    assert rec_res.status_code == 403

    # Owner creation -> 201
    owner_res = client.post("/api/v1/courts", json=court_payload, headers=owner_headers)
    assert owner_res.status_code == 201
    assert owner_res.json()["name"] == court_payload["name"]
    assert Decimal(str(owner_res.json()["walk_in_rate"])) == Decimal("45.00")


def test_booking_inactive_court_rejected(receptionist_headers):
    """Booking an inactive or maintenance court is strictly rejected with 400 Bad Request."""
    court = create_test_court(name="Maintenance Court", is_active=False)
    member = create_test_member()
    future_start = (datetime.now(timezone.utc) + timedelta(days=2)).replace(hour=10, minute=0, second=0, microsecond=0)

    res = client.post(
        "/api/v1/bookings",
        json={"court_id": str(court.id), "member_id": str(member.id), "start_time": future_start.isoformat()},
        headers=receptionist_headers,
    )
    assert res.status_code == 400
    assert "inactive or under maintenance" in res.json()["detail"]


# ---------------------------------------------------------------------------
# 2. Standard Booking Creation, Durations & Walk-in Support
# ---------------------------------------------------------------------------
def test_member_self_booking_duration_and_discount(member_headers, member_user):
    """
    Authenticated member books for themselves:
    - 60-min derived end time
    - 50% Gold discount applied ($40 hourly rate -> $20.00 fee)
    """
    court = create_test_court(hourly_rate=40.00)
    member = create_test_member(plan_name="Gold", user_id=member_user.id)
    slot_time = (datetime.now(timezone.utc) + timedelta(days=3)).replace(hour=14, minute=0, second=0, microsecond=0)

    res = client.post(
        "/api/v1/bookings",
        json={"court_id": str(court.id), "member_id": str(member.id), "start_time": slot_time.isoformat()},
        headers=member_headers,
    )
    assert res.status_code == 201
    booking = res.json()
    assert booking["status"] == "confirmed"
    assert Decimal(str(booking["calculated_fee"])) == Decimal("20.00")
    # Derived 60 minutes
    assert datetime.fromisoformat(booking["end_time"]) == slot_time + timedelta(minutes=60)


def test_receptionist_walk_in_booking(receptionist_headers):
    """
    Receptionist creates a booking for a walk-in guest without a member profile:
    - member_id = None
    - Charged court.walk_in_rate ($55.00)
    - Records walk_in_name and walk_in_phone
    """
    court = create_test_court(hourly_rate=40.00, walk_in_rate=55.00)
    slot_time = (datetime.now(timezone.utc) + timedelta(days=4)).replace(hour=16, minute=30, second=0, microsecond=0)

    payload = {
        "court_id": str(court.id),
        "member_id": None,
        "start_time": slot_time.isoformat(),
        "walk_in_name": "Bob Walkin",
        "walk_in_phone": "+15554321",
        "notes": "Counter payment received",
    }
    res = client.post("/api/v1/bookings", json=payload, headers=receptionist_headers)
    assert res.status_code == 201
    booking = res.json()
    assert booking["member_id"] is None
    assert booking["walk_in_name"] == "Bob Walkin"
    assert booking["walk_in_phone"] == "+15554321"
    assert Decimal(str(booking["calculated_fee"])) == Decimal("55.00")


def test_member_cannot_create_walkin_booking(member_headers):
    """An ordinary member cannot bypass identity by attempting to create a walk-in booking (member_id = None)."""
    court = create_test_court()
    slot_time = (datetime.now(timezone.utc) + timedelta(days=4)).replace(hour=11, minute=0, second=0, microsecond=0)

    res = client.post(
        "/api/v1/bookings",
        json={"court_id": str(court.id), "member_id": None, "start_time": slot_time.isoformat()},
        headers=member_headers,
    )
    assert res.status_code in (400, 403)


# ---------------------------------------------------------------------------
# 3. Scheduling, Overlap & Daily Quota Invariants
# ---------------------------------------------------------------------------
def test_overlap_conflict_rejection(receptionist_headers):
    """Overlapping bookings on the same court must be rejected with 409 Conflict."""
    court = create_test_court()
    member1 = create_test_member()
    member2 = create_test_member()
    t0 = (datetime.now(timezone.utc) + timedelta(days=5)).replace(hour=9, minute=0, second=0, microsecond=0)

    # First booking: 09:00 - 10:00
    res1 = client.post(
        "/api/v1/bookings",
        json={"court_id": str(court.id), "member_id": str(member1.id), "start_time": t0.isoformat()},
        headers=receptionist_headers,
    )
    assert res1.status_code == 201

    # Overlapping attempt: 09:30 - 10:30 on same court -> 409 Conflict
    t_overlap = t0 + timedelta(minutes=30)
    res2 = client.post(
        "/api/v1/bookings",
        json={"court_id": str(court.id), "member_id": str(member2.id), "start_time": t_overlap.isoformat()},
        headers=receptionist_headers,
    )
    assert res2.status_code == 409
    assert "already booked" in res2.json()["detail"]


def test_adjacent_bookings_same_court_permitted(receptionist_headers):
    """Adjacent sessions (e.g. 09:00-10:00 and 10:00-11:00) do NOT overlap and must succeed."""
    court = create_test_court()
    member1 = create_test_member()
    member2 = create_test_member()
    t0 = (datetime.now(timezone.utc) + timedelta(days=6)).replace(hour=9, minute=0, second=0, microsecond=0)
    t_adjacent = t0 + timedelta(minutes=60)

    res1 = client.post(
        "/api/v1/bookings",
        json={"court_id": str(court.id), "member_id": str(member1.id), "start_time": t0.isoformat()},
        headers=receptionist_headers,
    )
    assert res1.status_code == 201

    res2 = client.post(
        "/api/v1/bookings",
        json={"court_id": str(court.id), "member_id": str(member2.id), "start_time": t_adjacent.isoformat()},
        headers=receptionist_headers,
    )
    assert res2.status_code == 201


def test_daily_quota_max_two_bookings_and_release_on_cancel(receptionist_headers):
    """
    Daily quota rule:
    - Member can make at most 2 active standard bookings per calendar day.
    - 3rd booking on the same day is rejected with 400 Bad Request.
    - Cancelling one booking releases the quota, allowing another booking.
    """
    court1 = create_test_court(name="Quota Court 1")
    court2 = create_test_court(name="Quota Court 2")
    court3 = create_test_court(name="Quota Court 3")
    member = create_test_member()

    day = (datetime.now(timezone.utc) + timedelta(days=7)).replace(second=0, microsecond=0)
    slot1 = day.replace(hour=8, minute=0)
    slot2 = day.replace(hour=10, minute=0)
    slot3 = day.replace(hour=14, minute=0)

    # 1. First booking -> OK
    res1 = client.post(
        "/api/v1/bookings",
        json={"court_id": str(court1.id), "member_id": str(member.id), "start_time": slot1.isoformat()},
        headers=receptionist_headers,
    )
    assert res1.status_code == 201
    b1_id = res1.json()["id"]

    # 2. Second booking -> OK
    res2 = client.post(
        "/api/v1/bookings",
        json={"court_id": str(court2.id), "member_id": str(member.id), "start_time": slot2.isoformat()},
        headers=receptionist_headers,
    )
    assert res2.status_code == 201

    # 3. Third booking on same day -> 400 Bad Request (Quota exceeded)
    res3 = client.post(
        "/api/v1/bookings",
        json={"court_id": str(court3.id), "member_id": str(member.id), "start_time": slot3.isoformat()},
        headers=receptionist_headers,
    )
    assert res3.status_code == 400
    assert "maximum limit of 2 active bookings" in res3.json()["detail"]

    # 4. Cancel booking 1
    cancel_res = client.post(f"/api/v1/bookings/{b1_id}/cancel", headers=receptionist_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"
    assert cancel_res.json()["cancelled_at"] is not None

    # 5. Now third slot can be booked because quota was released
    res3_retry = client.post(
        "/api/v1/bookings",
        json={"court_id": str(court3.id), "member_id": str(member.id), "start_time": slot3.isoformat()},
        headers=receptionist_headers,
    )
    assert res3_retry.status_code == 201


# ---------------------------------------------------------------------------
# 4. Real-Time Court Availability Endpoint
# ---------------------------------------------------------------------------
def test_real_time_court_availability(receptionist_headers):
    """
    GET /api/v1/bookings/availability:
    Returns 30-min slot intervals from 06:00 to 21:00.
    Occupied slots are marked is_available = False with booking_id.
    """
    court = create_test_court(name="Avail Court")
    member = create_test_member()
    target_date = date.today() + timedelta(days=8)
    slot_time = datetime(target_date.year, target_date.month, target_date.day, 10, 0, 0, tzinfo=timezone.utc)

    # Book 10:00 - 11:00
    b_res = client.post(
        "/api/v1/bookings",
        json={"court_id": str(court.id), "member_id": str(member.id), "start_time": slot_time.isoformat()},
        headers=receptionist_headers,
    )
    assert b_res.status_code == 201
    booking_id = b_res.json()["id"]

    # Check availability
    res = client.get("/api/v1/bookings/availability", params={"date": target_date.isoformat(), "court_id": str(court.id)})
    assert res.status_code == 200
    avail_list = res.json()
    assert len(avail_list) == 1
    court_avail = avail_list[0]
    assert court_avail["court_id"] == str(court.id)

    # Find the 10:00 slot
    slot_1000 = next(s for s in court_avail["slots"] if s["start_time"].startswith(f"{target_date.isoformat()}T10:00"))
    assert slot_1000["is_available"] is False
    assert slot_1000["booking_id"] == booking_id

    # The 09:30 slot also overlaps (09:30 - 10:30 overlaps with 10:00 - 11:00)
    slot_0930 = next(s for s in court_avail["slots"] if s["start_time"].startswith(f"{target_date.isoformat()}T09:30"))
    assert slot_0930["is_available"] is False

    # The 11:00 slot is completely free
    slot_1100 = next(s for s in court_avail["slots"] if s["start_time"].startswith(f"{target_date.isoformat()}T11:00"))
    assert slot_1100["is_available"] is True


# ---------------------------------------------------------------------------
# 5. Friday Social Play Workflows & Concurrency
# ---------------------------------------------------------------------------
def test_social_play_session_lifecycle(receptionist_headers):
    """
    Staff creates a social play session with capacity of 4:
    - Lists scheduled sessions
    - Members join up to capacity
    - Duplicate join is rejected (409)
    - Excess join over capacity is rejected (409)
    - Leaving session frees up capacity
    - Cancelling session updates all participants
    """
    court = create_test_court(name="Social Court")
    target_date = date.today() + timedelta(days=9)
    start_t = datetime(target_date.year, target_date.month, target_date.day, 18, 0, 0, tzinfo=timezone.utc)
    end_t = start_t + timedelta(hours=2)

    # 1. Staff schedules session
    session_payload = {
        "court_id": str(court.id),
        "title": "Friday Tennis Social",
        "start_time": start_t.isoformat(),
        "end_time": end_t.isoformat(),
        "max_capacity": 3,
        "fee_per_participant": "10.00",
    }
    s_res = client.post("/api/v1/bookings/social-sessions", json=session_payload, headers=receptionist_headers)
    assert s_res.status_code == 201
    session = s_res.json()
    session_id = session["id"]
    assert session["max_capacity"] == 3
    assert session["active_participants_count"] == 0

    # 2. Member 1 joins
    m1 = create_test_member(full_name="Social Member 1")
    j1 = client.post(
        f"/api/v1/bookings/social-sessions/{session_id}/join",
        params={"member_id": str(m1.id)},
        headers=receptionist_headers,
    )
    assert j1.status_code == 201
    assert j1.json()["status"] == "joined"

    # 3. Duplicate join attempt -> 409 Conflict
    dup_res = client.post(
        f"/api/v1/bookings/social-sessions/{session_id}/join",
        params={"member_id": str(m1.id)},
        headers=receptionist_headers,
    )
    assert dup_res.status_code == 409
    assert "already registered" in dup_res.json()["detail"]

    # 4. Member 2 and Member 3 join (filling capacity to 3/3)
    m2 = create_test_member(full_name="Social Member 2")
    m3 = create_test_member(full_name="Social Member 3")
    client.post(f"/api/v1/bookings/social-sessions/{session_id}/join", params={"member_id": str(m2.id)}, headers=receptionist_headers)
    client.post(f"/api/v1/bookings/social-sessions/{session_id}/join", params={"member_id": str(m3.id)}, headers=receptionist_headers)

    # 5. Member 4 tries to join -> 409 Conflict (Capacity reached)
    m4 = create_test_member(full_name="Social Member 4")
    full_res = client.post(
        f"/api/v1/bookings/social-sessions/{session_id}/join",
        params={"member_id": str(m4.id)},
        headers=receptionist_headers,
    )
    assert full_res.status_code == 409
    assert "maximum capacity" in full_res.json()["detail"]

    # 6. Member 1 leaves session -> frees 1 spot
    leave_res = client.post(
        f"/api/v1/bookings/social-sessions/{session_id}/leave",
        params={"member_id": str(m1.id)},
        headers=receptionist_headers,
    )
    assert leave_res.status_code == 200
    assert leave_res.json()["status"] == "cancelled"

    # 7. Member 4 can now successfully join
    j4 = client.post(
        f"/api/v1/bookings/social-sessions/{session_id}/join",
        params={"member_id": str(m4.id)},
        headers=receptionist_headers,
    )
    assert j4.status_code == 201


def test_social_session_blocks_standard_booking_collision(receptionist_headers):
    """A scheduled social session blocks regular private court booking attempts during its time window."""
    court = create_test_court(name="Reserved Social Court")
    target_date = date.today() + timedelta(days=10)
    start_t = datetime(target_date.year, target_date.month, target_date.day, 17, 0, 0, tzinfo=timezone.utc)
    end_t = start_t + timedelta(hours=2)

    # Create social session: 17:00 - 19:00
    client.post(
        "/api/v1/bookings/social-sessions",
        json={
            "court_id": str(court.id),
            "title": "Community Friday Play",
            "start_time": start_t.isoformat(),
            "end_time": end_t.isoformat(),
            "max_capacity": 6,
        },
        headers=receptionist_headers,
    )

    # Attempt standard private booking on same court at 17:30 -> 409 Conflict
    member = create_test_member()
    res = client.post(
        "/api/v1/bookings",
        json={
            "court_id": str(court.id),
            "member_id": str(member.id),
            "start_time": (start_t + timedelta(minutes=30)).isoformat(),
        },
        headers=receptionist_headers,
    )
    assert res.status_code == 409
    assert "reserved for social play" in res.json()["detail"]


def test_social_play_does_not_consume_member_daily_booking_quota(receptionist_headers):
    """
    Business Rule Verification:
    Social play participation is separate from private court reservations
    and does NOT consume the member's 2 standard bookings per day.
    """
    court = create_test_court()
    member = create_test_member()
    target_date = date.today() + timedelta(days=11)

    # 1. Member joins social play session
    social_start = datetime(target_date.year, target_date.month, target_date.day, 18, 0, 0, tzinfo=timezone.utc)
    s_res = client.post(
        "/api/v1/bookings/social-sessions",
        json={
            "court_id": str(court.id),
            "title": "Community Play",
            "start_time": social_start.isoformat(),
            "end_time": (social_start + timedelta(hours=1)).isoformat(),
            "max_capacity": 8,
        },
        headers=receptionist_headers,
    )
    session_id = s_res.json()["id"]
    client.post(f"/api/v1/bookings/social-sessions/{session_id}/join", params={"member_id": str(member.id)}, headers=receptionist_headers)

    # 2. Member still has full quota to create 2 standard court bookings on that day!
    court_a = create_test_court(name="Court A")
    court_b = create_test_court(name="Court B")

    b1 = client.post(
        "/api/v1/bookings",
        json={"court_id": str(court_a.id), "member_id": str(member.id), "start_time": datetime(target_date.year, target_date.month, target_date.day, 8, 0, 0, tzinfo=timezone.utc).isoformat()},
        headers=receptionist_headers,
    )
    assert b1.status_code == 201

    b2 = client.post(
        "/api/v1/bookings",
        json={"court_id": str(court_b.id), "member_id": str(member.id), "start_time": datetime(target_date.year, target_date.month, target_date.day, 10, 0, 0, tzinfo=timezone.utc).isoformat()},
        headers=receptionist_headers,
    )
    assert b2.status_code == 201
