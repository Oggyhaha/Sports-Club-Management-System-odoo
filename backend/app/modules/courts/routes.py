from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.courts import service
from app.modules.courts.schemas import CourtCreate, CourtResponse, CourtUpdate

router = APIRouter(prefix="/courts", tags=["Courts"])


@router.get(
    "",
    response_model=List[CourtResponse],
    summary="List all courts",
    description="Retrieve all sports courts with optional filtering by sport type (tennis, cricket) and active status.",
)
def get_courts(
    sport_type: Optional[str] = Query(None, description="Filter by sport type (e.g. tennis, cricket)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
):
    return service.list_courts(db, sport_type=sport_type, is_active=is_active)


@router.post(
    "",
    response_model=CourtResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new court",
    description="Register a new sports facility with name, sport type, and hourly rate.",
)
def create_new_court(
    court_in: CourtCreate,
    db: Session = Depends(get_db),
):
    return service.create_court(db, court_in)


@router.get(
    "/{court_id}",
    response_model=CourtResponse,
    summary="Get court by ID",
    description="Retrieve detailed court information by UUID.",
)
def get_court(
    court_id: UUID,
    db: Session = Depends(get_db),
):
    return service.get_court_by_id(db, court_id)


@router.put(
    "/{court_id}",
    response_model=CourtResponse,
    summary="Update court details",
    description="Update a court's name, sport type, hourly rate, or active status.",
)
def update_court_details(
    court_id: UUID,
    court_in: CourtUpdate,
    db: Session = Depends(get_db),
):
    return service.update_court(db, court_id, court_in)
