import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.modules.auth.models import User
from app.modules.members.models import Member, MemberSubscription
from app.modules.shop.models import (
    InventoryMovement,
    Order,
    OrderItem,
    OrderStatusHistory,
    Product,
    ProductCategory,
)
from app.modules.shop.schemas import (
    CategoryCreate,
    CategoryUpdate,
    InventoryAdjustRequest,
    InventoryRestockRequest,
    OrderCancelRequest,
    OrderCreateOnline,
    OrderCreatePOS,
    ProductCreate,
    ProductUpdate,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Category Services
# ---------------------------------------------------------------------------
def create_category(db: Session, cat_in: CategoryCreate) -> ProductCategory:
    existing = db.scalars(
        select(ProductCategory).where(func.lower(ProductCategory.name) == cat_in.name.strip().lower())
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category '{cat_in.name}' already exists.",
        )

    cat = ProductCategory(
        name=cat_in.name.strip(),
        module_type=cat_in.module_type,
        description=cat_in.description.strip() if cat_in.description else None,
        is_active=True,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def update_category(db: Session, cat_id: UUID, cat_in: CategoryUpdate) -> ProductCategory:
    cat = db.get(ProductCategory, cat_id)
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID '{cat_id}' not found.",
        )

    if cat_in.name is not None:
        name_clean = cat_in.name.strip()
        existing = db.scalars(
            select(ProductCategory).where(
                func.lower(ProductCategory.name) == name_clean.lower(),
                ProductCategory.id != cat_id,
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Category name '{name_clean}' already taken.",
            )
        cat.name = name_clean

    if cat_in.description is not None:
        cat.description = cat_in.description.strip() if cat_in.description else None
    if cat_in.is_active is not None:
        cat.is_active = cat_in.is_active

    db.commit()
    db.refresh(cat)
    return cat


def get_category_by_id(db: Session, cat_id: UUID) -> ProductCategory:
    cat = db.get(ProductCategory, cat_id)
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID '{cat_id}' not found.",
        )
    return cat


def list_categories(
    db: Session,
    module_type: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> List[ProductCategory]:
    stmt = select(ProductCategory).order_by(ProductCategory.name.asc())
    if module_type:
        stmt = stmt.where(ProductCategory.module_type == module_type)
    if is_active is not None:
        stmt = stmt.where(ProductCategory.is_active == is_active)
    return list(db.scalars(stmt).all())


# ---------------------------------------------------------------------------
# Product Services
# ---------------------------------------------------------------------------
def create_product(db: Session, prod_in: ProductCreate, user_id: UUID) -> Product:
    cat = db.get(ProductCategory, prod_in.category_id)
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID '{prod_in.category_id}' not found.",
        )
    if cat.module_type != prod_in.module_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category module type '{cat.module_type}' does not match product module type '{prod_in.module_type}'.",
        )

    sku_clean = prod_in.sku.strip() if prod_in.sku else None
    if sku_clean:
        existing_sku = db.scalars(
            select(Product).where(Product.sku == sku_clean)
        ).first()
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product with SKU '{sku_clean}' already exists.",
            )

    product = Product(
        name=prod_in.name.strip(),
        description=prod_in.description.strip() if prod_in.description else None,
        sku=sku_clean,
        category_id=prod_in.category_id,
        module_type=prod_in.module_type,
        unit_price=prod_in.unit_price,
        tax_rate=prod_in.tax_rate,
        discount_eligible=prod_in.discount_eligible,
        is_active=True,
        inventory_tracked=prod_in.inventory_tracked,
        current_stock=prod_in.initial_stock if prod_in.inventory_tracked else 0,
        reorder_threshold=prod_in.reorder_threshold,
    )
    db.add(product)
    db.flush()

    if prod_in.inventory_tracked and prod_in.initial_stock > 0:
        movement = InventoryMovement(
            product_id=product.id,
            movement_type="initial_stock",
            quantity_change=prod_in.initial_stock,
            resulting_stock=prod_in.initial_stock,
            performed_by_id=user_id,
            reason="Initial stock on product creation",
        )
        db.add(movement)

    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, prod_id: UUID, prod_in: ProductUpdate) -> Product:
    product = db.get(Product, prod_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{prod_id}' not found.",
        )

    if prod_in.category_id is not None:
        cat = db.get(ProductCategory, prod_in.category_id)
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category with ID '{prod_in.category_id}' not found.",
            )
        if cat.module_type != product.module_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category module type '{cat.module_type}' does not match product module type '{product.module_type}'.",
            )
        product.category_id = prod_in.category_id

    if prod_in.sku is not None:
        sku_clean = prod_in.sku.strip() if prod_in.sku else None
        if sku_clean:
            existing_sku = db.scalars(
                select(Product).where(Product.sku == sku_clean, Product.id != prod_id)
            ).first()
            if existing_sku:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Product with SKU '{sku_clean}' already exists.",
                )
        product.sku = sku_clean

    if prod_in.name is not None:
        product.name = prod_in.name.strip()
    if prod_in.description is not None:
        product.description = prod_in.description.strip() if prod_in.description else None
    if prod_in.unit_price is not None:
        product.unit_price = prod_in.unit_price
    if prod_in.tax_rate is not None:
        product.tax_rate = prod_in.tax_rate
    if prod_in.discount_eligible is not None:
        product.discount_eligible = prod_in.discount_eligible
    if prod_in.is_active is not None:
        product.is_active = prod_in.is_active
    if prod_in.inventory_tracked is not None:
        product.inventory_tracked = prod_in.inventory_tracked
    if prod_in.reorder_threshold is not None:
        product.reorder_threshold = prod_in.reorder_threshold

    db.commit()
    db.refresh(product)
    return product


