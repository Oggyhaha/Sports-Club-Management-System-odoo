import uuid
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import MembershipPlan, Member, Court, Booking


def test_membership_plan_model_instantiation():
    """Verify that MembershipPlan model can be instantiated with UUID and decimal values."""
    plan_id = uuid.uuid4()
    plan = MembershipPlan(
        id=plan_id,
        name="Test Tier",
        monthly_fee=Decimal("75.00"),
        court_discount_percent=Decimal("25.00"),
        description="Test plan description",
    )
    assert plan.id == plan_id
    assert plan.name == "Test Tier"
    assert plan.monthly_fee == Decimal("75.00")
    assert plan.court_discount_percent == Decimal("25.00")


def test_court_model_instantiation():
    """Verify that Court model can be instantiated with valid attributes."""
    court_id = uuid.uuid4()
    court = Court(
        id=court_id,
        name="Test Court",
        sport_type="padel",
        hourly_rate=Decimal("35.00"),
        is_active=True,
    )
    assert court.id == court_id
    assert court.name == "Test Court"
    assert court.sport_type == "padel"
    assert court.hourly_rate == Decimal("35.00")


def test_database_seeded_plans_exist():
    """Verify that default plans (Gold, Silver, Junior) exist in the PostgreSQL database."""
    db: Session = SessionLocal()
    try:
        plans = db.query(MembershipPlan).all()
        plan_names = [p.name for p in plans]
        assert "Gold" in plan_names
        assert "Silver" in plan_names
        assert "Junior" in plan_names
    finally:
        db.close()


def test_database_insert_and_retrieve_court():
    """Verify that inserting a court into PostgreSQL assigns a UUID and persists correctly."""
    db: Session = SessionLocal()
    test_court_name = f"Temp Test Court {uuid.uuid4().hex[:6]}"
    try:
        court = Court(
            name=test_court_name,
            sport_type="padel",
            hourly_rate=Decimal("30.00"),
        )
        db.add(court)
        db.commit()
        db.refresh(court)
        assert isinstance(court.id, uuid.UUID)
        assert court.name == test_court_name

        # Clean up test record
        db.delete(court)
        db.commit()
    finally:
        db.close()
