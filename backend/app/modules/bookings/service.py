from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.modules.bookings.models import Booking, SocialPlayParticipant, SocialPlaySession
from app.modules.bookings.schemas import (
    BookingCreate,
    CourtAvailabilityResponse,
    SlotAvailability,
    SocialPlaySessionCreate,
    SocialPlaySessionUpdate,
)
from app.modules.courts.models import Court
from app.modules.members.models import Member


# ---------------------------------------------------------------------------
# Standard Booking Services
# ---------------------------------------------------------------------------
def create_booking(db: Session, booking_in: BookingCreate) -> Booking:
    """
    Creates a new court booking enforcing all business rules:
    1. 30-minute boundary alignment (:00 or :30, 00 seconds, 00 microseconds).
    2. Strictly derived 60-minute duration (end_time = start_time + 60 mins).
    3. Court existence and active operational status.
    4. Concurrency protection via row-level lock (with_for_update) on the Court.
    5. Double-booking conflict prevention: no overlapping active bookings on the same court.
    6. Social play conflict prevention: no conflict with scheduled social sessions on the same court.
    7. If member_id provided:
       - Row-level lock on the Member row (with_for_update) to serialize daily quota checks.
       - Verification that member account is active and not expired on booking date.
       - Daily quota enforcement: maximum 2 active standard bookings per member per calendar day.
       - Membership tier court discount applied to hourly rate.
    8. If member_id is None (Walk-in booking):
       - Uses court.walk_in_rate if configured, falling back to court.hourly_rate.
       - Records walk_in_name and walk_in_phone.
    """
    req_start = booking_in.start_time

    # Rule 1: 30-Minute boundary alignment check
    if req_start.minute not in (0, 30) or req_start.second != 0 or req_start.microsecond != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking start time must align to a 30-minute boundary (e.g. :00 or :30) with zero seconds.",
        )

    # Rule 2: Derive 60-minute session end time
    req_end = req_start + timedelta(minutes=60)

    # Rule 3 & 4: Concurrency control via row-level lock on the court
    court_stmt = (
        select(Court)
        .where(Court.id == booking_in.court_id)
        .with_for_update()
    )
    court = db.scalars(court_stmt).first()
    if not court:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Court with ID '{booking_in.court_id}' not found.",
        )
    if not court.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Court '{court.name}' is currently inactive or under maintenance.",
        )

    # Rule 5 & 6: Overlap Conflict Checks on the Court
    # A) Check against standard active bookings
    conflict_stmt = (
        select(Booking)
        .where(
            Booking.court_id == court.id,
            Booking.status != "cancelled",
            Booking.start_time < req_end,
            Booking.end_time > req_start,
        )
    )
    conflict = db.scalars(conflict_stmt).first()
    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Court conflict: Court '{court.name}' is already booked from {conflict.start_time.strftime('%H:%M')} to {conflict.end_time.strftime('%H:%M')}.",
        )

    # B) Check against scheduled social play sessions
    social_conflict_stmt = (
        select(SocialPlaySession)
        .where(
            SocialPlaySession.court_id == court.id,
            SocialPlaySession.status == "scheduled",
            SocialPlaySession.start_time < req_end,
            SocialPlaySession.end_time > req_start,
        )
    )
    social_conflict = db.scalars(social_conflict_stmt).first()
    if social_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Court conflict: Court '{court.name}' is reserved for social play '{social_conflict.title}' from {social_conflict.start_time.strftime('%H:%M')} to {social_conflict.end_time.strftime('%H:%M')}.",
        )

    # Rule 7: Member-specific validations vs Walk-in pricing
    if booking_in.member_id:
        # Concurrency control: Lock Member row to serialize quota checking under concurrent requests
        member_stmt = (
            select(Member)
            .where(Member.id == booking_in.member_id)
            .with_for_update()
        )
        member = db.scalars(member_stmt).first()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Member with ID '{booking_in.member_id}' not found.",
            )
        if not member.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Member account '{member.full_name}' is inactive.",
            )
        if req_start.date() > member.expiry_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Membership expired on {member.expiry_date}. Cannot book for {req_start.date()}.",
            )

        # Enforce Daily Quota (Max 2 active standard bookings per calendar day)
        day_start = datetime(
            req_start.year, req_start.month, req_start.day, 0, 0, 0, tzinfo=req_start.tzinfo
        )
        day_end = day_start + timedelta(days=1)

        daily_count_stmt = (
            select(Booking)
            .where(
                Booking.member_id == member.id,
                Booking.status != "cancelled",
                Booking.start_time >= day_start,
                Booking.start_time < day_end,
            )
        )
        active_daily_bookings = list(db.scalars(daily_count_stmt).all())
        if len(active_daily_bookings) >= 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Member '{member.full_name}' has reached the maximum limit of 2 active bookings for this calendar day.",
            )

        # Calculate Price with Member Tier Discount
        discount_pct = member.plan.court_discount_percent if member.plan else Decimal("0.00")
        discount_factor = (Decimal("100.00") - discount_pct) / Decimal("100.00")
        calculated_fee = (court.hourly_rate * discount_factor).quantize(Decimal("0.01"))
    else:
        # Walk-in customer: use court's walk_in_rate if set, otherwise hourly_rate
        if court.walk_in_rate is not None:
            calculated_fee = court.walk_in_rate.quantize(Decimal("0.01"))
        else:
            calculated_fee = court.hourly_rate.quantize(Decimal("0.01"))

    # Create Booking Record
    new_booking = Booking(
        member_id=booking_in.member_id,
        court_id=court.id,
        start_time=req_start,
        end_time=req_end,
        calculated_fee=calculated_fee,
        status="confirmed",
        notes=booking_in.notes.strip() if booking_in.notes else None,
        walk_in_name=booking_in.walk_in_name.strip() if booking_in.walk_in_name else None,
        walk_in_phone=booking_in.walk_in_phone.strip() if booking_in.walk_in_phone else None,
    )

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    return get_booking_by_id(db, new_booking.id)


