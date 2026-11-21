"""
Comprehensive automated tests for Security Core (Stage 6B.2).
Validates:
1. Bcrypt password hashing, verification, salt uniqueness, and 72-byte/8-char limits.
2. PyJWT token generation, signature validation, expiration, and claim checks.
3. Authentication dependency (get_current_user) against PostgreSQL test database.
4. Role-based authorization dependency (require_roles) across single, multiple, and unauthorized roles.
"""
import uuid
from datetime import timedelta

import pytest
from fastapi import APIRouter, Depends
from fastapi.testclient import TestClient
import jwt

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.dependencies import get_current_user, require_roles
from app.core.jwt import create_access_token, decode_access_token
from app.core.security import hash_password, validate_password_policy, verify_password
from app.main import app
from app.modules.auth.models import Role, RoleEnum, User

# ---------------------------------------------------------
# Test Endpoints mounted to verify FastAPI dependencies
# ---------------------------------------------------------
security_test_router = APIRouter(prefix="/api/v1/test-sec", tags=["Test Security"])


@security_test_router.get("/protected")
def protected_endpoint(current_user: User = Depends(get_current_user)):
    return {"id": str(current_user.id), "email": current_user.email}


@security_test_router.get("/owner-only")
def owner_only_endpoint(
    current_user: User = Depends(require_roles(RoleEnum.OWNER)),
):
    return {"status": "ok", "user": current_user.email}


@security_test_router.get("/receptionist-or-owner")
def dual_role_endpoint(
    current_user: User = Depends(
        require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST)
    ),
):
    return {"status": "ok", "user": current_user.email}


# Mount test router on the app
app.include_router(security_test_router)
client = TestClient(app)


# ---------------------------------------------------------
# Test Fixture Helpers
# ---------------------------------------------------------
def create_user_fixture(
    email: str = "sec_test@example.com",
    password: str = "StrongPass123",
    role_names: list = None,
    is_active: bool = True,
    token_version: int = 1,
) -> User:
    db = SessionLocal()
    try:
        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name="Security Test User",
            is_active=is_active,
            token_version=token_version,
        )
        db.add(user)
        if role_names:
            for r_name in role_names:
                role = db.query(Role).filter(Role.name == r_name).first()
                if not role:
                    role = Role(name=r_name)
                    db.add(role)
                    db.flush()
                user.roles.append(role)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


# =========================================================
# 1. Password Security Tests
# =========================================================
def test_password_hash_generation():
    password = "MySecurePassword2026"
    hashed = hash_password(password)
    assert hashed != password
    assert hashed.startswith("$2b$")


def test_password_verification_success():
    password = "CorrectHorseBatteryStaple12"
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True


def test_password_verification_failure():
    password = "CorrectHorseBatteryStaple12"
    hashed = hash_password(password)
    assert verify_password("WrongPassword123", hashed) is False
    assert verify_password("", hashed) is False
    assert verify_password(password, "") is False


def test_password_salt_uniqueness():
    password = "SamePasswordRepeated123"
    hash1 = hash_password(password)
    hash2 = hash_password(password)
    assert hash1 != hash2
    assert verify_password(password, hash1) is True
    assert verify_password(password, hash2) is True


def test_password_length_policy_minimum():
    with pytest.raises(ValueError, match="at least 8 characters"):
        validate_password_policy("short")

    with pytest.raises(ValueError, match="at least 8 characters"):
        hash_password("1234567")


def test_password_length_policy_bcrypt_72_byte_limit():
    # 73 ASCII characters exceed the 72-byte limit
    oversized_password = "A" * 73
    with pytest.raises(ValueError, match="exceeds bcrypt maximum length limit of 72 bytes"):
        validate_password_policy(oversized_password)

    with pytest.raises(ValueError, match="exceeds bcrypt maximum length limit of 72 bytes"):
        hash_password(oversized_password)

    # Multi-byte UTF-8 characters: 25 * 3 bytes = 75 bytes
    multibyte_oversized = "€" * 25
    with pytest.raises(ValueError, match="exceeds bcrypt maximum length limit of 72 bytes"):
        validate_password_policy(multibyte_oversized)

    # Verify that verify_password safely rejects passwords exceeding 72 bytes
    valid_hash = hash_password("ValidPassword123")
    assert verify_password(oversized_password, valid_hash) is False


# =========================================================
# 2. JWT Utilities Tests
# =========================================================
def test_jwt_create_and_decode_success():
    user_id = uuid.uuid4()
    token = create_access_token(user_id=user_id, token_version=1)
    payload = decode_access_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["ver"] == 1
    assert "iat" in payload
    assert "exp" in payload
    assert payload["exp"] > payload["iat"]


def test_jwt_expired_token_rejection():
    user_id = uuid.uuid4()
    # Expired token with negative delta
    token = create_access_token(
        user_id=user_id,
        token_version=1,
        expires_delta=timedelta(seconds=-10),
    )
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)