def get_product_by_id(db: Session, prod_id: UUID) -> Product:
    stmt = (
        select(Product)
        .options(joinedload(Product.category))
        .where(Product.id == prod_id)
    )
    product = db.scalars(stmt).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{prod_id}' not found.",
        )
    return product


def list_products(
    db: Session,
    module_type: Optional[str] = None,
    category_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
) -> List[Product]:
    stmt = (
        select(Product)
        .options(joinedload(Product.category))
        .order_by(Product.name.asc())
    )
    if module_type:
        stmt = stmt.where(Product.module_type == module_type)
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if is_active is not None:
        stmt = stmt.where(Product.is_active == is_active)
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(search_pattern),
                Product.sku.ilike(search_pattern),
            )
        )
    return list(db.scalars(stmt).all())


# ---------------------------------------------------------------------------
# Shared Inventory Services
# ---------------------------------------------------------------------------
def adjust_inventory(db: Session, adjust_in: InventoryAdjustRequest, performed_by_id: UUID) -> InventoryMovement:
    stmt = (
        select(Product)
        .where(Product.id == adjust_in.product_id)
        .with_for_update()
    )
    product = db.scalars(stmt).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{adjust_in.product_id}' not found.",
        )
    if not product.inventory_tracked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product '{product.name}' is not configured for inventory tracking.",
        )

    qty_change = adjust_in.new_stock - product.current_stock
    movement_type = "adjustment" if qty_change >= 0 else "shrinkage"
    product.current_stock = adjust_in.new_stock

    movement = InventoryMovement(
        product_id=product.id,
        movement_type=movement_type,
        quantity_change=qty_change,
        resulting_stock=adjust_in.new_stock,
        performed_by_id=performed_by_id,
        reason=adjust_in.reason.strip(),
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


def restock_inventory(db: Session, restock_in: InventoryRestockRequest, performed_by_id: UUID) -> InventoryMovement:
    stmt = (
        select(Product)
        .where(Product.id == restock_in.product_id)
        .with_for_update()
    )
    product = db.scalars(stmt).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{restock_in.product_id}' not found.",
        )
    if not product.inventory_tracked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product '{product.name}' is not configured for inventory tracking.",
        )

    new_stock = product.current_stock + restock_in.quantity
    product.current_stock = new_stock

    movement = InventoryMovement(
        product_id=product.id,
        movement_type="restock",
        quantity_change=restock_in.quantity,
        resulting_stock=new_stock,
        performed_by_id=performed_by_id,
        reason=restock_in.reason.strip() if restock_in.reason else "Supplier Restock",
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


def list_inventory_movements(db: Session, product_id: UUID) -> List[InventoryMovement]:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found.",
        )
    stmt = (
        select(InventoryMovement)
        .where(InventoryMovement.product_id == product_id)
        .order_by(InventoryMovement.created_at.desc())
    )
    return list(db.scalars(stmt).all())


