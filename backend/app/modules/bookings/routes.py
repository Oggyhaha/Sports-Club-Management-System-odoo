from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.bookings import service
from app.modules.bookings.schemas import BookingCreate, BookingResponse

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.get(
    "",
    response_model=List[BookingResponse],
    summary="List all bookings",
    description="Retrieve bookings with optional filters by member, court, date, or status.",
)
def get_bookings(
    member_id: Optional[UUID] = Query(None, description="Filter by member UUID"),
    court_id: Optional[UUID] = Query(None, description="Filter by court UUID"),
    date_filter: Optional[date] = Query(None, alias="date", description="Filter bookings on a specific date (YYYY-MM-DD)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status ('confirmed', 'cancelled')"),
    db: Session = Depends(get_db),
):
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
    description="Reserve a 60-minute court session. Validates 30-minute boundaries, member quota (max 2/day), and prevents court conflicts.",
)
def create_new_booking(
    booking_in: BookingCreate,
    db: Session = Depends(get_db),
):
    return service.create_booking(db, booking_in)


@router.get(
    "/{booking_id}",
    response_model=BookingResponse,
    summary="Get booking by ID",
    description="Retrieve detailed booking information including member profile and court details.",
)
def get_booking(
    booking_id: UUID,
    db: Session = Depends(get_db),
):
    return service.get_booking_by_id(db, booking_id)


@router.post(
    "/{booking_id}/cancel",
    response_model=BookingResponse,
    summary="Cancel a booking",
    description="Cancel an existing booking. Instantly unlocks the court slot for new bookings.",
)
def cancel_existing_booking(
    booking_id: UUID,
    db: Session = Depends(get_db),
):
    return service.cancel_booking(db, booking_id)