def test_jwt_invalid_signature_rejection():
    user_id = uuid.uuid4()
    token = create_access_token(
        user_id=user_id,
        token_version=1,
        secret_key="different-secret-key-for-testing-tampering-123",
    )
    with pytest.raises(jwt.InvalidSignatureError):
        decode_access_token(token)


def test_jwt_malformed_token_rejection():
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token("not.a.valid.jwt.token")

    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token("gibberish")


def test_jwt_missing_or_short_secret_rejection():
    user_id = uuid.uuid4()
    with pytest.raises(ValueError, match="CRITICAL SECURITY CONFIGURATION ERROR"):
        create_access_token(user_id=user_id, token_version=1, secret_key="short")

    with pytest.raises(ValueError, match="CRITICAL SECURITY CONFIGURATION ERROR"):
        decode_access_token("some.token.here", secret_key="")


# =========================================================
# 3. Authentication Dependency (get_current_user) Tests
# =========================================================
def test_auth_dependency_valid_token_active_user():
    user = create_user_fixture(email="active_user@example.com")
    token = create_access_token(user_id=user.id, token_version=user.token_version)

    response = client.get(
        "/api/v1/test-sec/protected",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(user.id)
    assert data["email"] == "active_user@example.com"


def test_auth_dependency_missing_token():
    response = client.get("/api/v1/test-sec/protected")
    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


def test_auth_dependency_invalid_token():
    response = client.get(
        "/api/v1/test-sec/protected",
        headers={"Authorization": "Bearer invalid.token.payload"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_auth_dependency_expired_token():
    user = create_user_fixture(email="expired_user@example.com")
    expired_token = create_access_token(
        user_id=user.id,
        token_version=user.token_version,
        expires_delta=timedelta(seconds=-1),
    )

    response = client.get(
        "/api/v1/test-sec/protected",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Token has expired"
    assert "error=\"invalid_token\"" in response.headers.get("WWW-Authenticate", "")


def test_auth_dependency_nonexistent_user():
    ghost_id = uuid.uuid4()
    token = create_access_token(user_id=ghost_id, token_version=1)

    response = client.get(
        "/api/v1/test-sec/protected",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "User not found"


def test_auth_dependency_inactive_user():
    user = create_user_fixture(email="inactive_user@example.com", is_active=False)
    token = create_access_token(user_id=user.id, token_version=user.token_version)

    response = client.get(
        "/api/v1/test-sec/protected",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Inactive user account"


def test_auth_dependency_token_version_mismatch_revocation():
    # User was issued token with token_version=1, but token_version was incremented to 2 (logout/revocation)
    user = create_user_fixture(email="revoked_user@example.com", token_version=2)
    old_token = create_access_token(user_id=user.id, token_version=1)

    response = client.get(
        "/api/v1/test-sec/protected",
        headers={"Authorization": f"Bearer {old_token}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Token has been revoked"


# =========================================================
# 4. Role-Based Authorization (require_roles) Tests
# =========================================================
def test_rbac_owner_accessing_owner_only_success():
    owner_user = create_user_fixture(
        email="club_owner@example.com",
        role_names=[RoleEnum.OWNER.value],
    )
    token = create_access_token(user_id=owner_user.id, token_version=owner_user.token_version)

    response = client.get(
        "/api/v1/test-sec/owner-only",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_rbac_member_rejected_from_owner_only_forbidden():
    member_user = create_user_fixture(
        email="regular_member@example.com",
        role_names=[RoleEnum.MEMBER.value],
    )
    token = create_access_token(user_id=member_user.id, token_version=member_user.token_version)

    response = client.get(
        "/api/v1/test-sec/owner-only",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Operation not permitted: insufficient privileges"


def test_rbac_multiple_allowed_roles_receptionist_passes():
    receptionist_user = create_user_fixture(
        email="frontdesk@example.com",
        role_names=[RoleEnum.RECEPTIONIST.value],
    )
    token = create_access_token(user_id=receptionist_user.id, token_version=receptionist_user.token_version)

    response = client.get(
        "/api/v1/test-sec/receptionist-or-owner",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_rbac_user_with_multiple_roles():
    # User holding both shop_staff and member roles
    multi_role_user = create_user_fixture(
        email="staff_and_member@example.com",
        role_names=[RoleEnum.SHOP_STAFF.value, RoleEnum.MEMBER.value],
    )
    token = create_access_token(user_id=multi_role_user.id, token_version=multi_role_user.token_version)

    # Should fail owner-only route
    res_owner = client.get(
        "/api/v1/test-sec/owner-only",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_owner.status_code == 403

    # Should succeed on protected endpoint
    res_prot = client.get(
        "/api/v1/test-sec/protected",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_prot.status_code == 200


def test_rbac_unauthenticated_request_rejected():
    response = client.get("/api/v1/test-sec/owner-only")
    assert response.status_code == 401
