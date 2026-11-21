import uuid
from fastapi.testclient import TestClient

from app.core.jwt import create_access_token
from app.core.security import hash_password
from app.main import app
from app.models import Member, Role, RoleEnum, User
from tests.conftest import TestingSessionLocal

client = TestClient(app)


def test_get_membership_plans():
    """Verify that plans endpoint is public and lists default tiers (Gold, Silver, Junior)."""
    response = client.get("/api/v1/members/plans")
    assert response.status_code == 200
    plans = response.json()
    assert len(plans) >= 3
    plan_names = [p["name"] for p in plans]
    assert "Gold" in plan_names
    assert "Silver" in plan_names
    assert "Junior" in plan_names


def test_create_and_get_member(receptionist_headers):
    """Verify receptionist creating a member with Gold plan and fetching it by UUID."""
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

    # 1. Staff search before creation
    create_res = client.get("/api/v1/members", params={"search": unique_email}, headers=receptionist_headers)
    assert create_res.status_code == 200
    assert len(create_res.json()) == 0

    # 2. Register member as receptionist
    post_res = client.post("/api/v1/members", json=payload, headers=receptionist_headers)
    assert post_res.status_code == 201
    member = post_res.json()
    assert member["full_name"] == "Roger Federer"
    assert member["email"] == unique_email
    assert member["plan_id"] == gold_plan["id"]
    assert member["is_active"] is True
    assert member["expiry_date"] > member["start_date"]

    member_id = member["id"]

    # 3. Fetch by ID
    get_res = client.get(f"/api/v1/members/{member_id}", headers=receptionist_headers)
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["id"] == member_id
    assert fetched["plan"]["name"] == "Gold"


def test_create_member_duplicate_email_conflict(receptionist_headers):
    """Verify that registering with an existing email returns 409 Conflict."""
    plans_res = client.get("/api/v1/members/plans")
    gold_plan = plans_res.json()[0]

    unique_email = f"duplicate.test.{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "full_name": "Test User",
        "email": unique_email,
        "plan_id": gold_plan["id"],
    }

    res1 = client.post("/api/v1/members", json=payload, headers=receptionist_headers)
    assert res1.status_code == 201

    # Second attempt with same email
    res2 = client.post("/api/v1/members", json=payload, headers=receptionist_headers)
    assert res2.status_code == 409
    assert "already registered" in res2.json()["detail"]


def test_create_member_invalid_plan_id(receptionist_headers):
    """Verify that registering with a non-existent plan UUID returns 400 Bad Request."""
    fake_plan_id = str(uuid.uuid4())
    payload = {
        "full_name": "Ghost Plan User",
        "email": f"ghost.{uuid.uuid4().hex[:6]}@example.com",
        "plan_id": fake_plan_id,
    }
    response = client.post("/api/v1/members", json=payload, headers=receptionist_headers)
    assert response.status_code == 400
    assert "does not exist" in response.json()["detail"]


def test_create_member_invalid_email_format(receptionist_headers):
    """Verify that an invalid email is rejected by Pydantic with 422 Unprocessable Entity."""
    plans_res = client.get("/api/v1/members/plans")
    gold_plan = plans_res.json()[0]

    payload = {
        "full_name": "Bad Email User",
        "email": "not-a-valid-email",
        "plan_id": gold_plan["id"],
    }
    response = client.post("/api/v1/members", json=payload, headers=receptionist_headers)
    assert response.status_code == 422


def test_get_member_not_found(receptionist_headers):
    """Verify that querying a random UUID returns 404 Not Found."""
    random_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/members/{random_id}", headers=receptionist_headers)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_update_member(receptionist_headers):
    """Verify updating member contact details and status."""
    plans_res = client.get("/api/v1/members/plans")
    silver_plan = next(p for p in plans_res.json() if p["name"] == "Silver")

    unique_email = f"update.test.{uuid.uuid4().hex[:6]}@example.com"
    create_res = client.post(
        "/api/v1/members",
        headers=receptionist_headers,
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
        headers=receptionist_headers,
        json={
            "full_name": "Updated Name",
            "phone": "+91-9876543210",
        },
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["full_name"] == "Updated Name"
    assert updated["phone"] == "+91-9876543210"


def test_member_resource_level_authorization(receptionist_headers):
    """Verify that a member can view their own profile, but is rejected (403) from other profiles."""
    db = TestingSessionLocal()
    try:
        # Create user A (Member)
        user_a = User(
            email=f"member_a_{uuid.uuid4().hex[:6]}@example.com",
            hashed_password=hash_password("Pass123!"),
            full_name="Member A",
            is_active=True,
            token_version=1,
        )
        mem_role = db.query(Role).filter(Role.name == RoleEnum.MEMBER.value).first()
        user_a.roles.append(mem_role)
        db.add(user_a)
        db.commit()
        db.refresh(user_a)

        # Create member profile A linked to user A
        plan = client.get("/api/v1/members/plans").json()[0]
        member_a = Member(
            full_name="Member A Profile",
            email=user_a.email,
            plan_id=plan["id"],
            start_date="2026-01-01",
            expiry_date="2027-01-01",
            user_id=user_a.id,
        )
        db.add(member_a)

        # Create member profile B (Walk-in or other member)
        member_b = Member(
            full_name="Member B Profile",
            email=f"member_b_{uuid.uuid4().hex[:6]}@example.com",
            plan_id=plan["id"],
            start_date="2026-01-01",
            expiry_date="2027-01-01",
            user_id=None,
        )
        db.add(member_b)
        db.commit()
        db.refresh(member_a)
        db.refresh(member_b)

        token_a = create_access_token(user_id=user_a.id, token_version=user_a.token_version)
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Member A views own profile -> 200 OK
        res_own = client.get(f"/api/v1/members/{member_a.id}", headers=headers_a)
        assert res_own.status_code == 200
        assert res_own.json()["id"] == str(member_a.id)

        # Member A views Member B profile -> 403 Forbidden
        res_other = client.get(f"/api/v1/members/{member_b.id}", headers=headers_a)
        assert res_other.status_code == 403
        assert "only view your own member profile" in res_other.json()["detail"]

        # Receptionist views Member B profile -> 200 OK
        res_staff = client.get(f"/api/v1/members/{member_b.id}", headers=receptionist_headers)
        assert res_staff.status_code == 200
    finally:
        db.close()