def get_booking_by_id(db: Session, booking_id: UUID) -> Booking:
    """Retrieve a booking by UUID with eagerly loaded member, court, and plan info."""
    stmt = (
        select(Booking)
        .options(
            joinedload(Booking.member).joinedload(Member.plan),
            joinedload(Booking.court),
        )
        .where(Booking.id == booking_id)
    )
    booking = db.scalars(stmt).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking with ID '{booking_id}' not found.",
        )
    return booking


def cancel_booking(db: Session, booking_id: UUID) -> Booking:
    """
    Cancels an active booking, recording the cancellation audit timestamp
    and instantly freeing up the court slot and daily quota.
    """
    booking = get_booking_by_id(db, booking_id)

    if booking.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking has already been cancelled.",
        )

    booking.status = "cancelled"
    booking.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(booking)
    return booking


def list_bookings(
    db: Session,
    member_id: Optional[UUID] = None,
    court_id: Optional[UUID] = None,
    date_filter: Optional[date] = None,
    status_filter: Optional[str] = None,
) -> List[Booking]:
    """
    List bookings with optional filters for member, court, date, and status.
    Ordered chronologically by start_time descending.
    """
    stmt = (
        select(Booking)
        .options(
            joinedload(Booking.member).joinedload(Member.plan),
            joinedload(Booking.court),
        )
        .order_by(Booking.start_time.desc())
    )

    if member_id:
        stmt = stmt.where(Booking.member_id == member_id)

    if court_id:
        stmt = stmt.where(Booking.court_id == court_id)

    if status_filter:
        stmt = stmt.where(Booking.status == status_filter.strip().lower())

    if date_filter:
        day_start = datetime(date_filter.year, date_filter.month, date_filter.day, 0, 0, 0)
        day_end = day_start + timedelta(days=1)
        stmt = stmt.where(Booking.start_time >= day_start, Booking.start_time < day_end)

    return list(db.scalars(stmt).unique().all())


