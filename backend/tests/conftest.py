from collections.abc import Generator
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
import app.core.database as db_module
from app.main import app

# 1. Derive Test Database URL dynamically from settings.DATABASE_URL
dev_url = settings.DATABASE_URL
test_db_url = dev_url.rsplit("/", 1)[0] + "/champions_club_test"

# 2. Strict Safety Check: Never allow tests to run against dev/production database
if not test_db_url.endswith("/champions_club_test"):
    raise RuntimeError(
        f"CRITICAL SAFETY ABORT: Test database URL must end with '/champions_club_test'. Got: {test_db_url}"
    )

# 3. Dedicated test database engine and session factory
test_engine = create_engine(test_db_url, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)

# 4. Patch global database module references so tests querying SessionLocal use test DB
db_module.engine = test_engine
db_module.SessionLocal = TestingSessionLocal


# 5. FastAPI Dependency Override so all API calls use test DB
def override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[db_module.get_db] = override_get_db


# 6. Teardown fixture: Clean up test artifacts from champions_club_test after each test
@pytest.fixture(autouse=True)
def clean_test_artifacts():
    yield
    db = TestingSessionLocal()
    try:
        db.execute(text("DELETE FROM bookings"))
        db.execute(text("DELETE FROM members"))
        db.execute(text("DELETE FROM invitations"))
        db.execute(text("DELETE FROM user_roles"))
        db.execute(text("DELETE FROM users"))
        # Keep canonical seeded roles in test database
        db.execute(
            text("DELETE FROM roles WHERE name NOT IN ('owner', 'receptionist', 'member', 'shop_staff', 'hr_staff', 'business_client')")
        )
        # Keep seeded default courts in test database
        db.execute(
            text("DELETE FROM courts WHERE name NOT IN ('Tennis Court 1', 'Tennis Court 2', 'Cricket Net A')")
        )
        db.commit()
    finally:
        db.close()


# 7. Authentication Fixtures for Protected Test Endpoints
from app.core.jwt import create_access_token
from app.core.security import hash_password
from app.models import Role, RoleEnum, User
import uuid


@pytest.fixture
def owner_user():
    db = TestingSessionLocal()
    try:
        user = User(
            email=f"owner_{uuid.uuid4().hex[:6]}@example.com",
            hashed_password=hash_password("OwnerPass123!"),
            full_name="Test Owner",
            is_active=True,
            token_version=1,
        )
        owner_role = db.query(Role).filter(Role.name == RoleEnum.OWNER.value).first()
        if not owner_role:
            owner_role = Role(name=RoleEnum.OWNER.value, description="Owner")
            db.add(owner_role)
            db.flush()
        user.roles.append(owner_role)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


@pytest.fixture
def owner_headers(owner_user):
    token = create_access_token(user_id=owner_user.id, token_version=owner_user.token_version)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def receptionist_user():
    db = TestingSessionLocal()
    try:
        user = User(
            email=f"reception_{uuid.uuid4().hex[:6]}@example.com",
            hashed_password=hash_password("ReceptPass123!"),
            full_name="Test Receptionist",
            is_active=True,
            token_version=1,
        )
        rec_role = db.query(Role).filter(Role.name == RoleEnum.RECEPTIONIST.value).first()
        if not rec_role:
            rec_role = Role(name=RoleEnum.RECEPTIONIST.value, description="Receptionist")
            db.add(rec_role)
            db.flush()
        user.roles.append(rec_role)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


@pytest.fixture
def receptionist_headers(receptionist_user):
    token = create_access_token(user_id=receptionist_user.id, token_version=receptionist_user.token_version)
    return {"Authorization": f"Bearer {token}"}
