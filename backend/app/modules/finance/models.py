import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
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


class BusinessClient(Base):
    """
    Corporate and institutional clients managing facility rentals,
    bulk court reservations, corporate memberships, and business invoices.
    """

    __tablename__ = "business_clients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
        index=True,
    )
    company_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )
    contact_person: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        index=True,
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
    )
    billing_address: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    tax_id_gstin: Mapped[Optional[str]] = mapped_column(
        String(50),
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
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship()
    invoices: Mapped[List["Invoice"]] = relationship(
        back_populates="business_client",
    )


class Invoice(Base):
    """
    Authoritative financial obligation representing billed revenue across
    pro-shop orders, cafeteria orders, membership subscriptions, or direct corporate contracts.
    """

    __tablename__ = "invoices"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="chk_invoice_subtotal_non_negative"),
        CheckConstraint("discount_amount >= 0", name="chk_invoice_discount_non_negative"),
        CheckConstraint("tax_amount >= 0", name="chk_invoice_tax_non_negative"),
        CheckConstraint("total_amount >= 0", name="chk_invoice_total_non_negative"),
        CheckConstraint("amount_paid >= 0", name="chk_invoice_amount_paid_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    invoice_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    # Source Obligation Foreign Keys (Explicit & Non-Polymorphic)
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    subscription_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("member_subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Customer Association Foreign Keys
    business_client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("business_clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
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

    # Monetary Attributes
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
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
    amount_paid: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    # Status: 'draft', 'issued', 'partially_paid', 'paid', 'cancelled', 'void'
    invoice_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="draft",
        index=True,
    )
    issue_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        default=date.today,
    )
    due_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
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
    order: Mapped[Optional["Order"]] = relationship()
    subscription: Mapped[Optional["MemberSubscription"]] = relationship()
    business_client: Mapped[Optional["BusinessClient"]] = relationship(
        back_populates="invoices",
    )
    member: Mapped[Optional["Member"]] = relationship()
    created_by: Mapped[Optional["User"]] = relationship()
    items: Mapped[List["InvoiceItem"]] = relationship(
        back_populates="invoice",
        cascade="all, delete-orphan",
    )
    allocations: Mapped[List["PaymentAllocation"]] = relationship(
        back_populates="invoice",
    )


class InvoiceItem(Base):
    """
    Line item for direct custom or corporate invoices.
    """

    __tablename__ = "invoice_items"
    __table_args__ = (
        CheckConstraint("quantity >= 1", name="chk_inv_item_qty_positive"),
        CheckConstraint("unit_price >= 0", name="chk_inv_item_price_non_negative"),
        CheckConstraint("discount_amount >= 0", name="chk_inv_item_discount_non_negative"),
        CheckConstraint("tax_amount >= 0", name="chk_inv_item_tax_non_negative"),
        CheckConstraint("line_total >= 0", name="chk_inv_item_total_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
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
    invoice: Mapped["Invoice"] = relationship(
        back_populates="items",
    )


class Payment(Base):
    """
    Represents actual money received into club accounts.
    Explicitly separated from order fulfillment and kitchen state.
    """

    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_payment_amount_strictly_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    payment_reference: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    idempotency_key: Mapped[Optional[str]] = mapped_column(
        String(100),
        unique=True,
        nullable=True,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
    )
    # Payment Method: 'cash', 'upi', 'card', 'bank_transfer', 'other'
    payment_method: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )
    # Status: 'pending', 'successful', 'failed', 'cancelled', 'refunded', 'partially_refunded'
    payment_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="successful",
        index=True,
    )
    external_reference: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,  # Bank transaction reference or UPI UTR number
    )
    recorded_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        index=True,
    )

    # Relationships
    recorded_by: Mapped["User"] = relationship()
    allocations: Mapped[List["PaymentAllocation"]] = relationship(
        back_populates="payment",
    )
    receipts: Mapped[List["PaymentReceipt"]] = relationship(
        back_populates="payment",
    )
    refunds: Mapped[List["PaymentRefund"]] = relationship(
        back_populates="payment",
    )


class PaymentAllocation(Base):
    """
    Connects actual money received (Payment) to a legal obligation (Invoice).
    Enforces that the allocation does not exceed the payment amount or invoice balance.
    """

    __tablename__ = "payment_allocations"
    __table_args__ = (
        CheckConstraint("allocated_amount > 0", name="chk_allocation_amount_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    allocated_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    # Relationships
    payment: Mapped["Payment"] = relationship(
        back_populates="allocations",
    )
    invoice: Mapped["Invoice"] = relationship(
        back_populates="allocations",
    )
    reversals: Mapped[List["PaymentAllocationReversal"]] = relationship(
        back_populates="allocation",
    )


class PaymentAllocationReversal(Base):
    """
    Immutable, amount-based ledger of allocation reversals and partial refunds.
    Guarantees that partial reversals reduce the effective allocated amount correctly.
    """

    __tablename__ = "payment_allocation_reversals"
    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_reversal_amount_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    allocation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payment_allocations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    reversed_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    # Relationships
    allocation: Mapped["PaymentAllocation"] = relationship(
        back_populates="reversals",
    )
    reversed_by: Mapped["User"] = relationship()


class PaymentReceipt(Base):
    """
    Official acknowledgement of money received into the club.
    Generated exactly once per successful payment transaction.
    """

    __tablename__ = "receipts"
    __table_args__ = (
        CheckConstraint("amount_received > 0", name="chk_receipt_amount_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    receipt_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    amount_received: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    payment_method: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )
    customer_name_snapshot: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    issued_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        index=True,
    )

    # Relationships
    payment: Mapped["Payment"] = relationship(
        back_populates="receipts",
    )
    issued_by: Mapped["User"] = relationship()


class PaymentRefund(Base):
    """
    Immutable record of money returned to a customer or business client.
    Never mutates or deletes original payment records.
    """

    __tablename__ = "payment_refunds"
    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_refund_amount_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    refund_reference: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    processed_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

    # Relationships
    payment: Mapped["Payment"] = relationship(
        back_populates="refunds",
    )
    processed_by: Mapped["User"] = relationship()
