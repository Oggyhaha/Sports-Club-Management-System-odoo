from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Category Schemas
# ---------------------------------------------------------------------------
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    module_type: str = Field("shop", pattern="^(shop|cafeteria)$")
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Product Schemas
# ---------------------------------------------------------------------------
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=50)
    category_id: UUID
    module_type: str = Field("shop", pattern="^(shop|cafeteria)$")
    unit_price: Decimal = Field(..., ge=0, decimal_places=2)
    tax_rate: Decimal = Field(Decimal("0.00"), ge=0, le=100, decimal_places=2)
    discount_eligible: bool = True
    inventory_tracked: bool = True
    reorder_threshold: int = Field(5, ge=0)


class ProductCreate(ProductBase):
    initial_stock: int = Field(0, ge=0)


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=50)
    category_id: Optional[UUID] = None
    unit_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100, decimal_places=2)
    discount_eligible: Optional[bool] = None
    is_active: Optional[bool] = None
    inventory_tracked: Optional[bool] = None
    reorder_threshold: Optional[int] = Field(None, ge=0)


class ProductPublicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    category_id: UUID
    module_type: str
    unit_price: Decimal
    tax_rate: Decimal
    discount_eligible: bool
    is_active: bool
    is_in_stock: bool = True


class ProductAdminResponse(ProductPublicResponse):
    current_stock: int
    inventory_tracked: bool
    reorder_threshold: int
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None


# ---------------------------------------------------------------------------
# Inventory Schemas
# ---------------------------------------------------------------------------
class InventoryAdjustRequest(BaseModel):
    product_id: UUID
    new_stock: int = Field(..., ge=0)
    reason: str = Field(..., min_length=3, max_length=255)


class InventoryRestockRequest(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)
    reason: Optional[str] = Field("Supplier Restock", max_length=255)


class InventoryMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    movement_type: str
    quantity_change: int
    resulting_stock: int
    performed_by_id: UUID
    order_id: Optional[UUID] = None
    reason: Optional[str] = None
    created_at: datetime


class ProductInventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: UUID
    product_name: str
    sku: Optional[str] = None
    module_type: str
    current_stock: int
    reorder_threshold: int
    inventory_tracked: bool
    is_low_stock: bool


# ---------------------------------------------------------------------------
# Order Items & Orders Schemas
# ---------------------------------------------------------------------------
class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    product_name_snapshot: str
    sku_snapshot: Optional[str] = None
    quantity: int
    unit_price_snapshot: Decimal
    discount_percent_snapshot: Decimal
    discount_amount_snapshot: Decimal
    tax_rate_snapshot: Decimal
    tax_amount_snapshot: Decimal
    line_subtotal: Decimal
    line_total: Decimal


class OrderCreate(BaseModel):
    items: List[OrderItemCreate] = Field(..., min_length=1)
    customer_type: str = Field("walk_in", pattern="^(walk_in|member)$")
    member_id: Optional[UUID] = None
    walk_in_name: Optional[str] = Field(None, max_length=100)
    walk_in_phone: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None

    @field_validator("member_id")
    @classmethod
    def validate_member_pos(cls, v, info):
        customer_type = info.data.get("customer_type")
        if customer_type == "member" and not v:
            raise ValueError("member_id is required when customer_type is 'member'.")
        return v


# Backward compatibility aliases
OrderCreatePOS = OrderCreate
OrderCreateOnline = OrderCreate


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_number: str
    order_type: str
    customer_type: str
    member_id: Optional[UUID] = None
    walk_in_name: Optional[str] = None
    walk_in_phone: Optional[str] = None
    created_by_id: Optional[UUID] = None
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    order_status: str
    payment_status: str
    table_number: Optional[str] = None
    kitchen_notes: Optional[str] = None
    notes: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = []


class OrderCancelRequest(BaseModel):
    reason: Optional[str] = Field("Customer cancelled", max_length=255)
