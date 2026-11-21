import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from fastapi.testclient import TestClient

from app.core.jwt import create_access_token
from app.core.security import hash_password
from app.main import app
from app.models import Member, Role, RoleEnum, User
from tests.conftest import TestingSessionLocal

client = TestClient(app)


def _get_or_create_fixtures(owner_headers):
    """Helper to create an isolated member and court for each test."""
    plans = client.get("/api/v1/members/plans").json()
    gold_plan = next(p for p in plans if p["name"] == "Gold")

    member_email = f"booking.test.{uuid.uuid4().hex[:8]}@example.com"
    member = client.post(
        "/api/v1/members",
        headers=owner_headers,
        json={
            "full_name": "Booking Test Member",
            "email": member_email,
            "plan_id": gold_plan["id"],
        },
    ).json()

    court_name = f"Court {uuid.uuid4().hex[:8]}"
    court = client.post(
        "/api/v1/courts",
        headers=owner_headers,
        json={
            "name": court_name,
            "sport_type": "tennis",
            "hourly_rate": 40.00,
            "is_active": True,
        },
    ).json()

    return member, court


def test_create_booking_success(owner_headers):
    """
    Verify creating a valid booking:
    - 60-min derived end time
    - 50% Gold discount on $40 rate -> $20.00 fee
    """
    member, court = _get_or_create_fixtures(owner_headers)
    start = datetime(2026, 12, 1, 10, 0, 0, tzinfo=timezone.utc)

    response = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "member_id": member["id"],
            "court_id": court["id"],
            "start_time": start.isoformat(),
            "notes": "Morning practice",
        },
    )
    assert response.status_code == 201
    booking = response.json()
    assert booking["status"] == "confirmed"
    assert Decimal(str(booking["calculated_fee"])) == Decimal("20.00")
    # Verify derived 60-minute duration using timezone-aware comparison
    expected_end = start + timedelta(minutes=60)
    actual_end = datetime.fromisoformat(booking["end_time"])
    assert actual_end == expected_end
    assert booking["member"]["full_name"] == member["full_name"]
    assert booking["court"]["name"] == court["name"]


def test_reject_invalid_minute_boundary(owner_headers):
    """Verify that start times not on :00 or :30 are rejected with 400 Bad Request."""
    member, court = _get_or_create_fixtures(owner_headers)
    invalid_start = datetime(2026, 12, 1, 14, 15, 0, tzinfo=timezone.utc)

    response = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "member_id": member["id"],
            "court_id": court["id"],
            "start_time": invalid_start.isoformat(),
        },
    )
    assert response.status_code == 400
    assert "30-minute boundary" in response.json()["detail"]


def test_reject_same_court_exact_and_partial_overlap(owner_headers):
    """Verify that overlapping bookings on the same court return 409 Conflict."""
    member1, court = _get_or_create_fixtures(owner_headers)
    plans = client.get("/api/v1/members/plans").json()
    member2 = client.post(
        "/api/v1/members",
        headers=owner_headers,
        json={
            "full_name": "Rival Player",
            "email": f"rival.{uuid.uuid4().hex[:8]}@example.com",
            "plan_id": plans[0]["id"],
        },
    ).json()

    # Slot 1: 16:00 - 17:00
    start1 = datetime(2026, 12, 2, 16, 0, 0, tzinfo=timezone.utc)
    res1 = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "member_id": member1["id"],
            "court_id": court["id"],
            "start_time": start1.isoformat(),
        },
    )
    assert res1.status_code == 201

    # Exact overlap: 16:00 - 17:00 -> 409
    res_exact = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "member_id": member2["id"],
            "court_id": court["id"],
            "start_time": start1.isoformat(),
        },
    )
    assert res_exact.status_code == 409
    assert "already booked" in res_exact.json()["detail"]

    # Partial overlap: 16:30 - 17:30 -> 409
    start_partial = datetime(2026, 12, 2, 16, 30, 0, tzinfo=timezone.utc)
    res_partial = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "member_id": member2["id"],
            "court_id": court["id"],
            "start_time": start_partial.isoformat(),
        },
    )
    assert res_partial.status_code == 409
    assert "already booked" in res_partial.json()["detail"]


