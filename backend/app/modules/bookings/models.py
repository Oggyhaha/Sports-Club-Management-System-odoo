import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.modules.courts.models import Court
    from app.modules.members.models import Member


class Booking(Base):
    """
    Represents a court booking session.
    Strict rules:
    - 60-minute duration.
    - Start time on 30-minute intervals (:00 or :30).
    - Maximum 2 active standard bookings per member per day.
    - No overlapping active bookings for the same court.
    - Supports member bookings or front-desk walk-in bookings (member_id = None).
    """

    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    member_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("members.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    court_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    calculated_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="confirmed",  # "confirmed" or "cancelled"
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    walk_in_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    walk_in_phone: Mapped[Optional[str]] = mapped_column(
        String(20),
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
    member: Mapped[Optional["Member"]] = relationship(
        "Member",
        back_populates="bookings",
    )
    court: Mapped["Court"] = relationship(
        "Court",
        back_populates="bookings",
    )

    __table_args__ = (
        Index("ix_bookings_court_time_status", "court_id", "start_time", "end_time", "status"),
    )


class SocialPlaySession(Base):
    """
    Represents an organized group social session (e.g., Friday Social Tennis).
    Allows multiple members to join up to a configured max capacity.
    Separate from private standard court bookings.
    """

    __tablename__ = "social_play_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    court_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    max_capacity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=8,
    )
    fee_per_participant: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="scheduled",  # "scheduled", "cancelled", "completed"
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    court: Mapped["Court"] = relationship(
        "Court",
        back_populates="social_sessions",
    )
    participants: Mapped[List["SocialPlayParticipant"]] = relationship(
        "SocialPlayParticipant",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class SocialPlayParticipant(Base):
    """
    Represents a member registered for a specific social play session.
    Enforces atomic capacity checks and prevents duplicate active registration.
    """

    __tablename__ = "social_play_participants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("social_play_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("members.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="joined",  # "joined", "cancelled"
        index=True,
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    session: Mapped["SocialPlaySession"] = relationship(
        "SocialPlaySession",
        back_populates="participants",
    )
    member: Mapped["Member"] = relationship(
        "Member",
        back_populates="social_play_participations",
    )
