from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Business Client Schemas
# ---------------------------------------------------------------------------
class BusinessClientBase(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=150)
    contact_person: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    phone: Optional[str] = Field(None, max_length=20)
    billing_address: Optional[str] = None
    tax_id_gstin: Optional[str] = Field(None, max_length=50)


class BusinessClientCreate(BusinessClientBase):
    user_id: Optional[UUID] = None


class BusinessClientUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=2, max_length=150)
    contact_person: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    billing_address: Optional[str] = None
    tax_id_gstin: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class BusinessClientResponse(BusinessClientBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: Optional[UUID] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Invoice Item Schemas
# ---------------------------------------------------------------------------
class InvoiceItemCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=255)
    quantity: int = Field(1, ge=1)
    unit_price: Decimal = Field(..., ge=0, decimal_places=2)
    discount_amount: Decimal = Field(Decimal("0.00"), ge=0, decimal_places=2)
    tax_amount: Decimal = Field(Decimal("0.00"), ge=0, decimal_places=2)


class InvoiceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    description: str
    quantity: int
    unit_price: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    line_total: Decimal
    created_at: datetime


# ---------------------------------------------------------------------------
# Invoice Schemas
# ---------------------------------------------------------------------------
class InvoiceCreate(BaseModel):
    order_id: Optional[UUID] = None
    subscription_id: Optional[UUID] = None
    business_client_id: Optional[UUID] = None
    member_id: Optional[UUID] = None
    walk_in_name: Optional[str] = Field(None, max_length=100)
    walk_in_phone: Optional[str] = Field(None, max_length=20)
    due_date: date
    currency: str = Field("INR", min_length=3, max_length=3)
    notes: Optional[str] = None
    items: Optional[List[InvoiceItemCreate]] = None

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("Due date cannot precede today.")
        return v


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_number: str
    order_id: Optional[UUID] = None
    subscription_id: Optional[UUID] = None
    business_client_id: Optional[UUID] = None
    member_id: Optional[UUID] = None
    walk_in_name: Optional[str] = None
    walk_in_phone: Optional[str] = None
    currency: str
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    outstanding_amount: Decimal = Decimal("0.00")
    invoice_status: str
    issue_date: date
    due_date: date
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItemResponse] = []


class InvoiceBalanceResponse(BaseModel):
    invoice_id: UUID
    invoice_number: str
    currency: str
    total_amount: Decimal
    amount_paid: Decimal
    outstanding_amount: Decimal
    invoice_status: str


# ---------------------------------------------------------------------------
# Payment Schemas
# ---------------------------------------------------------------------------
class PaymentCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = Field("INR", min_length=3, max_length=3)
    payment_method: str = Field(..., pattern="^(cash|upi|card|bank_transfer|other)$")
    external_reference: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    idempotency_key: Optional[str] = Field(None, max_length=100)


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    payment_reference: str
    idempotency_key: Optional[str] = None
    amount: Decimal
    currency: str
    payment_method: str
    payment_status: str
    external_reference: Optional[str] = None
    recorded_by_id: UUID
    notes: Optional[str] = None
    received_at: datetime
    created_at: datetime
    allocated_amount: Decimal = Decimal("0.00")
    unallocated_amount: Decimal = Decimal("0.00")


# ---------------------------------------------------------------------------
# Allocation & Reversal Schemas
# ---------------------------------------------------------------------------
class AllocationCreate(BaseModel):
    invoice_id: UUID
    amount: Decimal = Field(..., gt=0, decimal_places=2)


class AllocationReversalCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    reason: str = Field(..., min_length=3)


class AllocationReversalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    allocation_id: UUID
    amount: Decimal
    reason: str
    reversed_by_id: UUID
    created_at: datetime


class AllocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    payment_id: UUID
    invoice_id: UUID
    allocated_amount: Decimal
    net_allocated_amount: Decimal = Decimal("0.00")
    created_at: datetime
    reversals: List[AllocationReversalResponse] = []


# ---------------------------------------------------------------------------
# Receipt Schemas
# ---------------------------------------------------------------------------
class ReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    receipt_number: str
    payment_id: UUID
    amount_received: Decimal
    payment_method: str
    customer_name_snapshot: str
    issued_by_id: UUID
    created_at: datetime


# ---------------------------------------------------------------------------
# Refund Schemas
# ---------------------------------------------------------------------------
class RefundCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    reason: str = Field(..., min_length=3)


class RefundResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    refund_reference: str
    payment_id: UUID
    amount: Decimal
    reason: str
    processed_by_id: UUID
    created_at: datetime