def test_allow_adjacent_bookings_same_court(owner_headers):
    """Verify that consecutive adjacent slots (10:00-11:00 and 11:00-12:00) succeed without conflict."""
    member1, court = _get_or_create_fixtures(owner_headers)
    plans = client.get("/api/v1/members/plans").json()
    member2 = client.post(
        "/api/v1/members",
        headers=owner_headers,
        json={
            "full_name": "Next Player",
            "email": f"next.{uuid.uuid4().hex[:8]}@example.com",
            "plan_id": plans[0]["id"],
        },
    ).json()

    start1 = datetime(2026, 12, 3, 10, 0, 0, tzinfo=timezone.utc)
    start2 = datetime(2026, 12, 3, 11, 0, 0, tzinfo=timezone.utc)

    res1 = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "member_id": member1["id"],
            "court_id": court["id"],
            "start_time": start1.isoformat(),
        },
    )
    assert res1.status_code == 201

    res2 = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "member_id": member2["id"],
            "court_id": court["id"],
            "start_time": start2.isoformat(),
        },
    )
    assert res2.status_code == 201


def test_reject_third_booking_same_day(owner_headers):
    """Verify that a member cannot have more than 2 active bookings on the same calendar day."""
    member, court1 = _get_or_create_fixtures(owner_headers)
    court2 = client.post(
        "/api/v1/courts",
        headers=owner_headers,
        json={
            "name": f"Court 2 {uuid.uuid4().hex[:6]}",
            "sport_type": "tennis",
            "hourly_rate": 40.00,
        },
    ).json()

    day = datetime(2026, 12, 10, 8, 0, 0, tzinfo=timezone.utc)

    # Booking 1: 08:00 - 09:00
    res1 = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "member_id": member["id"],
            "court_id": court1["id"],
            "start_time": day.isoformat(),
        },
    )
    assert res1.status_code == 201

    # Booking 2: 10:00 - 11:00
    res2 = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "member_id": member["id"],
            "court_id": court2["id"],
            "start_time": (day + timedelta(hours=2)).isoformat(),
        },
    )
    assert res2.status_code == 201

    # Booking 3: 14:00 - 15:00 on the same day -> MUST FAIL
    res3 = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "member_id": member["id"],
            "court_id": court1["id"],
            "start_time": (day + timedelta(hours=5)).isoformat(),
        },
    )
    assert res3.status_code == 400
    assert "maximum limit of 2 active bookings" in res3.json()["detail"]


