import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_list_courts_returns_seeded_courts():
    """Verify that courts endpoint is public and lists default seeded courts."""
    response = client.get("/api/v1/courts")
    assert response.status_code == 200
    courts = response.json()
    assert len(courts) >= 3
    court_names = [c["name"] for c in courts]
    assert "Tennis Court 1" in court_names
    assert "Tennis Court 2" in court_names
    assert "Cricket Net A" in court_names


def test_list_courts_filter_by_sport():
    """Verify filtering courts by sport_type query parameter."""
    res_tennis = client.get("/api/v1/courts", params={"sport_type": "tennis"})
    assert res_tennis.status_code == 200
    tennis_courts = res_tennis.json()
    assert all(c["sport_type"] == "tennis" for c in tennis_courts)

    res_cricket = client.get("/api/v1/courts", params={"sport_type": "cricket"})
    assert res_cricket.status_code == 200
    cricket_courts = res_cricket.json()
    assert all(c["sport_type"] == "cricket" for c in cricket_courts)


def test_create_and_get_court(owner_headers):
    """Verify owner creating a new court and retrieving it by UUID."""
    unique_name = f"Padel Court {uuid.uuid4().hex[:6]}"
    payload = {
        "name": unique_name,
        "sport_type": "padel",
        "hourly_rate": 35.00,
        "is_active": True,
    }

    create_res = client.post("/api/v1/courts", json=payload, headers=owner_headers)
    assert create_res.status_code == 201
    court = create_res.json()
    assert court["name"] == unique_name
    assert court["sport_type"] == "padel"
    assert Decimal(str(court["hourly_rate"])) == Decimal("35.00")
    assert court["is_active"] is True

    court_id = court["id"]

    # Public get
    get_res = client.get(f"/api/v1/courts/{court_id}")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["id"] == court_id
    assert fetched["name"] == unique_name


def test_create_court_duplicate_name_conflict(owner_headers):
    """Verify that creating a court with an existing name returns 409 Conflict."""
    unique_name = f"Duplicate Court {uuid.uuid4().hex[:6]}"
    payload = {
        "name": unique_name,
        "sport_type": "tennis",
        "hourly_rate": 45.00,
    }

    res1 = client.post("/api/v1/courts", json=payload, headers=owner_headers)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/courts", json=payload, headers=owner_headers)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_create_court_negative_hourly_rate(owner_headers):
    """Verify that negative hourly rate is rejected by Pydantic with 422 Unprocessable Entity."""
    payload = {
        "name": f"Invalid Rate Court {uuid.uuid4().hex[:6]}",
        "sport_type": "tennis",
        "hourly_rate": -10.00,
    }
    response = client.post("/api/v1/courts", json=payload, headers=owner_headers)
    assert response.status_code == 422


def test_get_court_not_found():
    """Verify that querying a random UUID returns 404 Not Found."""
    random_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/courts/{random_id}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_update_court(receptionist_headers, owner_headers):
    """Verify staff updating court details, hourly rate, and active status."""
    unique_name = f"Update Court {uuid.uuid4().hex[:6]}"
    create_res = client.post(
        "/api/v1/courts",
        headers=owner_headers,
        json={
            "name": unique_name,
            "sport_type": "badminton",
            "hourly_rate": 20.00,
        },
    )
    assert create_res.status_code == 201
    court_id = create_res.json()["id"]

    # Receptionist updates rate and deactivates court
    update_res = client.put(
        f"/api/v1/courts/{court_id}",
        headers=receptionist_headers,
        json={
            "hourly_rate": 25.00,
            "is_active": False,
        },
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert Decimal(str(updated["hourly_rate"])) == Decimal("25.00")
    assert updated["is_active"] is False


def test_receptionist_forbidden_from_creating_court(receptionist_headers):
    """Verify that receptionist cannot create a new court (Owner only)."""
    payload = {
        "name": f"Unauthorized Court {uuid.uuid4().hex[:6]}",
        "sport_type": "tennis",
        "hourly_rate": 40.00,
    }
    res = client.post("/api/v1/courts", json=payload, headers=receptionist_headers)
    assert res.status_code == 403
