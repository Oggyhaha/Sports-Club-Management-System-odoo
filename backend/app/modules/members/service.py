from datetime import date, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.modules.members.models import Member, MembershipPlan
from app.modules.members.schemas import MemberCreate, MemberUpdate


def list_plans(db: Session) -> List[MembershipPlan]:
    """Retrieve all membership plans ordered by monthly fee."""
    stmt = select(MembershipPlan).order_by(MembershipPlan.monthly_fee.desc())
    return list(db.scalars(stmt).all())


def get_plan_by_id(db: Session, plan_id: UUID) -> Optional[MembershipPlan]:
    """Retrieve a specific membership plan by its UUID."""
    stmt = select(MembershipPlan).where(MembershipPlan.id == plan_id)
    return db.scalars(stmt).first()


def list_members(
    db: Session,
    search: Optional[str] = None,
    plan_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
) -> List[Member]:
    """
    List members with optional search by full_name or email,
    and optional filtering by plan_id and active status.
    Eagerly loads the associated membership plan.
    """
    stmt = select(Member).options(joinedload(Member.plan)).order_by(Member.created_at.desc())

    if search:
        search_term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Member.full_name.ilike(search_term),
                Member.email.ilike(search_term),
            )
        )

    if plan_id:
        stmt = stmt.where(Member.plan_id == plan_id)

    if is_active is not None:
        stmt = stmt.where(Member.is_active == is_active)

    return list(db.scalars(stmt).unique().all())


def get_member_by_id(db: Session, member_id: UUID) -> Member:
    """
    Retrieve a member by UUID with plan details.
    Raises HTTP 404 if not found.
    """
    stmt = (
        select(Member)
        .options(joinedload(Member.plan))
        .where(Member.id == member_id)
    )
    member = db.scalars(stmt).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Member with ID '{member_id}' not found.",
        )
    return member


def create_member(db: Session, member_in: MemberCreate) -> Member:
    """
    Register a new member.
    Validations applied:
    1. Plan existence validation: plan_id must exist in membership_plans.
    2. Email uniqueness: cannot register with an already existing email.
    3. Expiry date calculation: defaults to start_date + 365 days if omitted.
    """
    # 1. Validate plan exists
    plan = get_plan_by_id(db, member_in.plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Membership plan with ID '{member_in.plan_id}' does not exist.",
        )

    # 2. Validate email uniqueness
    existing_stmt = select(Member).where(Member.email == member_in.email)
    existing_member = db.scalars(existing_stmt).first()
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A member with email '{member_in.email}' is already registered.",
        )

    # 3. Calculate start and expiry dates if not provided
    start_d = member_in.start_date or date.today()
    expiry_d = member_in.expiry_date or (start_d + timedelta(days=365))

    if expiry_d < start_d:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Membership expiry date cannot be earlier than start date.",
        )

    new_member = Member(
        full_name=member_in.full_name.strip(),
        email=member_in.email.strip().lower(),
        phone=member_in.phone.strip() if member_in.phone else None,
        plan_id=member_in.plan_id,
        start_date=start_d,
        expiry_date=expiry_d,
        is_active=True,
    )

    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member


def update_member(db: Session, member_id: UUID, member_in: MemberUpdate) -> Member:
    """
    Update member details (name, email, phone, plan, expiry, active status).
    """
    member = get_member_by_id(db, member_id)

    update_data = member_in.model_dump(exclude_unset=True)

    # Validate email uniqueness if changing email
    if "email" in update_data and update_data["email"]:
        new_email = update_data["email"].strip().lower()
        if new_email != member.email:
            existing_stmt = select(Member).where(Member.email == new_email)
            if db.scalars(existing_stmt).first():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A member with email '{new_email}' already exists.",
                )
            member.email = new_email

    # Validate plan exists if changing plan
    if "plan_id" in update_data and update_data["plan_id"]:
        plan = get_plan_by_id(db, update_data["plan_id"])
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Membership plan with ID '{update_data['plan_id']}' does not exist.",
            )
        member.plan_id = update_data["plan_id"]

    if "full_name" in update_data and update_data["full_name"]:
        member.full_name = update_data["full_name"].strip()

    if "phone" in update_data:
        member.phone = update_data["phone"].strip() if update_data["phone"] else None

    if "expiry_date" in update_data and update_data["expiry_date"]:
        if update_data["expiry_date"] < member.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expiry date cannot precede start date.",
            )
        member.expiry_date = update_data["expiry_date"]

    if "is_active" in update_data and update_data["is_active"] is not None:
        member.is_active = update_data["is_active"]

    db.commit()
    db.refresh(member)
    return member
