from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.modules.shop.schemas import OrderItemCreate, OrderResponse, ProductPublicResponse


class CafeteriaMenuItemResponse(ProductPublicResponse):
    pass


class CafeteriaOrderCreate(BaseModel):
    items: List[OrderItemCreate] = Field(..., min_length=1)
    customer_type: str = Field("walk_in", pattern="^(walk_in|member)$")
    member_id: Optional[UUID] = None
    walk_in_name: Optional[str] = Field(None, max_length=100)
    walk_in_phone: Optional[str] = Field(None, max_length=20)
    table_number: Optional[str] = Field(None, max_length=20)
    kitchen_notes: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("member_id")
    @classmethod
    def validate_member_cafeteria(cls, v, info):
        customer_type = info.data.get("customer_type")
        if customer_type == "member" and not v:
            raise ValueError("member_id is required when customer_type is 'member'.")
        return v


class CafeteriaStatusUpdate(BaseModel):
    new_status: str = Field(..., pattern="^(preparing|ready|served|cancelled)$")
    notes: Optional[str] = Field(None, max_length=255)
