from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import MembershipPlan, Court, Member, Booking


def seed_default_data():
    """
    Seeds initial membership plans and initial courts if they do not already exist.
    Idempotent: safe to run multiple times.
    """
    db: Session = SessionLocal()
    try:
        # 1. Default Membership Plans
        default_plans = [
            {
                "name": "Gold",
                "monthly_fee": Decimal("100.00"),
                "court_discount_percent": Decimal("50.00"),
                "description": "Premium tier: Full access with 50% discount on all court bookings.",
            },
            {
                "name": "Silver",
                "monthly_fee": Decimal("50.00"),
                "court_discount_percent": Decimal("20.00"),
                "description": "Standard tier: 20% discount on court bookings.",
            },
            {
                "name": "Junior",
                "monthly_fee": Decimal("25.00"),
                "court_discount_percent": Decimal("30.00"),
                "description": "Under 18 tier: 30% discounted rates on all courts.",
            },
        ]

        for plan_data in default_plans:
            existing = (
                db.query(MembershipPlan)
                .filter(MembershipPlan.name == plan_data["name"])
                .first()
            )
            if not existing:
                plan = MembershipPlan(**plan_data)
                db.add(plan)
                print(f"Seeded plan: {plan.name}")

        # 2. Default Courts
        default_courts = [
            {
                "name": "Tennis Court 1",
                "sport_type": "tennis",
                "hourly_rate": Decimal("40.00"),
            },
            {
                "name": "Tennis Court 2",
                "sport_type": "tennis",
                "hourly_rate": Decimal("40.00"),
            },
            {
                "name": "Cricket Net A",
                "sport_type": "cricket",
                "hourly_rate": Decimal("50.00"),
            },
        ]

        for court_data in default_courts:
            existing = (
                db.query(Court).filter(Court.name == court_data["name"]).first()
            )
            if not existing:
                court = Court(**court_data)
                db.add(court)
                print(f"Seeded court: {court.name}")

        db.commit()
        print("Default seed data completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_default_data()
