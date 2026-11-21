from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CourtBase(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=50,
        description="Court or facility name (e.g. Tennis Court 1, Cricket Net A)",
    )
    sport_type: str = Field(
        ...,
        min_length=2,
        max_length=30,
        description="Sport type (e.g. tennis, cricket, padel, badminton)",
    )
    hourly_rate: Decimal = Field(
        ...,
        ge=0,
        description="Standard member base hourly booking rate in USD",
    )
    walk_in_rate: Optional[Decimal] = Field(
        None,
        ge=0,
        description="Non-member walk-in hourly rate in USD (defaults to hourly_rate if omitted)",
    )
    is_active: bool = Field(
        True,
        description="Whether the court is currently open and bookable",
    )


class CourtCreate(CourtBase):
    pass


class CourtUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    sport_type: Optional[str] = Field(None, min_length=2, max_length=30)
    hourly_rate: Optional[Decimal] = Field(None, ge=0)
    walk_in_rate: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None


class CourtResponse(CourtBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
