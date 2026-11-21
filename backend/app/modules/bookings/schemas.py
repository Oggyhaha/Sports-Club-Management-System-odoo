from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.courts.schemas import CourtResponse
from app.modules.members.schemas import MemberResponse


# ---------------------------------------------------------------------------
# Standard Booking Schemas
# ---------------------------------------------------------------------------
class BookingCreate(BaseModel):
    member_id: Optional[UUID] = Field(
        None,
        description="UUID of the member making the booking. Set to None for front-desk walk-in customers.",
    )
    court_id: UUID = Field(..., description="UUID of the court being reserved")
    start_time: datetime = Field(
        ...,
        description="Booking start time in UTC or with timezone offset. Must align to 30-minute boundary.",
    )
    notes: Optional[str] = Field(None, max_length=255, description="Optional booking notes or remarks")
    walk_in_name: Optional[str] = Field(
        None,
        max_length=100,
        description="Customer name if booking as a walk-in guest without a member profile",
    )
    walk_in_phone: Optional[str] = Field(
        None,
        max_length=20,
        description="Contact phone number if booking as a walk-in guest",
    )


class BookingResponse(BaseModel):
    id: UUID
    member_id: Optional[UUID] = None
    court_id: UUID
    start_time: datetime
    end_time: datetime
    calculated_fee: Decimal
    status: str
    notes: Optional[str] = None
    walk_in_name: Optional[str] = None
    walk_in_phone: Optional[str] = None
    created_at: datetime
    cancelled_at: Optional[datetime] = None

    member: Optional[MemberResponse] = None
    court: Optional[CourtResponse] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Availability Schemas
# ---------------------------------------------------------------------------
class SlotAvailability(BaseModel):
    start_time: datetime
    end_time: datetime
    is_available: bool
    booking_id: Optional[UUID] = None
    session_type: Optional[str] = None  # "standard_booking", "social_play", None


class CourtAvailabilityResponse(BaseModel):
    date: date
    court_id: UUID
    court_name: str
    sport_type: str
    hourly_rate: Decimal
    walk_in_rate: Optional[Decimal] = None
    slots: List[SlotAvailability]


# ---------------------------------------------------------------------------
# Friday Social Play Schemas
# ---------------------------------------------------------------------------
class SocialPlaySessionCreate(BaseModel):
    court_id: UUID = Field(..., description="Court allocated for the social play session")
    title: str = Field(..., min_length=2, max_length=100, description="Session title (e.g. Friday Social Tennis)")
    start_time: datetime = Field(..., description="Start time aligned to 30-minute boundary")
    end_time: datetime = Field(..., description="End time aligned to 30-minute boundary (e.g. 1-2 hours)")
    max_capacity: int = Field(8, ge=2, le=32, description="Maximum participant capacity")
    fee_per_participant: Decimal = Field(Decimal("0.00"), ge=0, description="Entry fee per participant in USD")


class SocialPlaySessionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=100)
    max_capacity: Optional[int] = Field(None, ge=2, le=32)
    fee_per_participant: Optional[Decimal] = Field(None, ge=0)
    status: Optional[str] = Field(None, description="'scheduled', 'cancelled', 'completed'")


class SocialPlayParticipantResponse(BaseModel):
    id: UUID
    session_id: UUID
    member_id: UUID
    status: str
    joined_at: datetime
    cancelled_at: Optional[datetime] = None
    member: Optional[MemberResponse] = None

    model_config = ConfigDict(from_attributes=True)


class SocialPlaySessionResponse(BaseModel):
    id: UUID
    court_id: UUID
    title: str
    start_time: datetime
    end_time: datetime
    max_capacity: int
    fee_per_participant: Decimal
    status: str
    created_at: datetime
    active_participants_count: int = 0
    court: Optional[CourtResponse] = None
    participants: Optional[List[SocialPlayParticipantResponse]] = None

    model_config = ConfigDict(from_attributes=True)
