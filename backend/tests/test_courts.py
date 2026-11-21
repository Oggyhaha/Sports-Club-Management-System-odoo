import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_list_courts_returns_seeded_courts():
    """Verify that courts endpoint lists the default seeded courts."""
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


def test_create_and_get_court():
    """Verify creating a new court and retrieving it by UUID."""
    unique_name = f"Padel Court {uuid.uuid4().hex[:6]}"
    payload = {
        "name": unique_name,
        "sport_type": "padel",
        "hourly_rate": 35.00,
        "is_active": True,
    }

    create_res = client.post("/api/v1/courts", json=payload)
    assert create_res.status_code == 201
    court = create_res.json()
    assert court["name"] == unique_name
    assert court["sport_type"] == "padel"
    assert Decimal(str(court["hourly_rate"])) == Decimal("35.00")
    assert court["is_active"] is True
    assert "id" in court

    court_id = court["id"]

    # Fetch by ID
    get_res = client.get(f"/api/v1/courts/{court_id}")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["id"] == court_id
    assert fetched["name"] == unique_name


def test_create_court_duplicate_name_conflict():
    """Verify that creating a court with an existing name returns 409 Conflict."""
    payload = {
        "name": "Tennis Court 1",  # already exists from seed
        "sport_type": "tennis",
        "hourly_rate": 40.00,
    }
    response = client.post("/api/v1/courts", json=payload)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_create_court_invalid_hourly_rate():
    """Verify that a negative hourly rate is rejected with 422 Unprocessable Entity."""
    payload = {
        "name": f"Invalid Rate Court {uuid.uuid4().hex[:4]}",
        "sport_type": "tennis",
        "hourly_rate": -10.00,
    }
    response = client.post("/api/v1/courts", json=payload)
    assert response.status_code == 422


def test_get_court_not_found():
    """Verify that querying a random UUID returns 404 Not Found."""
    random_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/courts/{random_id}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_update_court():
    """Verify updating court hourly rate and active status."""
    unique_name = f"Court To Update {uuid.uuid4().hex[:6]}"
    create_res = client.post(
        "/api/v1/courts",
        json={
            "name": unique_name,
            "sport_type": "tennis",
            "hourly_rate": 40.00,
            "is_active": True,
        },
    )
    assert create_res.status_code == 201
    court_id = create_res.json()["id"]

    # Update hourly rate and deactivate court
    update_res = client.put(
        f"/api/v1/courts/{court_id}",
        json={
            "hourly_rate": 55.00,
            "is_active": False,
        },
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert Decimal(str(updated["hourly_rate"])) == Decimal("55.00")
    assert updated["is_active"] is False
