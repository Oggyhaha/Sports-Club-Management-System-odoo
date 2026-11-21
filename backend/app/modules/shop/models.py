import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ProductCategory(Base):
    """
    Categorizes products for Pro-Shop and Cafeteria.
    Supports sports equipment, apparel, accessories, food, beverages, etc.
    """

    __tablename__ = "product_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )
    module_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        default="shop",  # 'shop' or 'cafeteria'
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
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
        default=utc_now,
    )

    # Relationships
    products: Mapped[List["Product"]] = relationship(
        back_populates="category",
    )


class Product(Base):
    """
    Represents sellable products in the pro-shop or cafeteria.
    Shared inventory system: one authoritative stock quantity per tracked item.
    """

    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("unit_price >= 0", name="chk_product_unit_price_non_negative"),
        CheckConstraint("tax_rate >= 0 AND tax_rate <= 100", name="chk_product_tax_rate_bounds"),
        CheckConstraint("current_stock >= 0", name="chk_product_current_stock_non_negative"),
        CheckConstraint("reorder_threshold >= 0", name="chk_product_reorder_threshold_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    sku: Mapped[Optional[str]] = mapped_column(
        String(50),
        unique=True,
        nullable=True,
        index=True,
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    module_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        default="shop",  # 'shop' or 'cafeteria'
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("0.00"),  # E.g. 5.00 for 5%, 18.00 for 18%
    )
    discount_eligible: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    inventory_tracked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    current_stock: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    reorder_threshold: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=5,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    # Relationships
    category: Mapped["ProductCategory"] = relationship(
        back_populates="products",
    )
    inventory_movements: Mapped[List["InventoryMovement"]] = relationship(
        back_populates="product",
        order_by="desc(InventoryMovement.created_at)",
    )
    order_items: Mapped[List["OrderItem"]] = relationship(
        back_populates="product",
    )


class Order(Base):
    """
    Unified order header for Shop Counter POS, Online Shop Orders, and Cafeteria Orders.
    Business lifecycles remain distinct while financial snapshots and inventory decrement are shared.
    """

    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="chk_order_subtotal_non_negative"),
        CheckConstraint("discount_amount >= 0", name="chk_order_discount_non_negative"),
        CheckConstraint("tax_amount >= 0", name="chk_order_tax_non_negative"),
        CheckConstraint("total_amount >= 0", name="chk_order_total_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    order_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    order_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,  # 'shop' or 'cafeteria'
    )
    customer_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,  # 'member' or 'walk_in'
    )
    member_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("members.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    walk_in_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    walk_in_phone: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
    )
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    # Order Status Lifecycle:
    # Shop: 'pending', 'confirmed', 'completed', 'cancelled'
    # Cafeteria: 'pending', 'preparing', 'ready', 'served', 'cancelled'
    order_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="pending",
        index=True,
    )
    # Payment Status (Separated lifecycle foundation for Milestone E):
    payment_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="unpaid",
        index=True,  # 'unpaid', 'partially_paid', 'paid'
    )
    # Cafeteria specific attributes
    table_number: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
    )
    kitchen_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    # Relationships
    member: Mapped[Optional["Member"]] = relationship()
    created_by: Mapped[Optional["User"]] = relationship()
    items: Mapped[List["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
    )
    inventory_movements: Mapped[List["InventoryMovement"]] = relationship(
        back_populates="order",
    )
    status_history: Mapped[List["OrderStatusHistory"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="desc(OrderStatusHistory.created_at)",
    )


class OrderItem(Base):
    """
    Immutable snapshot of line items ordered.
    Guarantees historical financial integrity even if product price or tax rates change.
    """

    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity >= 1", name="chk_order_item_quantity_positive"),
        CheckConstraint("unit_price_snapshot >= 0", name="chk_order_item_price_non_negative"),
        CheckConstraint("line_subtotal >= 0", name="chk_order_item_subtotal_non_negative"),
        CheckConstraint("line_total >= 0", name="chk_order_item_total_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    product_name_snapshot: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    sku_snapshot: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    unit_price_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    discount_percent_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    discount_amount_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    tax_rate_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    tax_amount_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    line_subtotal: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    line_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    # Relationships
    order: Mapped["Order"] = relationship(
        back_populates="items",
    )
    product: Mapped["Product"] = relationship(
        back_populates="order_items",
    )


class InventoryMovement(Base):
    """
    Authoritative audit ledger of all stock quantity changes.
    Tracks initial stock, restock, sales, manual adjustments, shrinkage, and cancellation restores.
    """

    __tablename__ = "inventory_movements"
    __table_args__ = (
        CheckConstraint("resulting_stock >= 0", name="chk_movement_resulting_stock_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    movement_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,  # 'initial_stock', 'restock', 'sale', 'adjustment', 'shrinkage', 'return', 'cancellation_restore'
    )
    quantity_change: Mapped[int] = mapped_column(
        Integer,
        nullable=False,  # positive (e.g. +10) or negative (e.g. -2)
    )
    resulting_stock: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    performed_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        index=True,
    )

    # Relationships
    product: Mapped["Product"] = relationship(
        back_populates="inventory_movements",
    )
    performed_by: Mapped["User"] = relationship()
    order: Mapped[Optional["Order"]] = relationship(
        back_populates="inventory_movements",
    )


class OrderStatusHistory(Base):
    """
    Audit log of order lifecycle state transitions (e.g. pending -> preparing -> ready -> served).
    """

    __tablename__ = "order_status_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    previous_status: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
    )
    new_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )
    changed_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    # Relationships
    order: Mapped["Order"] = relationship(
        back_populates="status_history",
    )
    changed_by: Mapped[Optional["User"]] = relationship()
