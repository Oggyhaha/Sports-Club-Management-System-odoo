import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.modules.bookings.models import Booking


class Court(Base):
    """
    Represents sports courts (Tennis courts, Cricket nets, etc.).
    Maintains sport type, standard member rate, non-member walk-in rate, and status.
    """

    __tablename__ = "courts"

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
    sport_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,  # e.g., 'tennis', 'cricket', 'padel', 'badminton'
    )
    hourly_rate: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("40.00"),
    )
    walk_in_rate: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
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

    # Relationship to bookings made on this court
    bookings: Mapped[List["Booking"]] = relationship(
        back_populates="court",
        cascade="all, delete-orphan",
    )
