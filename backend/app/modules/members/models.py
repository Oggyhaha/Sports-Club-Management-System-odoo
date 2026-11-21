import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.modules.bookings.models import Booking


class MembershipPlan(Base):
    """
    Represents club membership tiers (Gold, Silver, Junior).
    Configures monthly fees and court booking discount percentages.
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
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationship to members enrolled in this plan
    members: Mapped[List["Member"]] = relationship(
        back_populates="plan",
    )


class Member(Base):
    """
    Represents registered sports club members.
    Tied to a membership plan with start and expiry dates.
    """

    __tablename__ = "members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
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
    plan: Mapped["MembershipPlan"] = relationship(
        back_populates="members",
    )
    bookings: Mapped[List["Booking"]] = relationship(
        back_populates="member",
        cascade="all, delete-orphan",
    )
