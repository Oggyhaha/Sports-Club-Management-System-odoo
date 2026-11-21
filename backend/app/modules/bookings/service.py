from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.modules.bookings.models import Booking
from app.modules.bookings.schemas import BookingCreate
from app.modules.courts.models import Court
from app.modules.members.models import Member


def create_booking(db: Session, booking_in: BookingCreate) -> Booking:
    """
    Creates a new court booking enforcing all business rules:
    1. 30-minute boundary alignment (:00 or :30).
    2. Derived 60-minute duration (end_time = start_time + 60 mins).
    3. Member existence, active status, and non-expired membership verification.
    4. Court existence and active operational status.
    5. Member daily quota enforcement: maximum 2 active bookings per calendar day.
    6. Double-booking conflict prevention: no overlapping active bookings on the same court.
    7. Concurrency protection via row-level lock (with_for_update) on the court.
    8. Membership tier discount application on standard court hourly rates.
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

    # Concurrency control: Lock the court row within the current transaction
    # This prevents two concurrent requests from booking the same court simultaneously.
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

    # Rule 3: Validate Member and Membership Plan
    member_stmt = (
        select(Member)
        .options(joinedload(Member.plan))
        .where(Member.id == booking_in.member_id)
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

    # Rule 5: Daily Limit Enforcement (Max 2 active sessions per calendar day)
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

    # Rule 6: Overlap Conflict Check
    # Overlap formula: existing.start_time < requested_end AND existing.end_time > requested_start
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

    # Rule 8: Calculate Price with Member Tier Discount
    discount_pct = member.plan.court_discount_percent if member.plan else Decimal("0.00")
    discount_factor = (Decimal("100.00") - discount_pct) / Decimal("100.00")
    calculated_fee = (court.hourly_rate * discount_factor).quantize(Decimal("0.01"))

    # Create Booking Record
    new_booking = Booking(
        member_id=member.id,
        court_id=court.id,
        start_time=req_start,
        end_time=req_end,
        calculated_fee=calculated_fee,
        status="confirmed",
        notes=booking_in.notes.strip() if booking_in.notes else None,
    )

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    # Eagerly load member and court relationships for clean API response
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
    Cancels an active booking, instantly freeing up the court slot.
    """
    booking = get_booking_by_id(db, booking_id)

    if booking.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking has already been cancelled.",
        )

    booking.status = "cancelled"
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
