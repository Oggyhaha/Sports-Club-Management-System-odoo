from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Optional, Tuple
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status

CLUB_TZ = ZoneInfo("Asia/Kolkata")
OPERATING_HOURS_PER_DAY = Decimal("16.0")  # 06:00 to 22:00


def get_club_now() -> datetime:
    return datetime.now(CLUB_TZ)


def get_club_today() -> date:
    return get_club_now().date()


def quantize_money(amount: Decimal | float | int | str | None) -> Decimal:
    if amount is None:
        return Decimal("0.00")
    if not isinstance(amount, Decimal):
        amount = Decimal(str(amount))
    return amount.quantize(Decimal("0.01"))


def quantize_percent(amount: Decimal | float | int | str | None) -> Decimal:
    if amount is None:
        return Decimal("0.00")
    if not isinstance(amount, Decimal):
        amount = Decimal(str(amount))
    return amount.quantize(Decimal("0.01"))


def resolve_period_dates(
    filter_type: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> Tuple[date, date]:
    today = get_club_today()
    filter_clean = filter_type.strip().lower() if filter_type else "this_month"

    if filter_clean == "today":
        return today, today
    elif filter_clean == "this_week":
        # Monday to Sunday of the current week
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        return start, end
    elif filter_clean == "this_month":
        start = today.replace(day=1)
        # Next month day 1 minus 1 day
        next_month = start.replace(day=28) + timedelta(days=4)
        end = next_month.replace(day=1) - timedelta(days=1)
        return start, end
    elif filter_clean == "this_year":
        start = today.replace(month=1, day=1)
        end = today.replace(month=12, day=31)
        return start, end
    elif filter_clean == "custom":
        if not start_date or not end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both 'start_date' and 'end_date' are required when using filter_type='custom'.",
            )
        if end_date < start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="end_date cannot be earlier than start_date.",
            )
        return start_date, end_date
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported filter_type '{filter_type}'. Allowed: 'today', 'this_week', 'this_month', 'this_year', 'custom'.",
        )


def date_to_datetime_bounds(start_d: date, end_d: date) -> Tuple[datetime, datetime]:
    """
    Converts local calendar dates into UTC timezone-aware datetime boundaries.
    """
    start_local = datetime.combine(start_d, time.min, tzinfo=CLUB_TZ)
    end_local = datetime.combine(end_d, time.max, tzinfo=CLUB_TZ)
    return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc)


def calculate_court_utilization(
    booked_hours: Decimal,
    active_courts_count: int,
    days_in_period: int,
) -> Tuple[Decimal, Decimal, Decimal]:
    """
    Calculates: (booked_hours, total_available_hours, utilization_percent)
    Total available hours = active_courts_count * days_in_period * 16.0
    """
    days = max(1, days_in_period)
    available_hours = quantize_money(Decimal(active_courts_count) * Decimal(days) * OPERATING_HOURS_PER_DAY)
    if available_hours > Decimal("0.00"):
        utilization_pct = quantize_percent((booked_hours / available_hours) * Decimal("100.0"))
    else:
        utilization_pct = Decimal("0.00")
    return quantize_money(booked_hours), available_hours, utilization_pct