# ---------------------------------------------------------------------------
# Court Availability Service
# ---------------------------------------------------------------------------
def get_court_availability(
    db: Session,
    target_date: date,
    court_id: Optional[UUID] = None,
) -> List[CourtAvailabilityResponse]:
    """
    Derives real-time 60-minute slot availability from 06:00 to 22:00 in 30-minute intervals.
    Cross-checks against active bookings and scheduled social play sessions.
    """
    court_stmt = select(Court).where(Court.is_active.is_(True)).order_by(Court.name.asc())
    if court_id:
        court_stmt = court_stmt.where(Court.id == court_id)

    courts = list(db.scalars(court_stmt).all())
    if not courts and court_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active court with ID '{court_id}' not found.",
        )

    day_start = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    # Eagerly load all active bookings for this date across the requested courts
    bookings_stmt = (
        select(Booking)
        .where(
            Booking.status != "cancelled",
            Booking.start_time >= day_start - timedelta(minutes=60),
            Booking.start_time < day_end,
        )
    )
    if court_id:
        bookings_stmt = bookings_stmt.where(Booking.court_id == court_id)
    active_bookings = list(db.scalars(bookings_stmt).all())

    # Eagerly load all scheduled social play sessions for this date
    social_stmt = (
        select(SocialPlaySession)
        .where(
            SocialPlaySession.status == "scheduled",
            SocialPlaySession.start_time >= day_start - timedelta(hours=2),
            SocialPlaySession.start_time < day_end,
        )
    )
    if court_id:
        social_stmt = social_stmt.where(SocialPlaySession.court_id == court_id)
    active_social_sessions = list(db.scalars(social_stmt).all())

    results = []
    for court in courts:
        court_bookings = [b for b in active_bookings if b.court_id == court.id]
        court_social = [s for s in active_social_sessions if s.court_id == court.id]

        slots = []
        # Generate 30-min start time intervals from 06:00 to 21:00 (each session lasts 60 mins)
        start_hour = 6
        end_hour = 21  # Last 60-min session starts at 21:00 and finishes at 22:00

        current_time = datetime(
            target_date.year, target_date.month, target_date.day, start_hour, 0, 0, tzinfo=timezone.utc
        )
        closing_time = datetime(
            target_date.year, target_date.month, target_date.day, end_hour, 0, 0, tzinfo=timezone.utc
        )

        while current_time <= closing_time:
            slot_end = current_time + timedelta(minutes=60)

            # Check overlap against standard bookings
            overlapping_booking = next(
                (b for b in court_bookings if b.start_time < slot_end and b.end_time > current_time),
                None,
            )

            # Check overlap against social sessions
            overlapping_social = next(
                (s for s in court_social if s.start_time < slot_end and s.end_time > current_time),
                None,
            )

            if overlapping_booking:
                slots.append(
                    SlotAvailability(
                        start_time=current_time,
                        end_time=slot_end,
                        is_available=False,
                        booking_id=overlapping_booking.id,
                        session_type="standard_booking",
                    )
                )
            elif overlapping_social:
                slots.append(
                    SlotAvailability(
                        start_time=current_time,
                        end_time=slot_end,
                        is_available=False,
                        booking_id=overlapping_social.id,
                        session_type="social_play",
                    )
                )
            else:
                slots.append(
                    SlotAvailability(
                        start_time=current_time,
                        end_time=slot_end,
                        is_available=True,
                        booking_id=None,
                        session_type=None,
                    )
                )

            current_time += timedelta(minutes=30)

        results.append(
            CourtAvailabilityResponse(
                date=target_date,
                court_id=court.id,
                court_name=court.name,
                sport_type=court.sport_type,
                hourly_rate=court.hourly_rate,
                walk_in_rate=court.walk_in_rate,
                slots=slots,
            )
        )

    return results


# ---------------------------------------------------------------------------
# Friday Social Play Services
# ---------------------------------------------------------------------------
def create_social_session(db: Session, session_in: SocialPlaySessionCreate) -> SocialPlaySession:
    """
    Creates an organized social play session (Staff only).
    Enforces court locking, 30-min boundary alignment, and court conflict prevention.
    """
    req_start = session_in.start_time
    req_end = session_in.end_time

    if req_start.minute not in (0, 30) or req_start.second != 0 or req_start.microsecond != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Social session start time must align to a 30-minute boundary.",
        )
    if req_end.minute not in (0, 30) or req_end.second != 0 or req_end.microsecond != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Social session end time must align to a 30-minute boundary.",
        )
    if req_end <= req_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session end time must be later than start time.",
        )

    # Lock court row
    court = db.scalars(
        select(Court).where(Court.id == session_in.court_id).with_for_update()
    ).first()
    if not court:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Court with ID '{session_in.court_id}' not found.",
        )
    if not court.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Court '{court.name}' is inactive.",
        )

    # Check conflict with existing active bookings
    booking_conflict = db.scalars(
        select(Booking).where(
            Booking.court_id == court.id,
            Booking.status != "cancelled",
            Booking.start_time < req_end,
            Booking.end_time > req_start,
        )
    ).first()
    if booking_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Court conflict: Court '{court.name}' already has an active booking from {booking_conflict.start_time.strftime('%H:%M')} to {booking_conflict.end_time.strftime('%H:%M')}.",
        )

    # Check conflict with existing scheduled social sessions
    social_conflict = db.scalars(
        select(SocialPlaySession).where(
            SocialPlaySession.court_id == court.id,
            SocialPlaySession.status == "scheduled",
            SocialPlaySession.start_time < req_end,
            SocialPlaySession.end_time > req_start,
        )
    ).first()
    if social_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Court conflict: Court '{court.name}' already has social session '{social_conflict.title}' from {social_conflict.start_time.strftime('%H:%M')} to {social_conflict.end_time.strftime('%H:%M')}.",
        )

    new_session = SocialPlaySession(
        court_id=court.id,
        title=session_in.title.strip(),
        start_time=req_start,
        end_time=req_end,
        max_capacity=session_in.max_capacity,
        fee_per_participant=session_in.fee_per_participant,
        status="scheduled",
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return get_social_session_by_id(db, new_session.id)


def get_social_session_by_id(db: Session, session_id: UUID) -> SocialPlaySession:
    """Retrieve social session with court and participants eagerly loaded."""
    stmt = (
        select(SocialPlaySession)
        .options(
            joinedload(SocialPlaySession.court),
            joinedload(SocialPlaySession.participants).joinedload(SocialPlayParticipant.member),
        )
        .where(SocialPlaySession.id == session_id)
    )
    session_obj = db.scalars(stmt).first()
    if not session_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Social play session with ID '{session_id}' not found.",
        )
    # Populate active participants count
    active_count = sum(1 for p in session_obj.participants if p.status == "joined")
    setattr(session_obj, "active_participants_count", active_count)
    return session_obj


