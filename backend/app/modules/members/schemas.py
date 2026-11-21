from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------
# Membership Plan Schemas
# ---------------------------------------------------------
class MembershipPlanBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, description="Plan tier name (e.g. Gold, Silver, Junior)")
    monthly_fee: Decimal = Field(..., ge=0, description="Monthly fee in USD")
    court_discount_percent: Decimal = Field(..., ge=0, le=100, description="Court booking discount percentage")
    description: Optional[str] = Field(None, description="Detailed plan benefits description")


class MembershipPlanResponse(MembershipPlanBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Member Schemas
# ---------------------------------------------------------
class MemberBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Member's full name")
    email: str = Field(
        ...,
        pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$",
        description="Unique contact email address (e.g. member@example.com)",
    )
    phone: Optional[str] = Field(None, max_length=20, description="Contact phone number")
    plan_id: UUID = Field(..., description="UUID of the selected membership plan")


class MemberCreate(MemberBase):
    start_date: Optional[date] = Field(None, description="Membership start date; defaults to today if omitted")
    expiry_date: Optional[date] = Field(None, description="Membership expiry date; defaults to 1 year from start date if omitted")


class MemberUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[str] = Field(None, pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    phone: Optional[str] = Field(None, max_length=20)
    plan_id: Optional[UUID] = None
    expiry_date: Optional[date] = None
    is_active: Optional[bool] = None


class MemberResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: Optional[str] = None
    plan_id: UUID
    start_date: date
    expiry_date: date
    is_active: bool
    created_at: datetime
    plan: Optional[MembershipPlanResponse] = None

    model_config = ConfigDict(from_attributes=True)
