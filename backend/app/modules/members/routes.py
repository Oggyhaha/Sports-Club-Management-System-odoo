from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import RoleEnum, User
from app.modules.members import service
from app.modules.members.schemas import (
    MemberCreate,
    MemberResponse,
    MemberSubscriptionResponse,
    MemberUpdate,
    MembershipPlanCreate,
    MembershipPlanResponse,
    MembershipPlanUpdate,
    OnlineSubscriptionPurchaseRequest,
    SubscriptionChangePlanRequest,
    SubscriptionCreateRequest,
    SubscriptionRenewRequest,
)

router = APIRouter(prefix="/members", tags=["Members"])


# ---------------------------------------------------------
# Membership Plan Endpoints
# ---------------------------------------------------------
@router.get(
    "/plans",
    response_model=List[MembershipPlanResponse],
    summary="List membership plans",
    description="Retrieve all club membership plans with benefits and discounts. Public.",
)
def get_plans(
    active_only: bool = Query(True, description="Filter only active plans"),
    db: Session = Depends(get_db),
):
    return service.list_plans(db, active_only=active_only)


@router.post(
    "/plans",
    response_model=MembershipPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new membership plan",
    description="Create a new membership tier with configured fees, discounts, and duration. Owner only.",
)
def create_new_plan(
    plan_in: MembershipPlanCreate,
    current_user: User = Depends(require_roles(RoleEnum.OWNER)),
    db: Session = Depends(get_db),
):
    return service.create_plan(db, plan_in)


@router.put(
    "/plans/{plan_id}",
    response_model=MembershipPlanResponse,
    summary="Update membership plan",
    description="Modify plan benefits, duration, fee, or active status. Historical subscriptions retain their original snapshots. Owner only.",
)
def update_existing_plan(
    plan_id: UUID,
    plan_in: MembershipPlanUpdate,
    current_user: User = Depends(require_roles(RoleEnum.OWNER)),
    db: Session = Depends(get_db),
):
    return service.update_plan(db, plan_id, plan_in)


# ---------------------------------------------------------
# Member Self-Service Endpoint
# ---------------------------------------------------------
@router.get(
    "/me",
    response_model=MemberResponse,
    summary="Get current user's member profile",
    description="Retrieve the club member profile linked to the authenticated user account.",
)
def get_current_user_member_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = service.get_member_by_user_id(db, current_user.id)
    if not member:
        # Fallback check by email if account was created separately
        from sqlalchemy import select
        from app.modules.members.models import Member
        fallback_member = db.scalars(select(Member).where(Member.email == current_user.email)).first()
        if fallback_member:
            fallback_member.user_id = current_user.id
            db.commit()
            db.refresh(fallback_member)
            return fallback_member

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No member profile linked to this user account.",
        )
    return member


@router.post(
    "/me/subscribe",
    response_model=MemberSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Self-service membership enrollment and online purchase",
    description="Allows authenticated users (prospective or active members) to purchase, activate, renew, or switch membership plans online using mock payment.",
)
def subscribe_online_endpoint(
    purchase_in: OnlineSubscriptionPurchaseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.purchase_online_subscription(db, current_user, purchase_in)


# ---------------------------------------------------------
# Member Management Endpoints
# ---------------------------------------------------------
@router.get(
    "",
    response_model=List[MemberResponse],
    summary="List members",
    description="Search members by name or email, or filter by plan and active status. Staff only (owner or receptionist).",
)
def get_members(
    search: Optional[str] = Query(None, description="Search term for name or email"),
    plan_id: Optional[UUID] = Query(None, description="Filter by membership plan UUID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST)),
    db: Session = Depends(get_db),
):
    return service.list_members(db, search=search, plan_id=plan_id, is_active=is_active)


@router.post(
    "",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new member",
    description="Create a new member record assigned to a plan (walk-in or registered user). Staff only.",
)
def create_new_member(
    member_in: MemberCreate,
    current_user: User = Depends(require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST)),
    db: Session = Depends(get_db),
):
    return service.create_member(db, member_in)


@router.get(
    "/{member_id}",
    response_model=MemberResponse,
    summary="Get member by ID",
    description="Retrieve detailed member profile. Allowed for staff (owner/receptionist) or the member themselves.",
)
def get_member(
    member_id: UUID,
    current_user: User = Depends(
        require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST, RoleEnum.MEMBER)
    ),
    db: Session = Depends(get_db),
):
    member = service.get_member_by_id(db, member_id)
    # Object-level authorization check: Members can only access their own profile
    user_roles = {r.name for r in current_user.roles}
    if RoleEnum.OWNER.value not in user_roles and RoleEnum.RECEPTIONIST.value not in user_roles:
        if member.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: You can only view your own member profile.",
            )
    return member


@router.put(
    "/{member_id}",
    response_model=MemberResponse,
    summary="Update member details",
    description="Update a member's contact info, plan tier, expiry date, or active status. Staff only.",
)
def update_member_details(
    member_id: UUID,
    member_in: MemberUpdate,
    current_user: User = Depends(require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST)),
    db: Session = Depends(get_db),
):
    return service.update_member(db, member_id, member_in)


# ---------------------------------------------------------
# Member Subscription History & Operations Endpoints
# ---------------------------------------------------------
@router.post(
    "/{member_id}/subscriptions",
    response_model=MemberSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Purchase a membership subscription",
    description="Purchase an initial or new subscription for a member. Captures price and discount snapshots. Staff only.",
)
def purchase_subscription(
    member_id: UUID,
    sub_in: SubscriptionCreateRequest,
    current_user: User = Depends(require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST)),
    db: Session = Depends(get_db),
):
    return service.create_subscription(db, member_id, sub_in)


@router.post(
    "/{member_id}/renew",
    response_model=MemberSubscriptionResponse,
    summary="Renew membership subscription",
    description="Renew an active or expired subscription using the member's current plan tier. Staff only.",
)
def renew_member_subscription(
    member_id: UUID,
    renew_in: SubscriptionRenewRequest,
    current_user: User = Depends(require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST)),
    db: Session = Depends(get_db),
):
    return service.renew_subscription(db, member_id, renew_in)


@router.post(
    "/{member_id}/change-plan",
    response_model=MemberSubscriptionResponse,
    summary="Change membership plan tier",
    description="Switch member to a new plan tier (e.g. Silver -> Gold). Cancels previous active subscription and creates new subscription snapshot. Staff only.",
)
def change_member_plan(
    member_id: UUID,
    change_in: SubscriptionChangePlanRequest,
    current_user: User = Depends(require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST)),
    db: Session = Depends(get_db),
):
    return service.change_plan_subscription(db, member_id, change_in)


@router.get(
    "/{member_id}/subscriptions",
    response_model=List[MemberSubscriptionResponse],
    summary="Get member subscription history",
    description="Retrieve all subscription purchases, renewals, and plan changes for a member. Allowed for staff or the member themselves.",
)
def get_member_subscriptions(
    member_id: UUID,
    current_user: User = Depends(
        require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST, RoleEnum.MEMBER)
    ),
    db: Session = Depends(get_db),
):
    member = service.get_member_by_id(db, member_id)
    user_roles = {r.name for r in current_user.roles}
    if RoleEnum.OWNER.value not in user_roles and RoleEnum.RECEPTIONIST.value not in user_roles:
        if member.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: You can only view your own subscription history.",
            )
    return service.list_member_subscriptions(db, member_id)