def list_social_sessions(
    db: Session,
    date_filter: Optional[date] = None,
    status_filter: Optional[str] = None,
) -> List[SocialPlaySession]:
    """Retrieve social sessions with optional date and status filters."""
    stmt = (
        select(SocialPlaySession)
        .options(
            joinedload(SocialPlaySession.court),
            joinedload(SocialPlaySession.participants).joinedload(SocialPlayParticipant.member),
        )
        .order_by(SocialPlaySession.start_time.desc())
    )

    if status_filter:
        stmt = stmt.where(SocialPlaySession.status == status_filter.strip().lower())

    if date_filter:
        day_start = datetime(date_filter.year, date_filter.month, date_filter.day, 0, 0, 0)
        day_end = day_start + timedelta(days=1)
        stmt = stmt.where(
            SocialPlaySession.start_time >= day_start,
            SocialPlaySession.start_time < day_end,
        )

    sessions = list(db.scalars(stmt).unique().all())
    for s in sessions:
        active_count = sum(1 for p in s.participants if p.status == "joined")
        setattr(s, "active_participants_count", active_count)
    return sessions


def join_social_session(db: Session, session_id: UUID, member_id: UUID) -> SocialPlayParticipant:
    """
    Enrolls a member into a social play session.
    Enforces atomic row locking on the session, verifies capacity,
    and prevents duplicate active registration.
    """
    # 1. Lock the session row to prevent capacity race conditions
    session_stmt = (
        select(SocialPlaySession)
        .where(SocialPlaySession.id == session_id)
        .with_for_update()
    )
    session_obj = db.scalars(session_stmt).first()
    if not session_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Social play session with ID '{session_id}' not found.",
        )
    if session_obj.status != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Social session is {session_obj.status} and cannot be joined.",
        )

    # 2. Lock and validate member
    member = db.scalars(
        select(Member).where(Member.id == member_id).with_for_update()
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Member with ID '{member_id}' not found.",
        )
    if not member.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Member account '{member.full_name}' is inactive.",
        )

    # 3. Prevent duplicate active participation
    existing_stmt = select(SocialPlayParticipant).where(
        SocialPlayParticipant.session_id == session_obj.id,
        SocialPlayParticipant.member_id == member.id,
        SocialPlayParticipant.status == "joined",
    )
    if db.scalars(existing_stmt).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Member '{member.full_name}' is already registered for this social session.",
        )

    # 4. Check capacity atomically inside the locked transaction
    count_stmt = select(func.count(SocialPlayParticipant.id)).where(
        SocialPlayParticipant.session_id == session_obj.id,
        SocialPlayParticipant.status == "joined",
    )
    current_count = db.scalar(count_stmt) or 0
    if current_count >= session_obj.max_capacity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Social session '{session_obj.title}' has reached maximum capacity ({session_obj.max_capacity} participants).",
        )

    new_participant = SocialPlayParticipant(
        session_id=session_obj.id,
        member_id=member.id,
        status="joined",
    )
    db.add(new_participant)
    db.commit()
    db.refresh(new_participant)

    # Load member relationship for response
    new_participant.member = member
    return new_participant


def leave_social_session(db: Session, session_id: UUID, member_id: UUID) -> SocialPlayParticipant:
    """
    Cancels a member's participation in a social session, instantly releasing 1 capacity spot.
    """
    session_stmt = (
        select(SocialPlaySession)
        .where(SocialPlaySession.id == session_id)
        .with_for_update()
    )
    session_obj = db.scalars(session_stmt).first()
    if not session_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Social play session with ID '{session_id}' not found.",
        )

    participant_stmt = select(SocialPlayParticipant).where(
        SocialPlayParticipant.session_id == session_obj.id,
        SocialPlayParticipant.member_id == member_id,
        SocialPlayParticipant.status == "joined",
    )
    participant = db.scalars(participant_stmt).first()
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active registration for this member was not found in this session.",
        )

    participant.status = "cancelled"
    participant.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(participant)
    return participant


def cancel_social_session(db: Session, session_id: UUID) -> SocialPlaySession:
    """Cancels a scheduled social session and all participant entries (Staff only)."""
    session_obj = get_social_session_by_id(db, session_id)
    if session_obj.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session has already been cancelled.",
        )

    session_obj.status = "cancelled"
    for p in session_obj.participants:
        if p.status == "joined":
            p.status = "cancelled"
            p.cancelled_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(session_obj)
    return session_obj
