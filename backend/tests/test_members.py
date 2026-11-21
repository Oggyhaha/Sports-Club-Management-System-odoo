import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_membership_plans():
    """Verify that plans endpoint lists the default tiers (Gold, Silver, Junior)."""
    response = client.get("/api/v1/members/plans")
    assert response.status_code == 200
    plans = response.json()
    assert len(plans) >= 3
    plan_names = [p["name"] for p in plans]
    assert "Gold" in plan_names
    assert "Silver" in plan_names
    assert "Junior" in plan_names


def test_create_and_get_member():
    """Verify creating a member with Gold plan and fetching it by UUID."""
    # 1. Fetch Gold plan ID
    plans_res = client.get("/api/v1/members/plans")
    assert plans_res.status_code == 200
    gold_plan = next(p for p in plans_res.json() if p["name"] == "Gold")

    unique_email = f"roger.federer.{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "full_name": "Roger Federer",
        "email": unique_email,
        "phone": "+1-555-0199",
        "plan_id": gold_plan["id"],
    }

    # 2. Register member
    create_res = client.get("/api/v1/members", params={"search": unique_email})
    assert create_res.status_code == 200
    assert len(create_res.json()) == 0

    post_res = client.post("/api/v1/members", json=payload)
    assert post_res.status_code == 201
    member = post_res.json()
    assert member["full_name"] == "Roger Federer"
    assert member["email"] == unique_email
    assert member["plan_id"] == gold_plan["id"]
    assert member["is_active"] is True
    # Verify default expiry is ~1 year later
    assert member["expiry_date"] > member["start_date"]

    member_id = member["id"]

    # 3. Fetch by ID
    get_res = client.get(f"/api/v1/members/{member_id}")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["id"] == member_id
    assert fetched["plan"]["name"] == "Gold"


def test_create_member_duplicate_email_conflict():
    """Verify that registering with an existing email returns 409 Conflict."""
    plans_res = client.get("/api/v1/members/plans")
    gold_plan = plans_res.json()[0]

    unique_email = f"duplicate.test.{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "full_name": "Test User",
        "email": unique_email,
        "plan_id": gold_plan["id"],
    }

    res1 = client.post("/api/v1/members", json=payload)
    assert res1.status_code == 201

    # Second attempt with same email
    res2 = client.post("/api/v1/members", json=payload)
    assert res2.status_code == 409
    assert "already registered" in res2.json()["detail"]


def test_create_member_invalid_plan_id():
    """Verify that registering with a non-existent plan UUID returns 400 Bad Request."""
    fake_plan_id = str(uuid.uuid4())
    payload = {
        "full_name": "Ghost Plan User",
        "email": f"ghost.{uuid.uuid4().hex[:6]}@example.com",
        "plan_id": fake_plan_id,
    }
    response = client.post("/api/v1/members", json=payload)
    assert response.status_code == 400
    assert "does not exist" in response.json()["detail"]


def test_create_member_invalid_email_format():
    """Verify that an invalid email is rejected by Pydantic with 422 Unprocessable Entity."""
    plans_res = client.get("/api/v1/members/plans")
    gold_plan = plans_res.json()[0]

    payload = {
        "full_name": "Bad Email User",
        "email": "not-a-valid-email",
        "plan_id": gold_plan["id"],
    }
    response = client.post("/api/v1/members", json=payload)
    assert response.status_code == 422


def test_get_member_not_found():
    """Verify that querying a random UUID returns 404 Not Found."""
    random_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/members/{random_id}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_update_member():
    """Verify updating member contact details and status."""
    plans_res = client.get("/api/v1/members/plans")
    silver_plan = next(p for p in plans_res.json() if p["name"] == "Silver")

    unique_email = f"update.test.{uuid.uuid4().hex[:6]}@example.com"
    create_res = client.post(
        "/api/v1/members",
        json={
            "full_name": "Original Name",
            "email": unique_email,
            "plan_id": silver_plan["id"],
        },
    )
    assert create_res.status_code == 201
    member_id = create_res.json()["id"]

    # Update name and phone
    update_res = client.put(
        f"/api/v1/members/{member_id}",
        json={
            "full_name": "Updated Name",
            "phone": "+91-9876543210",
        },
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["full_name"] == "Updated Name"
    assert updated["phone"] == "+91-9876543210"