def test_cancellation_releases_court_slot(owner_headers):
    """Verify that cancelling a booking frees the slot so another booking can take it."""
    member1, court = _get_or_create_fixtures(owner_headers)
    plans = client.get("/api/v1/members/plans").json()
    member2 = client.post(
        "/api/v1/members",
        headers=owner_headers,
        json={
            "full_name": "Second Booker",
            "email": f"second.{uuid.uuid4().hex[:8]}@example.com",
            "plan_id": plans[0]["id"],
        },
    ).json()

    slot_time = datetime(2026, 12, 4, 18, 0, 0, tzinfo=timezone.utc)

    # Member 1 books
    res1 = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "member_id": member1["id"],
            "court_id": court["id"],
            "start_time": slot_time.isoformat(),
        },
    )
    assert res1.status_code == 201
    booking1_id = res1.json()["id"]

    # Member 2 tries -> rejected
    conflict_res = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "member_id": member2["id"],
            "court_id": court["id"],
            "start_time": slot_time.isoformat(),
        },
    )
    assert conflict_res.status_code == 409

    # Member 1 cancels
    cancel_res = client.post(f"/api/v1/bookings/{booking1_id}/cancel", headers=owner_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"

    # Member 2 tries again -> now succeeds!
    success_res = client.post(
        "/api/v1/bookings",
        headers=owner_headers,
        json={
            "member_id": member2["id"],
            "court_id": court["id"],
            "start_time": slot_time.isoformat(),
        },
    )
    assert success_res.status_code == 201
    assert success_res.json()["status"] == "confirmed"


def test_booking_resource_ownership(owner_headers):
    """
    Verify object-level booking authorization rules:
    - Member with no linked member profile cannot book (400).
    - Member attempting to book for another member is forbidden (403).
    - Member can book for their own profile (201).
    - Member can only cancel their own booking (403 on cancelling another's).
    """
    db = TestingSessionLocal()
    try:
        # Create court
        court = client.post(
            "/api/v1/courts",
            headers=owner_headers,
            json={"name": f"Court {uuid.uuid4().hex[:6]}", "sport_type": "tennis", "hourly_rate": 40.00},
        ).json()
        plan = client.get("/api/v1/members/plans").json()[0]

        # 1. User without linked member profile
        user_unlinked = User(
            email=f"unlinked_{uuid.uuid4().hex[:6]}@example.com",
            hashed_password=hash_password("Pass123!"),
            full_name="Unlinked User",
            is_active=True,
            token_version=1,
        )
        mem_role = db.query(Role).filter(Role.name == RoleEnum.MEMBER.value).first()
        user_unlinked.roles.append(mem_role)
        db.add(user_unlinked)

        # 2. User A linked to Member Profile A
        user_a = User(
            email=f"linked_a_{uuid.uuid4().hex[:6]}@example.com",
            hashed_password=hash_password("Pass123!"),
            full_name="Linked User A",
            is_active=True,
            token_version=1,
        )
        user_a.roles.append(mem_role)
        db.add(user_a)
        db.commit()
        db.refresh(user_a)

        member_a = Member(
            full_name="Linked Member A",
            email=user_a.email,
            plan_id=plan["id"],
            start_date="2026-01-01",
            expiry_date="2027-01-01",
            user_id=user_a.id,
        )
        db.add(member_a)

        # 3. User B linked to Member Profile B
        user_b = User(
            email=f"linked_b_{uuid.uuid4().hex[:6]}@example.com",
            hashed_password=hash_password("Pass123!"),
            full_name="Linked User B",
            is_active=True,
            token_version=1,
        )
        user_b.roles.append(mem_role)
        db.add(user_b)
        db.commit()
        db.refresh(user_b)

        member_b = Member(
            full_name="Linked Member B",
            email=user_b.email,
            plan_id=plan["id"],
            start_date="2026-01-01",
            expiry_date="2027-01-01",
            user_id=user_b.id,
        )
        db.add(member_b)
        db.commit()
        db.refresh(member_a)
        db.refresh(member_b)

        token_unlinked = create_access_token(user_id=user_unlinked.id, token_version=user_unlinked.token_version)
        token_a = create_access_token(user_id=user_a.id, token_version=user_a.token_version)
        token_b = create_access_token(user_id=user_b.id, token_version=user_b.token_version)

        slot_time = datetime(2026, 12, 20, 10, 0, 0, tzinfo=timezone.utc).isoformat()

        # Unlinked user cannot book (400)
        res_unlinked = client.post(
            "/api/v1/bookings",
            headers={"Authorization": f"Bearer {token_unlinked}"},
            json={"member_id": str(member_a.id), "court_id": court["id"], "start_time": slot_time},
        )
        assert res_unlinked.status_code == 400
        assert "link or activate a club member profile" in res_unlinked.json()["detail"]

        # User A cannot book for Member B (403)
        res_forbid = client.post(
            "/api/v1/bookings",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"member_id": str(member_b.id), "court_id": court["id"], "start_time": slot_time},
        )
        assert res_forbid.status_code == 403
        assert "only book courts for your own member profile" in res_forbid.json()["detail"]

        # User A books for Member A (201)
        res_own = client.post(
            "/api/v1/bookings",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"member_id": str(member_a.id), "court_id": court["id"], "start_time": slot_time},
        )
        assert res_own.status_code == 201
        booking_id = res_own.json()["id"]

        # User B cannot cancel User A's booking (403)
        res_cancel_b = client.post(
            f"/api/v1/bookings/{booking_id}/cancel",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert res_cancel_b.status_code == 403

        # User A cancels own booking (200)
        res_cancel_a = client.post(
            f"/api/v1/bookings/{booking_id}/cancel",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res_cancel_a.status_code == 200
        assert res_cancel_a.json()["status"] == "cancelled"
    finally:
        db.close()
