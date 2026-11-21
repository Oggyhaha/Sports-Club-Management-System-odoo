from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models import RoleEnum, User
from app.modules.members import service
from app.modules.members.schemas import (
    MemberCreate,
    MemberResponse,
    MemberUpdate,
    MembershipPlanResponse,
)

router = APIRouter(prefix="/members", tags=["Members"])


@router.get(
    "/plans",
    response_model=List[MembershipPlanResponse],
    summary="List all membership plans",
    description="Retrieve all club tiers (Gold, Silver, Junior) with fees and discount rates. Public.",
)
def get_plans(db: Session = Depends(get_db)):
    return service.list_plans(db)


@router.get(
    "",
    response_model=List[MemberResponse],
    summary="List members",
    description="Search members by name or email, or filter by plan and active status. Staff only.",
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
    description="Create a new member record assigned to a plan. Staff only (receptionist or owner).",
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
