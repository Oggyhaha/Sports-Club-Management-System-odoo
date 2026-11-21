from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.courts.schemas import CourtResponse
from app.modules.members.schemas import MemberResponse


class BookingCreate(BaseModel):
    member_id: UUID = Field(..., description="UUID of the member making the booking")
    court_id: UUID = Field(..., description="UUID of the court being reserved")
    start_time: datetime = Field(
        ...,
        description="Booking start time in UTC or with timezone offset. Must align to 30-minute boundary.",
    )
    notes: Optional[str] = Field(None, max_length=255, description="Optional booking notes or remarks")


class BookingResponse(BaseModel):
    id: UUID
    member_id: UUID
    court_id: UUID
    start_time: datetime
    end_time: datetime
    calculated_fee: Decimal
    status: str
    notes: Optional[str] = None
    created_at: datetime

    member: Optional[MemberResponse] = None
    court: Optional[CourtResponse] = None

    model_config = ConfigDict(from_attributes=True)