# ---------------------------------------------------------------------------
# Order Engine & POS Services
# ---------------------------------------------------------------------------
def _resolve_member_discount(
    db: Session,
    member: Member,
    order_type: str,
) -> Decimal:
    """
    Authoritative membership discount calculation based on MemberSubscription status.
    Uses shop_discount for shop orders and bar_discount for cafeteria orders.
    """
    today = date.today()
    active_sub_stmt = (
        select(MemberSubscription)
        .where(
            MemberSubscription.member_id == member.id,
            MemberSubscription.subscription_status == "active",
            MemberSubscription.start_date <= today,
            MemberSubscription.end_date >= today,
        )
        .order_by(MemberSubscription.end_date.desc())
    )
    active_sub = db.scalars(active_sub_stmt).first()

    if active_sub:
        if order_type == "shop":
            return active_sub.shop_discount_snapshot
        else:
            return active_sub.bar_discount_snapshot

    # Check if member has subscription history
    any_sub_stmt = select(func.count(MemberSubscription.id)).where(
        MemberSubscription.member_id == member.id
    )
    sub_count = db.scalar(any_sub_stmt) or 0
    if sub_count > 0:
        # Has subscription history, but not active today -> 0% discount
        return Decimal("0.00")

    # Legacy member fallback
    if member.is_active and member.start_date <= today <= member.expiry_date and member.plan:
        if order_type == "shop":
            return member.plan.shop_discount_percent
        else:
            return member.plan.bar_discount_percent

    return Decimal("0.00")


