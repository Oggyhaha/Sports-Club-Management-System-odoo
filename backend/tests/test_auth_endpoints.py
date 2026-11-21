"""
Automated Integration Tests for Authentication Endpoints, Account Provisioning, and Staff Invitations.
"""
from datetime import timedelta
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.jwt import create_access_token
from app.core.security import hash_password
from app.main import app
from app.models import Invitation, Member, MembershipPlan, Role, RoleEnum, User
from tests.conftest import TestingSessionLocal

client = TestClient(app)


def test_public_registration_success():
    """Verify that public registration succeeds, forces member role, and never creates a paid membership."""
    unique_email = f"public_member_{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "email": unique_email,
        "password": "SecurePassword123!",
        "full_name": "Novak Djokovic",
        "phone": "+1-555-0987",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == unique_email
    assert data["full_name"] == "Novak Djokovic"
    assert data["roles"] == ["member"]
    assert "hashed_password" not in data

    # Verify no paid membership was automatically created
    db = TestingSessionLocal()
    try:
        user = db.query(User).filter(User.email == unique_email).first()
        assert user is not None
        assert user.member_profile is None
    finally:
        db.close()


def test_public_registration_duplicate_email_conflict():
    """Verify duplicate email registration returns 409 Conflict."""
    unique_email = f"duplicate_{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "email": unique_email,
        "password": "SecurePassword123!",
        "full_name": "Duplicate User",
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Attempt second registration with same email (case insensitive)
    payload["email"] = unique_email.upper()
    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_public_registration_password_length_validation():
    """Verify that passwords < 8 chars or > 72 bytes are rejected."""
    # Short password
    res_short = client.post(
        "/api/v1/auth/register",
        json={"email": "short@example.com", "password": "short", "full_name": "Short Pass"},
    )
    assert res_short.status_code == 422

    # Oversized password > 72 bytes
    oversized = "A" * 75
    res_over = client.post(
        "/api/v1/auth/register",
        json={"email": "over@example.com", "password": oversized, "full_name": "Over Pass"},
    )
    assert res_over.status_code == 422


def test_public_registration_prevents_role_escalation():
    """Verify that client attempting to supply role='owner' is ignored and assigned 'member'."""
    unique_email = f"hacker_{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "email": unique_email,
        "password": "HackerPassword123!",
        "full_name": "Role Hacker",
        "role": "owner",
        "roles": ["owner"],
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["roles"] == ["member"]


def test_login_json_success():
    """Verify successful login with JSON payload returns 30-min JWT and user metadata."""
    unique_email = f"login_user_{uuid.uuid4().hex[:6]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "UserPass2026!", "full_name": "Login User"},
    )

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "UserPass2026!"},
    )
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert token_data["expires_in"] == 1800
    assert token_data["user"]["email"] == unique_email


def test_login_oauth2_form_data_success():
    """Verify login works with standard OAuth2 form data (for Swagger UI)."""
    unique_email = f"form_user_{uuid.uuid4().hex[:6]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "UserPass2026!", "full_name": "Form User"},
    )

    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": unique_email, "password": "UserPass2026!"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_login_invalid_password():
    """Verify wrong password returns 401 Unauthorized."""
    unique_email = f"badpass_{uuid.uuid4().hex[:6]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "UserPass2026!", "full_name": "Badpass User"},
    )

    res = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "WrongPassword123!"},
    )
    assert res.status_code == 401
    assert "Incorrect email or password" in res.json()["detail"]


def test_login_inactive_user_rejected():
    """Verify inactive account is rejected with 401."""
    unique_email = f"inactive_{uuid.uuid4().hex[:6]}@example.com"
    db = TestingSessionLocal()
    try:
        user = User(
            email=unique_email,
            hashed_password=hash_password("InactivePass123!"),
            full_name="Inactive User",
            is_active=False,
            token_version=1,
        )
        db.add(user)
        db.commit()
    finally:
        db.close()

    res = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "InactivePass123!"},
    )
    assert res.status_code == 401
    assert "Account is inactive" in res.json()["detail"]


