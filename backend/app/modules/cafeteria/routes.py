from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.modules.auth.models import RoleEnum, User
from app.modules.cafeteria.schemas import (
    CafeteriaMenuItemResponse,
    CafeteriaOrderCreate,
    CafeteriaStatusUpdate,
)
from app.modules.shop import service
from app.modules.shop.schemas import OrderResponse

router = APIRouter(prefix="/cafeteria", tags=["Cafeteria & Bar Operations"])

CAFETERIA_STAFF_ROLES = [
    RoleEnum.OWNER.value,
    RoleEnum.CAFETERIA_STAFF.value,
    RoleEnum.RECEPTIONIST.value,
    RoleEnum.SHOP_STAFF.value,
]


# ---------------------------------------------------------------------------
# Public Cafeteria Menu
# ---------------------------------------------------------------------------
@router.get("/menu", response_model=List[CafeteriaMenuItemResponse])
def get_cafeteria_menu(
    category_id: Optional[UUID] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Public menu: browse active food, beverages, and snack offerings."""
    items = service.list_products(
        db,
        module_type="cafeteria",
        category_id=category_id,
        is_active=True,
        search=search,
    )
    results = []
    for p in items:
        resp = CafeteriaMenuItemResponse.model_validate(p)
        resp.is_in_stock = (p.current_stock > 0) if p.inventory_tracked else True
        results.append(resp)
    return results


@router.get("/menu/{product_id}", response_model=CafeteriaMenuItemResponse)
def get_cafeteria_menu_item(
    product_id: UUID,
    db: Session = Depends(get_db),
):
    """Public menu: retrieve cafeteria item details."""
    p = service.get_product_by_id(db, product_id)
    if not p.is_active or p.module_type != "cafeteria":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cafeteria menu item not found or inactive.",
        )
    resp = CafeteriaMenuItemResponse.model_validate(p)
    resp.is_in_stock = (p.current_stock > 0) if p.inventory_tracked else True
    return resp


# ---------------------------------------------------------------------------
# Cafeteria Orders & Kitchen Operations
# ---------------------------------------------------------------------------
@router.post(
    "/orders",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_cafeteria_order(
    order_in: CafeteriaOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(CAFETERIA_STAFF_ROLES)),
):
    """Staff: place counter or table order for cafeteria patrons (walk-ins or members)."""
    return service.create_order(
        db=db,
        items_in=order_in.items,
        order_type="cafeteria",
        current_user=current_user,
        customer_type=order_in.customer_type,
        member_id=order_in.member_id,
        walk_in_name=order_in.walk_in_name,
        walk_in_phone=order_in.walk_in_phone,
        table_number=order_in.table_number,
        kitchen_notes=order_in.kitchen_notes,
        notes=order_in.notes,
        is_online=False,
    )


@router.get(
    "/orders",
    response_model=List[OrderResponse],
    dependencies=[Depends(require_roles(CAFETERIA_STAFF_ROLES))],
)
def list_cafeteria_orders(
    order_status: Optional[str] = Query(None, pattern="^(pending|preparing|ready|served|cancelled)$"),
    db: Session = Depends(get_db),
):
    """Staff/Kitchen: list cafeteria orders, filtered by kitchen lifecycle status."""
    return service.list_orders(db, order_type="cafeteria", order_status=order_status)


@router.get(
    "/orders/{order_id}",
    response_model=OrderResponse,
    dependencies=[Depends(require_roles(CAFETERIA_STAFF_ROLES))],
)
def get_cafeteria_order(
    order_id: UUID,
    db: Session = Depends(get_db),
):
    """Staff/Kitchen: retrieve detailed cafeteria order information."""
    order = service.get_order_by_id(db, order_id)
    if order.order_type != "cafeteria":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cafeteria order not found.",
        )
    return order


@router.patch(
    "/orders/{order_id}/status",
    response_model=OrderResponse,
)
def update_order_status(
    order_id: UUID,
    status_in: CafeteriaStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(CAFETERIA_STAFF_ROLES)),
):
    """
    Staff/Kitchen: update cafeteria order lifecycle status.
    State machine: pending -> preparing -> ready -> served (or cancelled).
    """
    return service.update_cafeteria_status(
        db=db,
        order_id=order_id,
        new_status=status_in.new_status,
        current_user=current_user,
        notes=status_in.notes,
    )


@router.post(
    "/orders/{order_id}/cancel",
    response_model=OrderResponse,
)
def cancel_cafeteria_order(
    order_id: UUID,
    notes: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(CAFETERIA_STAFF_ROLES)),
):
    """Staff: cancel cafeteria order, restoring any inventory-tracked items."""
    order = service.get_order_by_id(db, order_id)
    if order.order_type != "cafeteria":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cafeteria order not found.",
        )
    return service.cancel_order(
        db=db,
        order_id=order_id,
        current_user=current_user,
        reason=notes or "Cafeteria order cancelled by staff",
    )
