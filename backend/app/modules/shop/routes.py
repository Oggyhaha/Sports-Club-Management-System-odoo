from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.modules.auth.models import RoleEnum, User
from app.modules.shop import service
from app.modules.shop.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    InventoryAdjustRequest,
    InventoryMovementResponse,
    InventoryRestockRequest,
    OrderCancelRequest,
    OrderCreate,
    OrderResponse,
    ProductAdminResponse,
    ProductCreate,
    ProductInventoryResponse,
    ProductPublicResponse,
    ProductUpdate,
)

router = APIRouter(prefix="/shop", tags=["Pro-Shop & Shared Inventory"])


# ---------------------------------------------------------------------------
# Category Endpoints
# ---------------------------------------------------------------------------
@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(
    module_type: Optional[str] = Query("shop", pattern="^(shop|cafeteria)$"),
    db: Session = Depends(get_db),
):
    """Public catalog: list product categories."""
    return service.list_categories(db, module_type=module_type, is_active=True)


@router.post(
    "/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles([RoleEnum.OWNER.value, RoleEnum.SHOP_STAFF.value]))],
)
def create_category(
    cat_in: CategoryCreate,
    db: Session = Depends(get_db),
):
    """Staff/Owner: create product category."""
    return service.create_category(db, cat_in)


@router.put(
    "/categories/{category_id}",
    response_model=CategoryResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER.value, RoleEnum.SHOP_STAFF.value]))],
)
def update_category(
    category_id: UUID,
    cat_in: CategoryUpdate,
    db: Session = Depends(get_db),
):
    """Staff/Owner: update product category."""
    return service.update_category(db, category_id, cat_in)


# ---------------------------------------------------------------------------
# Product Endpoints
# ---------------------------------------------------------------------------
@router.get("/products", response_model=List[ProductPublicResponse])
def list_products(
    category_id: Optional[UUID] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Public catalog: browse active shop products."""
    prods = service.list_products(
        db,
        module_type="shop",
        category_id=category_id,
        is_active=True,
        search=search,
    )
    # Map to public schema with is_in_stock
    results = []
    for p in prods:
        resp = ProductPublicResponse.model_validate(p)
        resp.is_in_stock = (p.current_stock > 0) if p.inventory_tracked else True
        results.append(resp)
    return results


@router.get("/products/{product_id}", response_model=ProductPublicResponse)
def get_product(
    product_id: UUID,
    db: Session = Depends(get_db),
):
    """Public catalog: get product details."""
    p = service.get_product_by_id(db, product_id)
    if not p.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or inactive.",
        )
    resp = ProductPublicResponse.model_validate(p)
    resp.is_in_stock = (p.current_stock > 0) if p.inventory_tracked else True
    return resp


@router.post(
    "/products",
    response_model=ProductAdminResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    prod_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleEnum.OWNER.value, RoleEnum.SHOP_STAFF.value])),
):
    """Staff/Owner: add a new product to shop or cafeteria."""
    p = service.create_product(db, prod_in, user_id=current_user.id)
    resp = ProductAdminResponse.model_validate(p)
    resp.is_in_stock = (p.current_stock > 0) if p.inventory_tracked else True
    return resp


@router.put(
    "/products/{product_id}",
    response_model=ProductAdminResponse,
)
def update_product(
    product_id: UUID,
    prod_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleEnum.OWNER.value, RoleEnum.SHOP_STAFF.value])),
):
    """
    Staff/Owner: modify product details.
    Restricts price and tax modifications strictly to Owner.
    """
    user_roles = [r.name for r in current_user.roles]
    if (prod_in.unit_price is not None or prod_in.tax_rate is not None) and RoleEnum.OWNER.value not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only club owners are permitted to modify product pricing or tax rates.",
        )
    p = service.update_product(db, product_id, prod_in)
    resp = ProductAdminResponse.model_validate(p)
    resp.is_in_stock = (p.current_stock > 0) if p.inventory_tracked else True
    return resp


# ---------------------------------------------------------------------------
# Shared Inventory Endpoints
# ---------------------------------------------------------------------------
@router.get(
    "/inventory",
    response_model=List[ProductInventoryResponse],
    dependencies=[Depends(require_roles([RoleEnum.OWNER.value, RoleEnum.SHOP_STAFF.value]))],
)
def get_inventory_status(
    module_type: Optional[str] = Query(None, pattern="^(shop|cafeteria)$"),
    db: Session = Depends(get_db),
):
    """Staff/Owner: inspect authoritative stock levels for all products."""
    products = service.list_products(db, module_type=module_type, is_active=None)
    items = []
    for p in products:
        items.append(
            ProductInventoryResponse(
                product_id=p.id,
                product_name=p.name,
                sku=p.sku,
                module_type=p.module_type,
                current_stock=p.current_stock,
                reorder_threshold=p.reorder_threshold,
                inventory_tracked=p.inventory_tracked,
                is_low_stock=(p.current_stock <= p.reorder_threshold) if p.inventory_tracked else False,
            )
        )
    return items


@router.get(
    "/inventory/{product_id}/movements",
    response_model=List[InventoryMovementResponse],
    dependencies=[Depends(require_roles([RoleEnum.OWNER.value, RoleEnum.SHOP_STAFF.value]))],
)
def get_inventory_movements(
    product_id: UUID,
    db: Session = Depends(get_db),
):
    """Staff/Owner: view movement audit ledger for a specific product."""
    return service.list_inventory_movements(db, product_id)


@router.post(
    "/inventory/adjust",
    response_model=InventoryMovementResponse,
)
def adjust_inventory(
    adjust_in: InventoryAdjustRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleEnum.OWNER.value, RoleEnum.SHOP_STAFF.value])),
):
    """Staff/Owner: manually adjust stock count (audited movement)."""
    return service.adjust_inventory(db, adjust_in, performed_by_id=current_user.id)


@router.post(
    "/inventory/restock",
    response_model=InventoryMovementResponse,
)
def restock_inventory(
    restock_in: InventoryRestockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([RoleEnum.OWNER.value, RoleEnum.SHOP_STAFF.value])),
):
    """Staff/Owner: restock product quantity from supplier receipt."""
    return service.restock_inventory(db, restock_in, performed_by_id=current_user.id)


# ---------------------------------------------------------------------------
# Order Endpoints (POS & Online Member)
# ---------------------------------------------------------------------------
@router.post(
    "/orders",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_shop_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Unified Shop Order Creation:
    - Members place online orders for their own account (resolving linked Member profile).
    - Shop Staff and Owner place POS counter sales for walk-ins or members.
    """
    user_roles = [r.name for r in current_user.roles]

    # Member online order flow
    if RoleEnum.MEMBER.value in user_roles and not (
        RoleEnum.OWNER.value in user_roles or RoleEnum.SHOP_STAFF.value in user_roles
    ):
        if not current_user.member_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account does not have an associated member profile.",
            )
        member_id = current_user.member_profile.id

        return service.create_order(
            db=db,
            items_in=order_in.items,
            order_type="shop",
            current_user=current_user,
            customer_type="member",
            member_id=member_id,
            notes=order_in.notes,
            is_online=True,
        )

    # Staff / Owner POS order flow
    if RoleEnum.OWNER.value in user_roles or RoleEnum.SHOP_STAFF.value in user_roles:
        return service.create_order(
            db=db,
            items_in=order_in.items,
            order_type="shop",
            current_user=current_user,
            customer_type=order_in.customer_type,
            member_id=order_in.member_id,
            walk_in_name=order_in.walk_in_name,
            walk_in_phone=order_in.walk_in_phone,
            notes=order_in.notes,
            is_online=False,
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unauthorized to place shop orders.",
    )