def create_order(
    db: Session,
    items_in: List,
    order_type: str,  # 'shop' or 'cafeteria'
    current_user: User,
    customer_type: str = "walk_in",  # 'walk_in' or 'member'
    member_id: Optional[UUID] = None,
    walk_in_name: Optional[str] = None,
    walk_in_phone: Optional[str] = None,
    table_number: Optional[str] = None,
    kitchen_notes: Optional[str] = None,
    notes: Optional[str] = None,
    is_online: bool = False,
) -> Order:
    """
    Core Order Placement Engine.
    Enforces:
    1. Member validation & active subscription discount lookup.
    2. Deterministic lock ordering (by product UUID) to eliminate deadlocks.
    3. Active product validation & module type compatibility check.
    4. Authoritative stock decrement & atomic InventoryMovement audit records.
    5. Immutable line-item financial snapshots (unit_price, discount, tax, subtotal, total).
    6. Initial OrderStatusHistory record.
    """
    if not items_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one item.",
        )

    # Resolve customer & membership discount
    discount_pct = Decimal("0.00")
    if customer_type == "member" and member_id:
        member = db.get(Member, member_id)
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Member with ID '{member_id}' not found.",
            )
        if not member.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Member account '{member.full_name}' is inactive.",
            )
        discount_pct = _resolve_member_discount(db, member, order_type)

    # Deadlock prevention: sort item requests deterministically by product_id
    sorted_items = sorted(items_in, key=lambda x: str(x.product_id))

    # Fetch and lock all target products in sorted order
    locked_products = {}
    for item in sorted_items:
        prod_id = item.product_id
        if prod_id not in locked_products:
            stmt = select(Product).where(Product.id == prod_id).with_for_update()
            prod = db.scalars(stmt).first()
            if not prod:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID '{prod_id}' not found.",
                )
            if not prod.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product '{prod.name}' is inactive and cannot be ordered.",
                )
            if prod.module_type != order_type:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product '{prod.name}' belongs to '{prod.module_type}' and cannot be ordered in a '{order_type}' order.",
                )
            locked_products[prod_id] = prod

    # Check sufficient stock for all inventory-tracked products
    # Sum required quantities per product (in case same product appears multiple times in input)
    qty_by_prod = {}
    for item in items_in:
        qty_by_prod[item.product_id] = qty_by_prod.get(item.product_id, 0) + item.quantity

    for prod_id, req_qty in qty_by_prod.items():
        prod = locked_products[prod_id]
        if prod.inventory_tracked and prod.current_stock < req_qty:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Insufficient stock for product '{prod.name}'. Available: {prod.current_stock}, Requested: {req_qty}.",
            )

    # Generate unique order number
    prefix = "ORD" if order_type == "shop" else "CAF"
    date_str = date.today().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    order_number = f"{prefix}-{date_str}-{unique_suffix}"

    # Initial order status:
    # Shop POS sales are confirmed/completed at counter; Online member orders are pending; Cafeteria starts as pending.
    if order_type == "shop":
        order_status_val = "pending" if is_online else "completed"
    else:
        order_status_val = "pending"

    new_order = Order(
        order_number=order_number,
        order_type=order_type,
        customer_type=customer_type,
        member_id=member_id if customer_type == "member" else None,
        walk_in_name=walk_in_name.strip() if walk_in_name else None,
        walk_in_phone=walk_in_phone.strip() if walk_in_phone else None,
        created_by_id=current_user.id,
        order_status=order_status_val,
        payment_status="unpaid",
        table_number=table_number.strip() if table_number else None,
        kitchen_notes=kitchen_notes.strip() if kitchen_notes else None,
        notes=notes.strip() if notes else None,
        subtotal=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        tax_amount=Decimal("0.00"),
        total_amount=Decimal("0.00"),
    )
    if order_status_val == "completed":
        new_order.completed_at = utc_now()

    db.add(new_order)
    db.flush()

    # Process items and calculate authoritative financial snapshots
    subtotal_sum = Decimal("0.00")
    discount_sum = Decimal("0.00")
    tax_sum = Decimal("0.00")
    total_sum = Decimal("0.00")

    for item in items_in:
        prod = locked_products[item.product_id]
        unit_price = prod.unit_price
        line_gross = (unit_price * item.quantity).quantize(Decimal("0.01"))

        # Applied discount
        applied_disc_pct = discount_pct if prod.discount_eligible else Decimal("0.00")
        line_disc = (line_gross * (applied_disc_pct / Decimal("100.00"))).quantize(Decimal("0.01"))
        line_net = line_gross - line_disc

        # Applied tax
        line_tax = (line_net * (prod.tax_rate / Decimal("100.00"))).quantize(Decimal("0.01"))
        line_total = line_net + line_tax

        subtotal_sum += line_gross
        discount_sum += line_disc
        tax_sum += line_tax
        total_sum += line_total

        order_item = OrderItem(
            order_id=new_order.id,
            product_id=prod.id,
            product_name_snapshot=prod.name,
            sku_snapshot=prod.sku,
            quantity=item.quantity,
            unit_price_snapshot=unit_price,
            discount_percent_snapshot=applied_disc_pct,
            discount_amount_snapshot=line_disc,
            tax_rate_snapshot=prod.tax_rate,
            tax_amount_snapshot=line_tax,
            line_subtotal=line_gross,
            line_total=line_total,
        )
        db.add(order_item)

        # Inventory Decrement & Audit Movement
        if prod.inventory_tracked:
            prod.current_stock -= item.quantity
            movement = InventoryMovement(
                product_id=prod.id,
                movement_type="sale",
                quantity_change=-item.quantity,
                resulting_stock=prod.current_stock,
                performed_by_id=current_user.id,
                order_id=new_order.id,
                reason=f"Sale in order {order_number}",
            )
            db.add(movement)

    new_order.subtotal = subtotal_sum
    new_order.discount_amount = discount_sum
    new_order.tax_amount = tax_sum
    new_order.total_amount = total_sum

    # Record Initial Status History
    status_entry = OrderStatusHistory(
        order_id=new_order.id,
        previous_status=None,
        new_status=new_order.order_status,
        changed_by_id=current_user.id,
        notes="Order placed",
    )
    db.add(status_entry)

    db.commit()
    db.refresh(new_order)
    return get_order_by_id(db, new_order.id)


