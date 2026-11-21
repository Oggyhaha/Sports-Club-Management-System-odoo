import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.courts.models import Court
from app.modules.members.models import Member


class Booking(Base):
    """
    Represents a court booking session.
    Strict rules:
    - 60-minute duration.
    - Start time on 30-minute intervals.
    - Maximum 2 active bookings per member per day.
    - No overlapping active bookings for the same court.
    """

    __tablename__ = "bookings"

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
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    member: Mapped["Member"] = relationship(
        back_populates="bookings",
    )
    court: Mapped["Court"] = relationship(
        back_populates="bookings",
    )

    __table_args__ = (
        Index("ix_bookings_court_time_status", "court_id", "start_time", "end_time", "status"),
    )
