from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.courts.models import Court
from app.modules.courts.schemas import CourtCreate, CourtUpdate


def list_courts(
    db: Session,
    sport_type: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> List[Court]:
    """
    Retrieve all sports courts with optional filtering by sport_type and active status.
    Ordered by court name ascending.
    """
    stmt = select(Court).order_by(Court.name.asc())

    if sport_type:
        stmt = stmt.where(Court.sport_type == sport_type.strip().lower())

    if is_active is not None:
        stmt = stmt.where(Court.is_active == is_active)

    return list(db.scalars(stmt).all())


def get_court_by_id(db: Session, court_id: UUID) -> Court:
    """
    Retrieve a court by its UUID.
    Raises HTTP 404 if not found.
    """
    stmt = select(Court).where(Court.id == court_id)
    court = db.scalars(stmt).first()
    if not court:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Court with ID '{court_id}' not found.",
        )
    return court


def create_court(db: Session, court_in: CourtCreate) -> Court:
    """
    Register a new court/facility.
    Validations:
    - Unique name check (prevents duplicate names, returns 409 Conflict).
    - Standardizes sport_type to lowercase.
    """
    court_name = court_in.name.strip()
    existing_stmt = select(Court).where(Court.name == court_name)
    existing_court = db.scalars(existing_stmt).first()

    if existing_court:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A court with the name '{court_name}' already exists.",
        )

    new_court = Court(
        name=court_name,
        sport_type=court_in.sport_type.strip().lower(),
        hourly_rate=court_in.hourly_rate,
        is_active=court_in.is_active,
    )

    db.add(new_court)
    db.commit()
    db.refresh(new_court)
    return new_court


def update_court(db: Session, court_id: UUID, court_in: CourtUpdate) -> Court:
    """
    Update court attributes (name, sport_type, hourly_rate, is_active).
    """
    court = get_court_by_id(db, court_id)
    update_data = court_in.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"]:
        new_name = update_data["name"].strip()
        if new_name != court.name:
            existing_stmt = select(Court).where(Court.name == new_name)
            if db.scalars(existing_stmt).first():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A court with the name '{new_name}' already exists.",
                )
            court.name = new_name

    if "sport_type" in update_data and update_data["sport_type"]:
        court.sport_type = update_data["sport_type"].strip().lower()

    if "hourly_rate" in update_data and update_data["hourly_rate"] is not None:
        court.hourly_rate = update_data["hourly_rate"]

    if "is_active" in update_data and update_data["is_active"] is not None:
        court.is_active = update_data["is_active"]

    db.commit()
    db.refresh(court)
    return court
