import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.modules.bookings.models import Booking, SocialPlayParticipant
    from app.modules.auth.models import User


class MembershipPlan(Base):
    """
    Represents club membership tiers (Gold, Silver, Junior).
    Configures fees, discounts, and duration dynamically.
    """

    __tablename__ = "membership_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    monthly_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    court_discount_percent: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    shop_discount_percent: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default="0.00",
    )
    bar_discount_percent: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default="0.00",
    )
    duration_days: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    members: Mapped[List["Member"]] = relationship(
        back_populates="plan",
    )
    subscriptions: Mapped[List["MemberSubscription"]] = relationship(
        back_populates="plan",
    )


class Member(Base):
    """
    Represents registered sports club members.
    Can be linked to an authenticated User account (user_id),
    or user_id can be NULL for front-desk walk-in patrons.
    """

    __tablename__ = "members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False,
        index=True,
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("membership_plans.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        default=date.today,
    )
    expiry_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="member_profile",
    )
    plan: Mapped["MembershipPlan"] = relationship(
        back_populates="members",
    )
    bookings: Mapped[List["Booking"]] = relationship(
        back_populates="member",
        cascade="all, delete-orphan",
    )
    subscriptions: Mapped[List["MemberSubscription"]] = relationship(
        back_populates="member",
        cascade="all, delete-orphan",
        order_by="desc(MemberSubscription.created_at)",
    )
    social_play_participations: Mapped[List["SocialPlayParticipant"]] = relationship(
        back_populates="member",
        cascade="all, delete-orphan",
    )


class MemberSubscription(Base):
    """
    Authoritative historical record of membership subscription purchases,
    renewals, and plan changes. Preserves exact price and discount snapshots
    at the time of purchase.
    """

    __tablename__ = "member_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("members.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("membership_plans.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    price_paid: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    plan_name_snapshot: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    duration_days_snapshot: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    court_discount_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
    )
    shop_discount_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default="0.00",
    )
    bar_discount_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default="0.00",
    )
    subscription_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="active",
        server_default="active",
        index=True,
    )  # 'active', 'expired', 'cancelled'
    payment_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="unpaid",
        server_default="unpaid",
        index=True,
    )  # 'unpaid', 'partially_paid', 'paid'
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    member: Mapped["Member"] = relationship(
        "Member",
        back_populates="subscriptions",
    )
    plan: Mapped["MembershipPlan"] = relationship(
        "MembershipPlan",
        back_populates="subscriptions",
    )
