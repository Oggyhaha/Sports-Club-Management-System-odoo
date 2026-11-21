from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models import RoleEnum, User
from app.modules.bookings import service
from app.modules.bookings.schemas import (
    BookingCreate,
    BookingResponse,
    CourtAvailabilityResponse,
    SocialPlayParticipantResponse,
    SocialPlaySessionCreate,
    SocialPlaySessionResponse,
)

router = APIRouter(prefix="/bookings", tags=["Bookings"])


# ---------------------------------------------------------------------------
# Availability Endpoint
# ---------------------------------------------------------------------------
@router.get(
    "/availability",
    response_model=List[CourtAvailabilityResponse],
    summary="Check real-time court availability",
    description="Derive real-time 60-minute time slot availability across active courts for a given date. Public.",
)
def check_court_availability(
    target_date: date = Query(..., alias="date", description="Date to check availability for (YYYY-MM-DD)"),
    court_id: Optional[UUID] = Query(None, description="Optional court UUID to filter availability"),
    db: Session = Depends(get_db),
):
    return service.get_court_availability(db, target_date=target_date, court_id=court_id)


# ---------------------------------------------------------------------------
# Friday Social Play Endpoints
# ---------------------------------------------------------------------------
@router.get(
    "/social-sessions",
    response_model=List[SocialPlaySessionResponse],
    summary="List social play sessions",
    description="Retrieve all scheduled social play sessions with capacity and participant counts. Public.",
)
def get_social_sessions(
    date_filter: Optional[date] = Query(None, alias="date", description="Filter sessions by date"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter sessions by status ('scheduled', 'cancelled')"),
    db: Session = Depends(get_db),
):
    return service.list_social_sessions(db, date_filter=date_filter, status_filter=status_filter)


@router.post(
    "/social-sessions",
    response_model=SocialPlaySessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a social play session",
    description="Create an organized social play session (e.g. Friday Social Tennis) with defined capacity. Staff only (owner or receptionist).",
)
def create_social_session(
    session_in: SocialPlaySessionCreate,
    current_user: User = Depends(require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST)),
    db: Session = Depends(get_db),
):
    return service.create_social_session(db, session_in)


@router.get(
    "/social-sessions/{session_id}",
    response_model=SocialPlaySessionResponse,
    summary="Get social play session by ID",
    description="Retrieve detailed social play session information and active participants. Public.",
)
def get_social_session(
    session_id: UUID,
    db: Session = Depends(get_db),
):
    return service.get_social_session_by_id(db, session_id)


@router.post(
    "/social-sessions/{session_id}/join",
    response_model=SocialPlayParticipantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Join a social play session",
    description="Register an active member for a social play session. Enforces atomic capacity limits and prevents duplicate registration.",
)
def join_social_session_endpoint(
    session_id: UUID,
    member_id: Optional[UUID] = Query(None, description="Member UUID (staff can specify; members default to own profile)"),
    current_user: User = Depends(require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST, RoleEnum.MEMBER)),
    db: Session = Depends(get_db),
):
    user_roles = {r.name for r in current_user.roles}
    target_member_id = member_id

    # If caller has only member role, strictly force their own linked member profile
    if RoleEnum.OWNER.value not in user_roles and RoleEnum.RECEPTIONIST.value not in user_roles:
        if not current_user.member_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must link or activate a club member profile before joining social sessions.",
            )
        if member_id and member_id != current_user.member_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: You can only join social sessions for your own member profile.",
            )
        target_member_id = current_user.member_profile.id
    elif not target_member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="member_id is required when staff joins a member into a social session.",
        )

    return service.join_social_session(db, session_id, target_member_id)


@router.post(
    "/social-sessions/{session_id}/leave",
    response_model=SocialPlayParticipantResponse,
    summary="Leave a social play session",
    description="Cancel a member's participation in a social session, immediately freeing up capacity.",
)
def leave_social_session_endpoint(
    session_id: UUID,
    member_id: Optional[UUID] = Query(None, description="Member UUID (staff can specify; members default to own profile)"),
    current_user: User = Depends(require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST, RoleEnum.MEMBER)),
    db: Session = Depends(get_db),
):
    user_roles = {r.name for r in current_user.roles}
    target_member_id = member_id

    if RoleEnum.OWNER.value not in user_roles and RoleEnum.RECEPTIONIST.value not in user_roles:
        if not current_user.member_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No member profile linked to this user account.",
            )
        if member_id and member_id != current_user.member_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: You can only leave sessions for your own member profile.",
            )
        target_member_id = current_user.member_profile.id
    elif not target_member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="member_id is required when staff cancels a member from a social session.",
        )

    return service.leave_social_session(db, session_id, target_member_id)


@router.post(
    "/social-sessions/{session_id}/cancel",
    response_model=SocialPlaySessionResponse,
    summary="Cancel a social play session",
    description="Cancel an entire scheduled social play session and all participant entries. Staff only.",
)
def cancel_social_session_endpoint(
    session_id: UUID,
    current_user: User = Depends(require_roles(RoleEnum.OWNER, RoleEnum.RECEPTIONIST)),
    db: Session = Depends(get_db),
):
    return service.cancel_social_session(db, session_id)


# ---------------------------------------------------------------------------
# Standard Booking Endpoints
# ---------------------------------------------------------------------------
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
    description="Reserve a 60-minute court session. Members can only book for themselves; staff can book for members or walk-in guests.",
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
        if not booking_in.member_id or booking_in.member_id != current_user.member_profile.id:
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
