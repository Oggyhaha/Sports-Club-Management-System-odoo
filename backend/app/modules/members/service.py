from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.modules.members.models import Member, MembershipPlan, MemberSubscription
from app.modules.members.schemas import (
    MemberCreate,
    MemberUpdate,
    MembershipPlanCreate,
    MembershipPlanUpdate,
    SubscriptionChangePlanRequest,
    SubscriptionCreateRequest,
    SubscriptionRenewRequest,
)


# ---------------------------------------------------------
# Membership Plan Services
# ---------------------------------------------------------
def list_plans(db: Session, active_only: bool = True) -> List[MembershipPlan]:
    """Retrieve membership plans ordered by monthly fee."""
    stmt = select(MembershipPlan)
    if active_only:
        stmt = stmt.where(MembershipPlan.is_active.is_(True))
    stmt = stmt.order_by(MembershipPlan.monthly_fee.desc())
    return list(db.scalars(stmt).all())


def get_plan_by_id(db: Session, plan_id: UUID) -> Optional[MembershipPlan]:
    """Retrieve a specific membership plan by its UUID."""
    stmt = select(MembershipPlan).where(MembershipPlan.id == plan_id)
    return db.scalars(stmt).first()


def create_plan(db: Session, plan_in: MembershipPlanCreate) -> MembershipPlan:
    """
    Create a new membership plan tier (Owner only).
    Validates plan name uniqueness, non-negative fees, and discount ranges.
    """
    # Validate name uniqueness
    existing = db.scalars(
        select(MembershipPlan).where(MembershipPlan.name.ilike(plan_in.name.strip()))
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A membership plan with the name '{plan_in.name}' already exists.",
        )

    new_plan = MembershipPlan(
        name=plan_in.name.strip(),
        monthly_fee=plan_in.monthly_fee,
        court_discount_percent=plan_in.court_discount_percent,
        shop_discount_percent=plan_in.shop_discount_percent,
        bar_discount_percent=plan_in.bar_discount_percent,
        duration_days=plan_in.duration_days,
        description=plan_in.description.strip() if plan_in.description else None,
        is_active=plan_in.is_active,
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    return new_plan


def update_plan(db: Session, plan_id: UUID, plan_in: MembershipPlanUpdate) -> MembershipPlan:
    """
    Update membership plan tier pricing and benefits (Owner only).
    Preserves historical subscription snapshots.
    """
    plan = get_plan_by_id(db, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Membership plan with ID '{plan_id}' not found.",
        )

    update_data = plan_in.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"]:
        name_clean = update_data["name"].strip()
        if name_clean.lower() != plan.name.lower():
            existing = db.scalars(
                select(MembershipPlan).where(
                    MembershipPlan.name.ilike(name_clean),
                    MembershipPlan.id != plan.id,
                )
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A membership plan with the name '{name_clean}' already exists.",
                )
            plan.name = name_clean

    if "monthly_fee" in update_data and update_data["monthly_fee"] is not None:
        plan.monthly_fee = update_data["monthly_fee"]

    if "court_discount_percent" in update_data and update_data["court_discount_percent"] is not None:
        plan.court_discount_percent = update_data["court_discount_percent"]

    if "shop_discount_percent" in update_data and update_data["shop_discount_percent"] is not None:
        plan.shop_discount_percent = update_data["shop_discount_percent"]

    if "bar_discount_percent" in update_data and update_data["bar_discount_percent"] is not None:
        plan.bar_discount_percent = update_data["bar_discount_percent"]

    if "duration_days" in update_data:
        plan.duration_days = update_data["duration_days"]

    if "description" in update_data:
        plan.description = update_data["description"].strip() if update_data["description"] else None

    if "is_active" in update_data and update_data["is_active"] is not None:
        plan.is_active = update_data["is_active"]

    db.commit()
    db.refresh(plan)
    return plan


# ---------------------------------------------------------
# Member Services
# ---------------------------------------------------------
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


def get_member_by_user_id(db: Session, user_id: UUID) -> Optional[Member]:
    """Retrieve a member profile linked to an authenticated user account."""
    stmt = (
        select(Member)
        .options(joinedload(Member.plan))
        .where(Member.user_id == user_id)
    )
    return db.scalars(stmt).first()


def create_member(db: Session, member_in: MemberCreate) -> Member:
    """
    Register a new member (walk-in or registered user).
    Validations:
    1. Plan existence validation: plan_id must exist in membership_plans.
    2. Email uniqueness: cannot register with an already existing email.
    3. User uniqueness: if user_id is provided, verify no other member is linked to it.
    4. Expiry date calculation: defaults to start_date + plan.duration_days (or 365) if omitted.
    """
    plan = get_plan_by_id(db, member_in.plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Membership plan with ID '{member_in.plan_id}' does not exist.",
        )

    existing_email = db.scalars(
        select(Member).where(Member.email == member_in.email.strip().lower())
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A member with email '{member_in.email}' is already registered.",
        )

    if member_in.user_id:
        existing_user = db.scalars(
            select(Member).where(Member.user_id == member_in.user_id)
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A member profile is already linked to this user account.",
            )

    start_d = member_in.start_date or date.today()
    default_days = plan.duration_days if plan.duration_days else 365
    expiry_d = member_in.expiry_date or (start_d + timedelta(days=default_days))

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
        user_id=member_in.user_id,
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
    Update member contact information, active status, or staff overrides.
    """
    member = get_member_by_id(db, member_id)
    update_data = member_in.model_dump(exclude_unset=True)

    if "email" in update_data and update_data["email"]:
        new_email = update_data["email"].strip().lower()
        if new_email != member.email:
            existing = db.scalars(
                select(Member).where(Member.email == new_email, Member.id != member.id)
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A member with email '{new_email}' already exists.",
                )
            member.email = new_email

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


# ---------------------------------------------------------
# Member Subscription Services
# ---------------------------------------------------------
def create_subscription(
    db: Session, member_id: UUID, sub_in: SubscriptionCreateRequest
) -> MemberSubscription:
    """
    Purchase a new membership subscription.
    Enforces:
    1. Member existence with row-level lock (with_for_update) to prevent race conditions.
    2. Plan existence, active status, and mandatory duration_days.
    3. Prevention of duplicate active subscriptions for the same member.
    4. Immutable price and discount snapshots from the plan at purchase time.
    5. Atomic update of current Member projection (plan_id, start_date, expiry_date, is_active).
    """
    member = db.scalars(
        select(Member).where(Member.id == member_id).with_for_update()
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Member with ID '{member_id}' not found.",
        )

    plan = get_plan_by_id(db, sub_in.plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Membership plan with ID '{sub_in.plan_id}' not found.",
        )
    if not plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Membership plan '{plan.name}' is inactive and cannot be purchased.",
        )
    if not plan.duration_days or plan.duration_days <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Membership plan '{plan.name}' has no configured duration_days. A duration is required for subscriptions.",
        )

    # Check for active existing subscription to prevent accidental duplicate purchases
    existing_active = db.scalars(
        select(MemberSubscription).where(
            MemberSubscription.member_id == member.id,
            MemberSubscription.subscription_status == "active",
            MemberSubscription.end_date >= date.today(),
        )
    ).first()
    if existing_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Member '{member.full_name}' already has an active subscription valid until {existing_active.end_date}. Use renewal or plan change endpoint.",
        )

    start_d = sub_in.start_date or date.today()
    end_d = start_d + timedelta(days=plan.duration_days)
    price_to_pay = sub_in.price_paid if sub_in.price_paid is not None else plan.monthly_fee

    new_sub = MemberSubscription(
        member_id=member.id,
        plan_id=plan.id,
        start_date=start_d,
        end_date=end_d,
        price_paid=price_to_pay,
        plan_name_snapshot=plan.name,
        duration_days_snapshot=plan.duration_days,
        court_discount_snapshot=plan.court_discount_percent,
        shop_discount_snapshot=plan.shop_discount_percent,
        bar_discount_snapshot=plan.bar_discount_percent,
        subscription_status="active",
        payment_status=sub_in.payment_status or "unpaid",
        notes=sub_in.notes.strip() if sub_in.notes else None,
    )

    # Atomically synchronize current member projection
    member.plan_id = plan.id
    member.start_date = start_d
    member.expiry_date = end_d
    member.is_active = True

    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return new_sub


def renew_subscription(
    db: Session, member_id: UUID, renew_in: SubscriptionRenewRequest
) -> MemberSubscription:
    """
    Renew a member's current subscription.
    Enforces:
    1. Member existence with row-level lock (with_for_update).
    2. Uses member's current plan; validates it is active with configured duration_days.
    3. Renewal calculation:
       - If currently active (expiry_date >= today): extends continuous term (start_date = expiry_date + 1).
       - If expired (expiry_date < today): resumes from today (start_date = today).
       - end_date = start_date + plan.duration_days.
    4. Immutable price and discount snapshots from current plan.
    5. Atomically extends Member.expiry_date and marks is_active = True.
    """
    member = db.scalars(
        select(Member).where(Member.id == member_id).with_for_update()
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Member with ID '{member_id}' not found.",
        )

    plan = get_plan_by_id(db, member.plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The member's current membership plan was not found.",
        )
    if not plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Membership plan '{plan.name}' is currently inactive. Please change to an active plan.",
        )
    if not plan.duration_days or plan.duration_days <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Membership plan '{plan.name}' has no configured duration_days. Cannot renew.",
        )

    today = date.today()
    if member.expiry_date >= today:
        start_d = member.expiry_date + timedelta(days=1)
    else:
        start_d = today
    end_d = start_d + timedelta(days=plan.duration_days)

    new_sub = MemberSubscription(
        member_id=member.id,
        plan_id=plan.id,
        start_date=start_d,
        end_date=end_d,
        price_paid=plan.monthly_fee,
        plan_name_snapshot=plan.name,
        duration_days_snapshot=plan.duration_days,
        court_discount_snapshot=plan.court_discount_percent,
        shop_discount_snapshot=plan.shop_discount_percent,
        bar_discount_snapshot=plan.bar_discount_percent,
        subscription_status="active",
        payment_status=renew_in.payment_status or "unpaid",
        notes=renew_in.notes.strip() if renew_in.notes else None,
    )

    # Atomically update current member projection
    member.expiry_date = end_d
    member.is_active = True

    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return new_sub


def change_plan_subscription(
    db: Session, member_id: UUID, change_in: SubscriptionChangePlanRequest
) -> MemberSubscription:
    """
    Change a member's plan tier (e.g. Silver -> Gold).
    Enforces:
    1. Member existence with row-level lock (with_for_update).
    2. New plan existence, active status, and configured duration_days.
    3. Any existing active subscription is marked 'cancelled' with cancellation audit timestamp.
    4. New subscription created with snapshots of the new plan benefits.
    5. Atomically updates Member.plan_id, dates, and active status.
    """
    member = db.scalars(
        select(Member).where(Member.id == member_id).with_for_update()
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Member with ID '{member_id}' not found.",
        )

    new_plan = get_plan_by_id(db, change_in.new_plan_id)
    if not new_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Membership plan with ID '{change_in.new_plan_id}' not found.",
        )
    if not new_plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target membership plan '{new_plan.name}' is inactive.",
        )
    if not new_plan.duration_days or new_plan.duration_days <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target membership plan '{new_plan.name}' has no configured duration_days.",
        )

    # Cancel previous active subscription history records to preserve historical integrity
    active_subs = list(
        db.scalars(
            select(MemberSubscription).where(
                MemberSubscription.member_id == member.id,
                MemberSubscription.subscription_status == "active",
            )
        ).all()
    )
    for old_sub in active_subs:
        old_sub.subscription_status = "cancelled"
        old_sub.cancelled_at = datetime.now(timezone.utc)
        note_append = f"[Superseded by plan change to {new_plan.name}]"
        old_sub.notes = f"{old_sub.notes} {note_append}".strip() if old_sub.notes else note_append

    start_d = date.today()
    end_d = start_d + timedelta(days=new_plan.duration_days)

    new_sub = MemberSubscription(
        member_id=member.id,
        plan_id=new_plan.id,
        start_date=start_d,
        end_date=end_d,
        price_paid=new_plan.monthly_fee,
        plan_name_snapshot=new_plan.name,
        duration_days_snapshot=new_plan.duration_days,
        court_discount_snapshot=new_plan.court_discount_percent,
        shop_discount_snapshot=new_plan.shop_discount_percent,
        bar_discount_snapshot=new_plan.bar_discount_percent,
        subscription_status="active",
        payment_status=change_in.payment_status or "unpaid",
        notes=change_in.notes.strip() if change_in.notes else None,
    )

    # Atomically update current member projection
    member.plan_id = new_plan.id
    member.start_date = start_d
    member.expiry_date = end_d
    member.is_active = True

    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return new_sub


def list_member_subscriptions(db: Session, member_id: UUID) -> List[MemberSubscription]:
    """Retrieve full subscription purchase and renewal history for a member."""
    get_member_by_id(db, member_id)  # Asserts member exists, raises 404 if not
    stmt = (
        select(MemberSubscription)
        .where(MemberSubscription.member_id == member_id)
        .order_by(MemberSubscription.created_at.desc())
    )
    return list(db.scalars(stmt).all())