@router.get("/orders", response_model=List[OrderResponse])
def list_shop_orders(
    order_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List shop orders:
    - Members view only their own orders.
    - Staff / Owner view all shop orders.
    """
    user_roles = [r.name for r in current_user.roles]

    if RoleEnum.OWNER.value in user_roles or RoleEnum.SHOP_STAFF.value in user_roles:
        return service.list_orders(db, order_type="shop", order_status=order_status)

    if RoleEnum.MEMBER.value in user_roles and current_user.member_profile:
        return service.list_orders(
            db,
            order_type="shop",
            member_id=current_user.member_profile.id,
            order_status=order_status,
        )

    return []


@router.get("/orders/{order_id}", response_model=OrderResponse)
def get_shop_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve order details with strict object-level ownership check."""
    order = service.get_order_by_id(db, order_id)
    user_roles = [r.name for r in current_user.roles]

    if RoleEnum.OWNER.value in user_roles or RoleEnum.SHOP_STAFF.value in user_roles:
        return order

    if (
        RoleEnum.MEMBER.value in user_roles
        and current_user.member_profile
        and order.member_id == current_user.member_profile.id
    ):
        return order

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to access this order.",
    )


@router.post("/orders/{order_id}/cancel", response_model=OrderResponse)
def cancel_shop_order(
    order_id: UUID,
    cancel_in: Optional[OrderCancelRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cancel shop order and restore stock:
    - Member can cancel their own pending order.
    - Staff/Owner can cancel any active shop order.
    """
    order = service.get_order_by_id(db, order_id)
    user_roles = [r.name for r in current_user.roles]

    reason = cancel_in.reason if cancel_in else "Cancelled by user"

    if RoleEnum.OWNER.value in user_roles or RoleEnum.SHOP_STAFF.value in user_roles:
        return service.cancel_order(db, order_id, current_user, reason=reason)

    if (
        RoleEnum.MEMBER.value in user_roles
        and current_user.member_profile
        and order.member_id == current_user.member_profile.id
    ):
        if order.order_status != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Members can only cancel orders in 'pending' status.",
            )
        return service.cancel_order(db, order_id, current_user, reason=reason)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to cancel this order.",
    )
