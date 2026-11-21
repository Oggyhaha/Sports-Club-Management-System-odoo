from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models import RoleEnum, User
from app.modules.bookings import service
from app.modules.bookings.schemas import BookingCreate, BookingResponse

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.get(
    "",
    response_model=List[BookingResponse],
    summary="List all bookings",
    description="Retrieve bookings with optional filters. Staff see all bookings; members see only their own.",
)
def get_bookings(
    member_id: Optional[UUID] = Query(None, description="Filter by member UUID"),
    court_id: Optional[UUID] = Query(None, description="Filter by court UUID"),
    date_filter: Optional[date] = Query(None, alias="date", description="Filter bookings on a specific date (YYYY-MM-DD)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status ('confirmed', 'cancelled')"),
    current_user: User = Depends(
        require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST, RoleEnum.MEMBER)
    ),
    db: Session = Depends(get_db),
):
    user_roles = {r.name for r in current_user.roles}
    # If caller has only 'member' role, restrict query strictly to their own member profile
    if RoleEnum.OWNER.value not in user_roles and RoleEnum.RECEPTIONIST.value not in user_roles:
        if not current_user.member_profile:
            return []
        member_id = current_user.member_profile.id

    return service.list_bookings(
        db,
        member_id=member_id,
        court_id=court_id,
        date_filter=date_filter,
        status_filter=status_filter,
    )


@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new court booking",
    description="Reserve a 60-minute court session. Members can only book for themselves; staff can book for any member.",
)
def create_new_booking(
    booking_in: BookingCreate,
    current_user: User = Depends(
        require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST, RoleEnum.MEMBER)
    ),
    db: Session = Depends(get_db),
):
    user_roles = {r.name for r in current_user.roles}
    # Object-level ownership check: Members can only book for their own linked member profile
    if RoleEnum.OWNER.value not in user_roles and RoleEnum.RECEPTIONIST.value not in user_roles:
        if not current_user.member_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must link or activate a club member profile before booking courts.",
            )
        if booking_in.member_id != current_user.member_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: You can only book courts for your own member profile.",
            )

    return service.create_booking(db, booking_in)


@router.get(
    "/{booking_id}",
    response_model=BookingResponse,
    summary="Get booking by ID",
    description="Retrieve detailed booking information. Members can only view their own bookings.",
)
def get_booking(
    booking_id: UUID,
    current_user: User = Depends(
        require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST, RoleEnum.MEMBER)
    ),
    db: Session = Depends(get_db),
):
    booking = service.get_booking_by_id(db, booking_id)
    user_roles = {r.name for r in current_user.roles}
    if RoleEnum.OWNER.value not in user_roles and RoleEnum.RECEPTIONIST.value not in user_roles:
        user_member_id = getattr(current_user.member_profile, "id", None)
        if not user_member_id or booking.member_id != user_member_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: You can only access your own bookings.",
            )
    return booking


@router.post(
    "/{booking_id}/cancel",
    response_model=BookingResponse,
    summary="Cancel a booking",
    description="Cancel an existing booking. Members can only cancel their own bookings.",
)
def cancel_existing_booking(
    booking_id: UUID,
    current_user: User = Depends(
        require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST, RoleEnum.MEMBER)
    ),
    db: Session = Depends(get_db),
):
    booking = service.get_booking_by_id(db, booking_id)
    user_roles = {r.name for r in current_user.roles}
    if RoleEnum.OWNER.value not in user_roles and RoleEnum.RECEPTIONIST.value not in user_roles:
        user_member_id = getattr(current_user.member_profile, "id", None)
        if not user_member_id or booking.member_id != user_member_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: You can only cancel your own bookings.",
            )

    return service.cancel_booking(db, booking_id)
