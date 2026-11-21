from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
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
    description="Retrieve all club tiers (Gold, Silver, Junior) with fees and discount rates.",
)
def get_plans(db: Session = Depends(get_db)):
    return service.list_plans(db)


@router.get(
    "",
    response_model=List[MemberResponse],
    summary="List members",
    description="Search members by name or email, or filter by plan and active status.",
)
def get_members(
    search: Optional[str] = Query(None, description="Search term for name or email"),
    plan_id: Optional[UUID] = Query(None, description="Filter by membership plan UUID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
):
    return service.list_members(db, search=search, plan_id=plan_id, is_active=is_active)


@router.post(
    "",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new member",
    description="Create a new member record assigned to a plan. Defaults to 1-year duration.",
)
def create_new_member(
    member_in: MemberCreate,
    db: Session = Depends(get_db),
):
    return service.create_member(db, member_in)


@router.get(
    "/{member_id}",
    response_model=MemberResponse,
    summary="Get member by ID",
    description="Retrieve detailed member profile along with their membership tier.",
)
def get_member(
    member_id: UUID,
    db: Session = Depends(get_db),
):
    return service.get_member_by_id(db, member_id)


@router.put(
    "/{member_id}",
    response_model=MemberResponse,
    summary="Update member details",
    description="Update a member's contact info, plan tier, expiry date, or active status.",
)
def update_member_details(
    member_id: UUID,
    member_in: MemberUpdate,
    db: Session = Depends(get_db),
):
    return service.update_member(db, member_id, member_in)