def get_order_by_id(db: Session, order_id: UUID) -> Order:
    stmt = (
        select(Order)
        .options(
            joinedload(Order.items).joinedload(OrderItem.product),
            joinedload(Order.member),
            joinedload(Order.created_by),
        )
        .where(Order.id == order_id)
    )
    order = db.scalars(stmt).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID '{order_id}' not found.",
        )
    return order


def list_orders(
    db: Session,
    order_type: Optional[str] = None,
    member_id: Optional[UUID] = None,
    order_status: Optional[str] = None,
) -> List[Order]:
    stmt = (
        select(Order)
        .options(joinedload(Order.items))
        .order_by(Order.created_at.desc())
    )
    if order_type:
        stmt = stmt.where(Order.order_type == order_type)
    if member_id:
        stmt = stmt.where(Order.member_id == member_id)
    if order_status:
        stmt = stmt.where(Order.order_status == order_status)
    return list(db.scalars(stmt).unique().all())


def cancel_order(
    db: Session,
    order_id: UUID,
    current_user: User,
    reason: Optional[str] = "Cancelled",
) -> Order:
    """
    Cancels an order and safely restores inventory exactly once.
    Only allows cancellation if order is not already cancelled or completed/served.
    """
    order = get_order_by_id(db, order_id)
    if order.order_status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is already cancelled.",
        )
    if order.order_status in ("completed", "served"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order in '{order.order_status}' status.",
        )

    old_status = order.order_status
    order.order_status = "cancelled"
    order.cancelled_at = utc_now()

    # Sort items deterministically to lock products before restoring stock
    sorted_items = sorted(order.items, key=lambda x: str(x.product_id))
    for item in sorted_items:
        stmt = select(Product).where(Product.id == item.product_id).with_for_update()
        product = db.scalars(stmt).first()
        if product and product.inventory_tracked:
            product.current_stock += item.quantity
            movement = InventoryMovement(
                product_id=product.id,
                movement_type="cancellation_restore",
                quantity_change=item.quantity,
                resulting_stock=product.current_stock,
                performed_by_id=current_user.id,
                order_id=order.id,
                reason=f"Restored stock from cancelled order {order.order_number}: {reason}",
            )
            db.add(movement)

    status_entry = OrderStatusHistory(
        order_id=order.id,
        previous_status=old_status,
        new_status="cancelled",
        changed_by_id=current_user.id,
        notes=reason,
    )
    db.add(status_entry)

    db.commit()
    db.refresh(order)
    return order


# ---------------------------------------------------------------------------
# Cafeteria Kitchen State Machine
# ---------------------------------------------------------------------------
VALID_CAFETERIA_TRANSITIONS = {
    "pending": ["preparing", "cancelled"],
    "preparing": ["ready", "cancelled"],
    "ready": ["served"],
    "served": [],
    "cancelled": [],
}


def update_cafeteria_status(
    db: Session,
    order_id: UUID,
    new_status: str,
    current_user: User,
    notes: Optional[str] = None,
) -> Order:
    order = get_order_by_id(db, order_id)
    if order.order_type != "cafeteria":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order '{order.order_number}' is not a cafeteria order.",
        )

    allowed_next = VALID_CAFETERIA_TRANSITIONS.get(order.order_status, [])
    if new_status not in allowed_next:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid cafeteria order transition from '{order.order_status}' to '{new_status}'. Allowed: {allowed_next}",
        )

    if new_status == "cancelled":
        return cancel_order(db, order_id, current_user, reason=notes or "Cafeteria order cancelled")

    old_status = order.order_status
    order.order_status = new_status
    if new_status == "served":
        order.completed_at = utc_now()

    status_entry = OrderStatusHistory(
        order_id=order.id,
        previous_status=old_status,
        new_status=new_status,
        changed_by_id=current_user.id,
        notes=notes,
    )
    db.add(status_entry)

    db.commit()
    db.refresh(order)
    return order
