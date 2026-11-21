import uuid
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.modules.auth.models import Role, User, UserRole
from app.modules.members.models import Member, MembershipPlan


def test_auth_models_instantiation():
    """Verify that User and Role models instantiate with valid UUIDs and token_version."""
    role = Role(
        id=uuid.uuid4(),
        name="receptionist",
        description="Front desk receptionist",
    )
    assert role.name == "receptionist"
    assert isinstance(role.id, uuid.UUID)

    user = User(
        id=uuid.uuid4(),
        email="receptionist@example.com",
        hashed_password="mock_hashed_pw",
        full_name="Jane Receptionist",
        is_active=True,
        token_version=1,
    )
    assert user.email == "receptionist@example.com"
    assert user.token_version == 1
    assert user.is_active is True


def test_walk_in_member_preserves_null_user_id():
    """
    Verify that walk-in members can be created with user_id=None
    and do not require any login account.
    """
    db: Session = SessionLocal()
    try:
        plan = db.query(MembershipPlan).first()
        unique_email = f"walkin.{uuid.uuid4().hex[:6]}@example.com"
        walk_in = Member(
            full_name="Walk-in Guest",
            email=unique_email,
            phone="+91-9999888877",
            plan_id=plan.id,
            user_id=None,  # Crucial: walk-in customer has no User account!
            expiry_date=plan.created_at.date(),
        )
        db.add(walk_in)
        db.commit()
        db.refresh(walk_in)

        assert walk_in.user_id is None
        assert walk_in.user is None
        assert walk_in.full_name == "Walk-in Guest"

        # Clean up
        db.delete(walk_in)
        db.commit()
    finally:
        db.close()


def test_registered_member_linked_to_user_account():
    """
    Verify that an online registered member is properly linked to their User account.
    """
    db: Session = SessionLocal()
    try:
        plan = db.query(MembershipPlan).first()
        user_email = f"online.member.{uuid.uuid4().hex[:6]}@example.com"

        # 1. Create User
        user = User(
            email=user_email,
            hashed_password="mock_bcrypt_hash",
            full_name="Online Registered Member",
            token_version=1,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # 2. Create Member profile linked to User
        member = Member(
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            plan_id=plan.id,
            expiry_date=plan.created_at.date(),
        )
        db.add(member)
        db.commit()
        db.refresh(member)

        assert member.user_id == user.id
        assert member.user.email == user_email
        assert user.member_profile.id == member.id

        # Clean up
        db.delete(member)
        db.delete(user)
        db.commit()
    finally:
        db.close()