def test_get_me_authenticated_and_unauthenticated():
    """Verify /auth/me returns profile when authenticated and 401 when unauthenticated."""
    # Unauthenticated
    assert client.get("/api/v1/auth/me").status_code == 401

    # Authenticated
    unique_email = f"me_user_{uuid.uuid4().hex[:6]}@example.com"
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "Pass12345!", "full_name": "Me User"},
    )
    user_id = reg_res.json()["id"]

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "Pass12345!"},
    )
    token = login_res.json()["access_token"]

    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["id"] == user_id
    assert me_data["email"] == unique_email
    assert me_data["member_profile"] is None


def test_put_me_self_service_profile_update():
    """Verify user can update their own contact information."""
    unique_email = f"update_me_{uuid.uuid4().hex[:6]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "Pass12345!", "full_name": "Old Name"},
    )
    token = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "Pass12345!"},
    ).json()["access_token"]

    update_res = client.put(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"full_name": "New Name", "phone": "+91-9999999999"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["full_name"] == "New Name"
    assert update_res.json()["phone"] == "+91-9999999999"


def test_logout_revokes_token():
    """Verify logout increments token_version and immediately revokes the JWT token."""
    unique_email = f"logout_{uuid.uuid4().hex[:6]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "Pass12345!", "full_name": "Logout User"},
    )
    token = client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "Pass12345!"},
    ).json()["access_token"]

    # Verify token works
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200

    # Logout
    logout_res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200
    assert "revoked" in logout_res.json()["message"]

    # Immediate call with same token must now return 401
    me_after = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_after.status_code == 401
    assert "revoked" in me_after.json()["detail"]


def test_staff_invitation_lifecycle(owner_headers):
    """
    Test full staff invitation flow:
    1. Owner creates invitation for receptionist.
    2. Member attempt to invite staff is forbidden (403).
    3. Cannot invite owner role (422).
    4. Invitee accepts token and creates receptionist account.
    5. Consuming token again is rejected (400).
    """
    invitee_email = f"frontdesk_{uuid.uuid4().hex[:6]}@example.com"

    # 1. Owner invites receptionist
    invite_res = client.post(
        "/api/v1/auth/staff/invite",
        headers=owner_headers,
        json={"email": invitee_email, "role": "receptionist"},
    )
    assert invite_res.status_code == 200
    invite_data = invite_res.json()
    assert invite_data["email"] == invitee_email
    assert invite_data["role"] == "receptionist"
    raw_token = invite_data["raw_token"]
    assert len(raw_token) > 20

    # 2. Cannot invite owner role
    res_owner_role = client.post(
        "/api/v1/auth/staff/invite",
        headers=owner_headers,
        json={"email": "attempt_owner@example.com", "role": "owner"},
    )
    assert res_owner_role.status_code == 422

    # 3. Member cannot invite staff (403)
    member_email = f"reg_member_{uuid.uuid4().hex[:6]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": member_email, "password": "Pass12345!", "full_name": "Member Inviter"},
    )
    member_token = client.post(
        "/api/v1/auth/login",
        json={"email": member_email, "password": "Pass12345!"},
    ).json()["access_token"]
    forbidden_invite = client.post(
        "/api/v1/auth/staff/invite",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"email": "new_staff@example.com", "role": "receptionist"},
    )
    assert forbidden_invite.status_code == 403

    # 4. Invitee accepts token
    accept_payload = {
        "token": raw_token,
        "password": "StaffPassword2026!",
        "full_name": "Front Desk Receptionist",
        "phone": "+1-555-4321",
    }
    accept_res = client.post("/api/v1/auth/staff/accept", json=accept_payload)
    assert accept_res.status_code == 201
    staff_user = accept_res.json()
    assert staff_user["email"] == invitee_email
    assert staff_user["roles"] == ["receptionist"]

    # 5. Token is now consumed; reuse must return 400
    reuse_res = client.post("/api/v1/auth/staff/accept", json=accept_payload)
    assert reuse_res.status_code == 400


def test_walk_in_members_unaffected_by_auth():
    """Verify that walk-in members (user_id=None) continue to be safely stored and retrieved."""
    db = TestingSessionLocal()
    try:
        plan = db.query(MembershipPlan).first()
        walk_in = Member(
            full_name="Walk-in Customer",
            email=f"walkin_{uuid.uuid4().hex[:6]}@example.com",
            plan_id=plan.id,
            start_date="2026-01-01",
            expiry_date="2027-01-01",
            user_id=None,
        )
        db.add(walk_in)
        db.commit()
        db.refresh(walk_in)
        assert walk_in.user_id is None
    finally:
        db.close()
