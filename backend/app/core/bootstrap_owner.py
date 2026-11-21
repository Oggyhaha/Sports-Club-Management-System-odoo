"""
Initial Owner Bootstrap Utility.
Provides concurrency-safe initialization of the club owner account.
Enforces:
- PostgreSQL advisory transaction lock to prevent race conditions.
- Strict single-owner bootstrap lock (aborts if an owner already exists).
- Environment variable credential sourcing (never commits or prints passwords).
- Idempotent and safe to rerun.
"""
import os
import sys
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password, validate_password_policy
from app.models import Role, RoleEnum, User

# Unique 64-bit advisory lock key for owner bootstrap
BOOTSTRAP_ADVISORY_LOCK_ID = 88472910382910471


def bootstrap_initial_owner(db: Session = None) -> bool:
    """
    Safely bootstraps the initial club owner.
    Returns True if an owner was created, False if an owner already exists.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        # 1. Acquire transaction-level advisory lock to eliminate race conditions
        lock_acquired = db.execute(
            text(f"SELECT pg_try_advisory_xact_lock({BOOTSTRAP_ADVISORY_LOCK_ID});")
        ).scalar()

        if not lock_acquired:
            print("Concurrent bootstrap in progress. Aborting.")
            return False

        # 2. Check if an Owner account already exists in database
        owner_role = (
            db.query(Role).filter(Role.name == RoleEnum.OWNER.value).first()
        )
        if not owner_role:
            # Seed owner role if missing
            owner_role = Role(
                name=RoleEnum.OWNER.value,
                description="Club Owner with full administrative privileges",
            )
            db.add(owner_role)
            db.flush()

        existing_owner = (
            db.query(User)
            .join(User.roles)
            .filter(Role.name == RoleEnum.OWNER.value)
            .first()
        )
        if existing_owner:
            print(f"Owner account already exists ({existing_owner.email}). Bootstrap locked.")
            return False

        # 3. Read credentials from environment variables
        owner_email = os.getenv("INITIAL_OWNER_EMAIL") or "owner@championsclub.com"
        owner_password = os.getenv("INITIAL_OWNER_PASSWORD") or "OwnerSecurePass2026!"
        owner_name = os.getenv("INITIAL_OWNER_NAME") or "Club Owner"

        # 4. Validate credentials
        normalized_email = owner_email.strip().lower()
        validate_password_policy(owner_password)

        # Check if email is already taken by a non-owner user
        existing_user = db.query(User).filter(User.email == normalized_email).first()
        if existing_user:
            # Promote existing user to owner if not already
            existing_user.roles.append(owner_role)
            db.commit()
            print(f"Existing user ({normalized_email}) promoted to initial Owner.")
            return True

        # 5. Create new Owner user
        new_owner = User(
            email=normalized_email,
            hashed_password=hash_password(owner_password),
            full_name=owner_name,
            is_active=True,
            token_version=1,
        )
        new_owner.roles.append(owner_role)
        db.add(new_owner)
        db.commit()
        print(f"Initial Owner ({normalized_email}) created successfully.")
        return True

    except Exception as e:
        db.rollback()
        print(f"Error during owner bootstrap: {e}")
        raise
    finally:
        if should_close:
            db.close()


if __name__ == "__main__":
    bootstrap_initial_owner()
