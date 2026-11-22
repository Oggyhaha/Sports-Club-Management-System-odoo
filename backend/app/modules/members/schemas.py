from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------
# Membership Plan Schemas
# ---------------------------------------------------------
class MembershipPlanBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, description="Plan tier name (e.g. Gold, Silver, Junior)")
    monthly_fee: Decimal = Field(..., ge=0, description="Plan price/monthly fee in USD")
    court_discount_percent: Decimal = Field(..., ge=0, le=100, description="Court booking discount percentage (0-100)")
    shop_discount_percent: Decimal = Field(Decimal("0.00"), ge=0, le=100, description="Pro shop discount percentage (0-100)")
    bar_discount_percent: Decimal = Field(Decimal("0.00"), ge=0, le=100, description="Cafeteria/bar discount percentage (0-100)")
    duration_days: Optional[int] = Field(None, gt=0, description="Configured duration in days (e.g. 30, 365). Required for subscription purchase.")
    description: Optional[str] = Field(None, description="Detailed plan benefits description")
    is_active: bool = Field(True, description="Whether this plan tier is currently active and purchasable")


class MembershipPlanCreate(MembershipPlanBase):
    pass


class MembershipPlanUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    monthly_fee: Optional[Decimal] = Field(None, ge=0)
    court_discount_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    shop_discount_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    bar_discount_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    duration_days: Optional[int] = Field(None, gt=0)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class MembershipPlanResponse(MembershipPlanBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# Member Subscription Schemas
# ---------------------------------------------------------
ALLOWED_PAYMENT_STATUSES = {"unpaid", "partially_paid", "paid"}
ALLOWED_SUBSCRIPTION_STATUSES = {"active", "expired", "cancelled"}


class MemberSubscriptionResponse(BaseModel):
    id: UUID
    member_id: UUID
    plan_id: UUID
    start_date: date
    end_date: date
    price_paid: Decimal
    plan_name_snapshot: str
    duration_days_snapshot: int
    court_discount_snapshot: Decimal
    shop_discount_snapshot: Decimal
    bar_discount_snapshot: Decimal
    subscription_status: str
    payment_status: str
    notes: Optional[str] = None
    created_at: datetime
    cancelled_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SubscriptionCreateRequest(BaseModel):
    plan_id: UUID = Field(..., description="UUID of the membership plan to purchase")
    start_date: Optional[date] = Field(None, description="Subscription start date; defaults to today if omitted")
    price_paid: Optional[Decimal] = Field(None, ge=0, description="Price paid; defaults to plan fee if omitted")
    payment_status: Optional[str] = Field("unpaid", description="Payment status: unpaid, partially_paid, paid")
    notes: Optional[str] = Field(None, max_length=500, description="Optional subscription notes")

    @field_validator("payment_status")
    @classmethod
    def validate_payment_status(cls, v: Optional[str]) -> str:
        if v is None:
            return "unpaid"
        normalized = v.strip().lower()
        if normalized not in ALLOWED_PAYMENT_STATUSES:
            raise ValueError(f"Invalid payment_status '{v}'. Allowed values: {', '.join(sorted(ALLOWED_PAYMENT_STATUSES))}")
        return normalized


class SubscriptionRenewRequest(BaseModel):
    payment_status: Optional[str] = Field("unpaid", description="Payment status: unpaid, partially_paid, paid")
    notes: Optional[str] = Field(None, max_length=500, description="Optional renewal notes")

    @field_validator("payment_status")
    @classmethod
    def validate_payment_status(cls, v: Optional[str]) -> str:
        if v is None:
            return "unpaid"
        normalized = v.strip().lower()
        if normalized not in ALLOWED_PAYMENT_STATUSES:
            raise ValueError(f"Invalid payment_status '{v}'. Allowed values: {', '.join(sorted(ALLOWED_PAYMENT_STATUSES))}")
        return normalized


class SubscriptionChangePlanRequest(BaseModel):
    new_plan_id: UUID = Field(..., description="UUID of the new membership plan")
    payment_status: Optional[str] = Field("unpaid", description="Payment status: unpaid, partially_paid, paid")
    notes: Optional[str] = Field(None, max_length=500, description="Optional plan change notes")

    @field_validator("payment_status")
    @classmethod
    def validate_payment_status(cls, v: Optional[str]) -> str:
        if v is None:
            return "unpaid"
        normalized = v.strip().lower()
        if normalized not in ALLOWED_PAYMENT_STATUSES:
            raise ValueError(f"Invalid payment_status '{v}'. Allowed values: {', '.join(sorted(ALLOWED_PAYMENT_STATUSES))}")
        return normalized


class OnlineSubscriptionPurchaseRequest(BaseModel):
    plan_id: UUID = Field(..., description="UUID of the membership plan to purchase")
    payment_method: str = Field("mock_card", description="Payment method: mock_card, mock_upi, mock_netbanking")
    payment_reference: Optional[str] = Field(None, description="Mock transaction ID / reference")


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
    user_id: Optional[UUID] = Field(None, description="Optional linked authenticated user account UUID")


class MemberUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[str] = Field(None, pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    phone: Optional[str] = Field(None, max_length=20)
    plan_id: Optional[UUID] = None
    expiry_date: Optional[date] = None
    is_active: Optional[bool] = None


class MemberResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
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
