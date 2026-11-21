import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _get_or_create_fixtures():
    """Helper to create an isolated member and court for each test."""
    plans = client.get("/api/v1/members/plans").json()
    gold_plan = next(p for p in plans if p["name"] == "Gold")

    member_email = f"booking.test.{uuid.uuid4().hex[:8]}@example.com"
    member = client.post(
        "/api/v1/members",
        json={
            "full_name": "Booking Test Member",
            "email": member_email,
            "plan_id": gold_plan["id"],
        },
    ).json()

    court_name = f"Court {uuid.uuid4().hex[:8]}"
    court = client.post(
        "/api/v1/courts",
        json={
            "name": court_name,
            "sport_type": "tennis",
            "hourly_rate": 40.00,
            "is_active": True,
        },
    ).json()

    return member, court


def test_create_booking_success():
    """
    Verify creating a valid booking:
    - 60-min derived end time
    - 50% Gold discount on $40 rate -> $20.00 fee
    """
    member, court = _get_or_create_fixtures()
    start = datetime(2026, 12, 1, 10, 0, 0, tzinfo=timezone.utc)

    response = client.post(
        "/api/v1/bookings",
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


def test_reject_invalid_minute_boundary():
    """Verify that start times not on :00 or :30 are rejected with 400 Bad Request."""
    member, court = _get_or_create_fixtures()
    invalid_start = datetime(2026, 12, 1, 14, 15, 0, tzinfo=timezone.utc)  # :15 is invalid

    response = client.post(
        "/api/v1/bookings",
        json={
            "member_id": member["id"],
            "court_id": court["id"],
            "start_time": invalid_start.isoformat(),
        },
    )
    assert response.status_code == 400
    assert "30-minute boundary" in response.json()["detail"]


def test_reject_same_court_exact_and_partial_overlap():
    """Verify that overlapping bookings on the same court return 409 Conflict."""
    member1, court = _get_or_create_fixtures()
    plans = client.get("/api/v1/members/plans").json()
    member2 = client.post(
        "/api/v1/members",
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
        json={
            "member_id": member1["id"],
            "court_id": court["id"],
            "start_time": start1.isoformat(),
        },
    )
    assert res1.status_code == 201

    # Exact overlap attempt: 16:00 - 17:00 -> 409 Conflict
    res_exact = client.post(
        "/api/v1/bookings",
        json={
            "member_id": member2["id"],
            "court_id": court["id"],
            "start_time": start1.isoformat(),
        },
    )
    assert res_exact.status_code == 409
    assert "already booked" in res_exact.json()["detail"]

    # Partial overlap attempt: 16:30 - 17:30 -> 409 Conflict
    start_partial = datetime(2026, 12, 2, 16, 30, 0, tzinfo=timezone.utc)
    res_partial = client.post(
        "/api/v1/bookings",
        json={
            "member_id": member2["id"],
            "court_id": court["id"],
            "start_time": start_partial.isoformat(),
        },
    )
    assert res_partial.status_code == 409
    assert "already booked" in res_partial.json()["detail"]


def test_accept_adjacent_booking():
    """Verify that adjacent slot (17:00 - 18:00 immediately following 16:00 - 17:00) succeeds."""
    member, court = _get_or_create_fixtures()
    start1 = datetime(2026, 12, 2, 16, 0, 0, tzinfo=timezone.utc)
    adjacent_start = datetime(2026, 12, 2, 17, 0, 0, tzinfo=timezone.utc)

    # First booking
    res1 = client.post(
        "/api/v1/bookings",
        json={
            "member_id": member["id"],
            "court_id": court["id"],
            "start_time": start1.isoformat(),
        },
    )
    assert res1.status_code == 201

    # Adjacent booking immediately after
    res2 = client.post(
        "/api/v1/bookings",
        json={
            "member_id": member["id"],
            "court_id": court["id"],
            "start_time": adjacent_start.isoformat(),
        },
    )
    assert res2.status_code == 201


def test_reject_third_booking_same_day():
    """Verify that a member cannot have more than 2 active bookings on the same calendar day."""
    member, court1 = _get_or_create_fixtures()
    # Create a second distinct court
    court2 = client.post(
        "/api/v1/courts",
        json={"name": f"Court {uuid.uuid4().hex[:8]}", "sport_type": "tennis", "hourly_rate": 40.00},
    ).json()

    day = datetime(2026, 12, 3, 9, 0, 0, tzinfo=timezone.utc)

    # Booking 1: 09:00 - 10:00
    res1 = client.post(
        "/api/v1/bookings",
        json={
            "member_id": member["id"],
            "court_id": court1["id"],
            "start_time": day.isoformat(),
        },
    )
    assert res1.status_code == 201

    # Booking 2: 11:00 - 12:00
    res2 = client.post(
        "/api/v1/bookings",
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
        json={
            "member_id": member["id"],
            "court_id": court1["id"],
            "start_time": (day + timedelta(hours=5)).isoformat(),
        },
    )
    assert res3.status_code == 400
    assert "maximum limit of 2 active bookings" in res3.json()["detail"]


def test_cancellation_releases_court_slot():
    """Verify that cancelling a booking frees the slot so another booking can take it."""
    member1, court = _get_or_create_fixtures()
    plans = client.get("/api/v1/members/plans").json()
    member2 = client.post(
        "/api/v1/members",
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
        json={
            "member_id": member2["id"],
            "court_id": court["id"],
            "start_time": slot_time.isoformat(),
        },
    )
    assert conflict_res.status_code == 409

    # Member 1 cancels
    cancel_res = client.post(f"/api/v1/bookings/{booking1_id}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"

    # Member 2 tries again -> now succeeds!
    success_res = client.post(
        "/api/v1/bookings",
        json={
            "member_id": member2["id"],
            "court_id": court["id"],
            "start_time": slot_time.isoformat(),
        },
    )
    assert success_res.status_code == 201
    assert success_res.json()["status"] == "confirmed"


def test_reject_booking_nonexistent_member_or_court():
    """Verify 404 when referencing unknown member or court."""
    fake_id = str(uuid.uuid4())
    member, court = _get_or_create_fixtures()
    valid_time = datetime(2026, 12, 5, 10, 0, 0, tzinfo=timezone.utc).isoformat()

    # Fake member
    res_fake_member = client.post(
        "/api/v1/bookings",
        json={"member_id": fake_id, "court_id": court["id"], "start_time": valid_time},
    )
    assert res_fake_member.status_code == 404

    # Fake court
    res_fake_court = client.post(
        "/api/v1/bookings",
        json={"member_id": member["id"], "court_id": fake_id, "start_time": valid_time},
    )
    assert res_fake_court.status_code == 404
