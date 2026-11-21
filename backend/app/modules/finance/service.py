import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.modules.auth.models import User
from app.modules.finance.models import (
    BusinessClient,
    Invoice,
    InvoiceItem,
    Payment,
    PaymentAllocation,
    PaymentAllocationReversal,
    PaymentReceipt,
    PaymentRefund,
)
from app.modules.finance.schemas import (
    AllocationCreate,
    AllocationReversalCreate,
    BusinessClientCreate,
    BusinessClientUpdate,
    InvoiceCreate,
    PaymentCreate,
    RefundCreate,
)
from app.modules.members.models import Member, MemberSubscription
from app.modules.shop.models import Order


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Business Client Services
# ---------------------------------------------------------------------------
def create_business_client(db: Session, client_in: BusinessClientCreate) -> BusinessClient:
    existing_email = db.scalars(
        select(BusinessClient).where(BusinessClient.email == client_in.email.strip().lower())
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Business client with email '{client_in.email}' already exists.",
        )

    if client_in.user_id:
        existing_user = db.scalars(
            select(BusinessClient).where(BusinessClient.user_id == client_in.user_id)
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A business client profile is already linked to this user account.",
            )

    client = BusinessClient(
        user_id=client_in.user_id,
        company_name=client_in.company_name.strip(),
        contact_person=client_in.contact_person.strip(),
        email=client_in.email.strip().lower(),
        phone=client_in.phone.strip() if client_in.phone else None,
        billing_address=client_in.billing_address.strip() if client_in.billing_address else None,
        tax_id_gstin=client_in.tax_id_gstin.strip() if client_in.tax_id_gstin else None,
        is_active=True,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def update_business_client(
    db: Session, client_id: UUID, client_in: BusinessClientUpdate
) -> BusinessClient:
    client = db.get(BusinessClient, client_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business client with ID '{client_id}' not found.",
        )

    update_data = client_in.model_dump(exclude_unset=True)
    if "company_name" in update_data and update_data["company_name"]:
        client.company_name = update_data["company_name"].strip()
    if "contact_person" in update_data and update_data["contact_person"]:
        client.contact_person = update_data["contact_person"].strip()
    if "phone" in update_data:
        client.phone = update_data["phone"].strip() if update_data["phone"] else None
    if "billing_address" in update_data:
        client.billing_address = update_data["billing_address"].strip() if update_data["billing_address"] else None
    if "tax_id_gstin" in update_data:
        client.tax_id_gstin = update_data["tax_id_gstin"].strip() if update_data["tax_id_gstin"] else None
    if "is_active" in update_data and update_data["is_active"] is not None:
        client.is_active = update_data["is_active"]

    db.commit()
    db.refresh(client)
    return client


def get_business_client_by_id(db: Session, client_id: UUID) -> BusinessClient:
    client = db.get(BusinessClient, client_id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business client with ID '{client_id}' not found.",
        )
    return client


def get_business_client_by_user_id(db: Session, user_id: UUID) -> Optional[BusinessClient]:
    stmt = select(BusinessClient).where(BusinessClient.user_id == user_id)
    return db.scalars(stmt).first()


def list_business_clients(
    db: Session,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
) -> List[BusinessClient]:
    stmt = select(BusinessClient).order_by(BusinessClient.company_name.asc())
    if is_active is not None:
        stmt = stmt.where(BusinessClient.is_active == is_active)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                BusinessClient.company_name.ilike(pattern),
                BusinessClient.email.ilike(pattern),
                BusinessClient.contact_person.ilike(pattern),
            )
        )
    return list(db.scalars(stmt).all())


# ---------------------------------------------------------------------------
# Invoice Services
# ---------------------------------------------------------------------------
def _compute_invoice_ledger_amount_paid(db: Session, invoice_id: UUID) -> Decimal:
    """
    Derives authoritative amount_paid from the allocation and reversal ledger.
    Formula: sum(allocations) - sum(reversals).
    """
    stmt = (
        select(PaymentAllocation)
        .options(joinedload(PaymentAllocation.reversals))
        .where(PaymentAllocation.invoice_id == invoice_id)
    )
    allocations = list(db.scalars(stmt).unique().all())
    net_paid = Decimal("0.00")
    for alloc in allocations:
        rev_sum = sum((r.amount for r in alloc.reversals), Decimal("0.00"))
        net_paid += (alloc.allocated_amount - rev_sum)
    return net_paid.quantize(Decimal("0.01"))


def create_invoice(
    db: Session,
    invoice_in: InvoiceCreate,
    current_user: User,
) -> Invoice:
    """
    Creates an authoritative Invoice enforcing strict source and customer integrity:
    1. Valid customer association: exactly one of business_client_id, member_id, or walk_in_name.
    2. Mutual exclusivity: cannot reference both order_id AND subscription_id.
    3. If order_id: strictly snapshots existing order subtotals and discounts.
    4. If subscription_id: strictly snapshots subscription price_paid.
    5. If custom invoice: requires items, validates item subtotals.
    """
    # Mutual exclusivity check
    if invoice_in.order_id and invoice_in.subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An invoice cannot simultaneously reference both an order and a subscription.",
        )

    # Customer integrity verification
    has_biz = invoice_in.business_client_id is not None
    has_mem = invoice_in.member_id is not None
    has_walkin = bool(invoice_in.walk_in_name and invoice_in.walk_in_name.strip())

    # Source obligation resolution
    subtotal = Decimal("0.00")
    discount_amount = Decimal("0.00")
    tax_amount = Decimal("0.00")
    total_amount = Decimal("0.00")
    line_items = []

    order = None
    if invoice_in.order_id:
        order = db.get(Order, invoice_in.order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order with ID '{invoice_in.order_id}' not found.",
            )
        if order.order_status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot issue an invoice for a cancelled order.",
            )
        subtotal = order.subtotal
        discount_amount = order.discount_amount
        tax_amount = order.tax_amount
        total_amount = order.total_amount

        # Derive customer from order if not explicitly specified
        if not (has_biz or has_mem or has_walkin):
            if order.member_id:
                invoice_in.member_id = order.member_id
                has_mem = True
            elif order.walk_in_name:
                invoice_in.walk_in_name = order.walk_in_name
                invoice_in.walk_in_phone = order.walk_in_phone
                has_walkin = True

    elif invoice_in.subscription_id:
        sub = db.get(MemberSubscription, invoice_in.subscription_id)
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription with ID '{invoice_in.subscription_id}' not found.",
            )
        subtotal = sub.price_paid
        total_amount = sub.price_paid
        if not (has_biz or has_mem or has_walkin):
            invoice_in.member_id = sub.member_id
            has_mem = True

    else:
        # Direct custom or corporate invoice
        if not invoice_in.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Direct invoices must include at least one invoice item.",
            )
        for item_in in invoice_in.items:
            gross = (item_in.unit_price * item_in.quantity).quantize(Decimal("0.01"))
            net = gross - item_in.discount_amount
            line_tot = net + item_in.tax_amount

            subtotal += gross
            discount_amount += item_in.discount_amount
            tax_amount += item_in.tax_amount
            total_amount += line_tot

            line_items.append(
                InvoiceItem(
                    description=item_in.description.strip(),
                    quantity=item_in.quantity,
                    unit_price=item_in.unit_price,
                    discount_amount=item_in.discount_amount,
                    tax_amount=item_in.tax_amount,
                    line_total=line_tot,
                )
            )

    # Customer integrity final verification
    if not (has_biz or has_mem or has_walkin):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice must specify a customer: business_client_id, member_id, or walk-in contact.",
        )

    # Generate unique invoice number
    date_str = date.today().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    invoice_number = f"INV-{date_str}-{unique_suffix}"

    new_invoice = Invoice(
        invoice_number=invoice_number,
        order_id=invoice_in.order_id,
        subscription_id=invoice_in.subscription_id,
        business_client_id=invoice_in.business_client_id,
        member_id=invoice_in.member_id,
        walk_in_name=invoice_in.walk_in_name.strip() if invoice_in.walk_in_name else None,
        walk_in_phone=invoice_in.walk_in_phone.strip() if invoice_in.walk_in_phone else None,
        currency=invoice_in.currency.upper(),
        subtotal=subtotal,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        total_amount=total_amount,
        amount_paid=Decimal("0.00"),
        invoice_status="issued",
        issue_date=date.today(),
        due_date=invoice_in.due_date,
        notes=invoice_in.notes.strip() if invoice_in.notes else None,
        created_by_id=current_user.id,
    )
    if line_items:
        new_invoice.items = line_items

    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)
    return get_invoice_by_id(db, new_invoice.id)


def get_invoice_by_id(db: Session, invoice_id: UUID) -> Invoice:
    stmt = (
        select(Invoice)
        .options(
            joinedload(Invoice.items),
            joinedload(Invoice.allocations),
            joinedload(Invoice.business_client),
            joinedload(Invoice.member),
            joinedload(Invoice.order),
            joinedload(Invoice.subscription),
        )
        .where(Invoice.id == invoice_id)
    )
    inv = db.scalars(stmt).first()
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID '{invoice_id}' not found.",
        )
    return inv


def list_invoices(
    db: Session,
    business_client_id: Optional[UUID] = None,
    member_id: Optional[UUID] = None,
    invoice_status: Optional[str] = None,
) -> List[Invoice]:
    stmt = (
        select(Invoice)
        .options(joinedload(Invoice.items))
        .order_by(Invoice.created_at.desc())
    )
    if business_client_id:
        stmt = stmt.where(Invoice.business_client_id == business_client_id)
    if member_id:
        stmt = stmt.where(Invoice.member_id == member_id)
    if invoice_status:
        stmt = stmt.where(Invoice.invoice_status == invoice_status)
    return list(db.scalars(stmt).unique().all())


def cancel_invoice(db: Session, invoice_id: UUID, current_user: User, reason: Optional[str] = None) -> Invoice:
    stmt = select(Invoice).where(Invoice.id == invoice_id).with_for_update()
    inv = db.scalars(stmt).first()
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID '{invoice_id}' not found.",
        )
    if inv.invoice_status in ("paid", "partially_paid") and inv.amount_paid > Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel an invoice with allocated payments. Reverse payment allocations first.",
        )
    if inv.invoice_status in ("cancelled", "void"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invoice is already in '{inv.invoice_status}' status.",
        )

    inv.invoice_status = "cancelled"
    db.commit()
    db.refresh(inv)
    return inv


# ---------------------------------------------------------------------------
# Payment Services
# ---------------------------------------------------------------------------
def _compute_payment_balances(db: Session, payment_id: UUID) -> tuple[Decimal, Decimal]:
    """
    Computes (net_allocated_amount, unallocated_amount) for a payment from the ledger.
    """
    payment = db.get(Payment, payment_id)
    stmt = (
        select(PaymentAllocation)
        .options(joinedload(PaymentAllocation.reversals))
        .where(PaymentAllocation.payment_id == payment_id)
    )
    allocs = list(db.scalars(stmt).unique().all())

    net_allocated = Decimal("0.00")
    for a in allocs:
        rev_sum = sum((r.amount for r in a.reversals), Decimal("0.00"))
        net_allocated += (a.allocated_amount - rev_sum)

    # Also account for any refunds processed against this payment
    refund_stmt = select(func.coalesce(func.sum(PaymentRefund.amount), Decimal("0.00"))).where(
        PaymentRefund.payment_id == payment_id
    )
    refund_sum = db.scalar(refund_stmt) or Decimal("0.00")

    unallocated = payment.amount - net_allocated - refund_sum
    return (net_allocated.quantize(Decimal("0.01")), unallocated.quantize(Decimal("0.01")))


def record_payment(
    db: Session,
    payment_in: PaymentCreate,
    current_user: User,
    customer_name: Optional[str] = "Champions Club Patron",
) -> Payment:
    """
    Records an incoming payment.
    Enforces idempotency, creates initial Payment record, and generates a PaymentReceipt
    immediately if payment status is successful.
    """
    if payment_in.idempotency_key:
        existing = db.scalars(
            select(Payment).where(Payment.idempotency_key == payment_in.idempotency_key.strip())
        ).first()
        if existing:
            return existing

    date_str = date.today().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    payment_ref = f"PAY-{date_str}-{unique_suffix}"

    payment = Payment(
        payment_reference=payment_ref,
        idempotency_key=payment_in.idempotency_key.strip() if payment_in.idempotency_key else None,
        amount=payment_in.amount,
        currency=payment_in.currency.upper(),
        payment_method=payment_in.payment_method,
        payment_status="successful",
        external_reference=payment_in.external_reference.strip() if payment_in.external_reference else None,
        recorded_by_id=current_user.id,
        notes=payment_in.notes.strip() if payment_in.notes else None,
        received_at=utc_now(),
    )
    db.add(payment)
    db.flush()

    # Generate single PaymentReceipt for successful payment
    receipt_no = f"REC-{date_str}-{uuid.uuid4().hex[:6].upper()}"
    receipt = PaymentReceipt(
        receipt_number=receipt_no,
        payment_id=payment.id,
        amount_received=payment.amount,
        payment_method=payment.payment_method,
        customer_name_snapshot=customer_name or "Valued Customer",
        issued_by_id=current_user.id,
    )
    db.add(receipt)

    db.commit()
    db.refresh(payment)
    return payment


def get_payment_by_id(db: Session, payment_id: UUID) -> Payment:
    stmt = (
        select(Payment)
        .options(
            joinedload(Payment.allocations),
            joinedload(Payment.receipts),
            joinedload(Payment.refunds),
            joinedload(Payment.recorded_by),
        )
        .where(Payment.id == payment_id)
    )
    pmt = db.scalars(stmt).first()
    if not pmt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with ID '{payment_id}' not found.",
        )
    return pmt


def list_payments(
    db: Session,
    payment_status: Optional[str] = None,
    payment_method: Optional[str] = None,
) -> List[Payment]:
    stmt = select(Payment).order_by(Payment.created_at.desc())
    if payment_status:
        stmt = stmt.where(Payment.payment_status == payment_status)
    if payment_method:
        stmt = stmt.where(Payment.payment_method == payment_method)
    return list(db.scalars(stmt).all())


# ---------------------------------------------------------------------------
# Payment Allocation & Reversal Services
# ---------------------------------------------------------------------------
def allocate_payment(
    db: Session,
    payment_id: UUID,
    alloc_in: AllocationCreate,
    current_user: User,
) -> PaymentAllocation:
    """
    Allocates a portion or full amount of a confirmed payment to an invoice.
    Enforces:
    1. Deterministic lock order: lock Payment first, then Invoice.
    2. Payment must be in 'successful' status.
    3. Invoice must not be cancelled, void, or already fully settled.
    4. Amount must not exceed payment unallocated balance.
    5. Amount must not exceed invoice outstanding balance.
    6. Synchronizes invoice.amount_paid and invoice.invoice_status.
    7. Synchronizes order.payment_status / subscription.payment_status.
    """
    # Deterministic lock ordering: Payment first, then Invoice
    pmt_stmt = select(Payment).where(Payment.id == payment_id).with_for_update()
    payment = db.scalars(pmt_stmt).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with ID '{payment_id}' not found.",
        )
    if payment.payment_status != "successful":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only confirmed successful payments can be allocated. Payment is '{payment.payment_status}'.",
        )

    inv_stmt = select(Invoice).where(Invoice.id == alloc_in.invoice_id).with_for_update()
    invoice = db.scalars(inv_stmt).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID '{alloc_in.invoice_id}' not found.",
        )
    if invoice.invoice_status in ("cancelled", "void"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot allocate payment to a '{invoice.invoice_status}' invoice.",
        )

    # Check unallocated payment funds
    _, unallocated_pmt = _compute_payment_balances(db, payment.id)
    if alloc_in.amount > unallocated_pmt:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Allocation amount ({alloc_in.amount}) exceeds unallocated payment balance ({unallocated_pmt}).",
        )

    # Check invoice outstanding balance
    current_paid = _compute_invoice_ledger_amount_paid(db, invoice.id)
    outstanding_inv = invoice.total_amount - current_paid
    if alloc_in.amount > outstanding_inv:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Allocation amount ({alloc_in.amount}) exceeds invoice outstanding balance ({outstanding_inv}).",
        )

    allocation = PaymentAllocation(
        payment_id=payment.id,
        invoice_id=invoice.id,
        allocated_amount=alloc_in.amount,
    )
    db.add(allocation)
    db.flush()

    # Recompute invoice amount_paid transactionally from ledger
    new_amount_paid = current_paid + alloc_in.amount
    invoice.amount_paid = new_amount_paid
    if new_amount_paid >= invoice.total_amount:
        invoice.invoice_status = "paid"
    else:
        invoice.invoice_status = "partially_paid"

    # Synchronize underlying order or subscription payment_status
    if invoice.order_id:
        order = db.get(Order, invoice.order_id)
        if order:
            order.payment_status = invoice.invoice_status
    if invoice.subscription_id:
        sub = db.get(MemberSubscription, invoice.subscription_id)
        if sub:
            sub.payment_status = invoice.invoice_status

    db.commit()
    db.refresh(allocation)
    return allocation


def reverse_allocation(
    db: Session,
    allocation_id: UUID,
    rev_in: AllocationReversalCreate,
    current_user: User,
) -> PaymentAllocationReversal:
    """
    Reverses an allocation partially or completely.
    Enforces:
    1. Lock allocation, invoice, and payment rows.
    2. Reversal amount cannot exceed remaining net allocated amount on the allocation.
    3. Recomputes invoice amount_paid and reverts invoice/order/subscription statuses.
    """
    alloc_stmt = select(PaymentAllocation).where(PaymentAllocation.id == allocation_id).with_for_update()
    allocation = db.scalars(alloc_stmt).first()
    if not allocation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment allocation with ID '{allocation_id}' not found.",
        )

    inv_stmt = select(Invoice).where(Invoice.id == allocation.invoice_id).with_for_update()
    invoice = db.scalars(inv_stmt).first()

    pmt_stmt = select(Payment).where(Payment.id == allocation.payment_id).with_for_update()
    payment = db.scalars(pmt_stmt).first()

    # Compute already reversed amount on this allocation
    existing_rev_sum = db.scalar(
        select(func.coalesce(func.sum(PaymentAllocationReversal.amount), Decimal("0.00")))
        .where(PaymentAllocationReversal.allocation_id == allocation.id)
    ) or Decimal("0.00")

    net_allocated = allocation.allocated_amount - existing_rev_sum
    if rev_in.amount > net_allocated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Reversal amount ({rev_in.amount}) exceeds remaining net allocated amount ({net_allocated}).",
        )

    reversal = PaymentAllocationReversal(
        allocation_id=allocation.id,
        amount=rev_in.amount,
        reason=rev_in.reason.strip(),
        reversed_by_id=current_user.id,
    )
    db.add(reversal)
    db.flush()

    # Recompute invoice amount_paid from ledger
    current_paid = _compute_invoice_ledger_amount_paid(db, invoice.id)
    invoice.amount_paid = current_paid
    if current_paid == Decimal("0.00"):
        invoice.invoice_status = "issued"
    elif current_paid < invoice.total_amount:
        invoice.invoice_status = "partially_paid"
    else:
        invoice.invoice_status = "paid"

    # Synchronize underlying order or subscription payment_status
    if invoice.order_id:
        order = db.get(Order, invoice.order_id)
        if order:
            order.payment_status = invoice.invoice_status
    if invoice.subscription_id:
        sub = db.get(MemberSubscription, invoice.subscription_id)
        if sub:
            sub.payment_status = invoice.invoice_status

    db.commit()
    db.refresh(reversal)
    return reversal


# ---------------------------------------------------------------------------
# Refund Services
# ---------------------------------------------------------------------------
def refund_payment(
    db: Session,
    payment_id: UUID,
    refund_in: RefundCreate,
    current_user: User,
) -> PaymentRefund:
    """
    Processes an auditable refund against unallocated payment funds.
    Enforces:
    1. Lock payment row with_for_update.
    2. Payment must be in 'successful' or 'partially_refunded' status.
    3. Refund amount cannot exceed unallocated available payment balance.
    4. Updates payment status to 'refunded' or 'partially_refunded'.
    """
    pmt_stmt = select(Payment).where(Payment.id == payment_id).with_for_update()
    payment = db.scalars(pmt_stmt).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with ID '{payment_id}' not found.",
        )
    if payment.payment_status not in ("successful", "partially_refunded"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot refund a payment in '{payment.payment_status}' status.",
        )

    _, unallocated = _compute_payment_balances(db, payment.id)
    if refund_in.amount > unallocated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Refund amount ({refund_in.amount}) exceeds unallocated available balance ({unallocated}). Reverse invoice allocations before refunding.",
        )

    date_str = date.today().strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    refund_ref = f"REF-{date_str}-{unique_suffix}"

    refund = PaymentRefund(
        refund_reference=refund_ref,
        payment_id=payment.id,
        amount=refund_in.amount,
        reason=refund_in.reason.strip(),
        processed_by_id=current_user.id,
    )
    db.add(refund)
    db.flush()

    # Check total refunded against total payment amount
    total_refunded = db.scalar(
        select(func.coalesce(func.sum(PaymentRefund.amount), Decimal("0.00")))
        .where(PaymentRefund.payment_id == payment.id)
    ) or Decimal("0.00")

    if total_refunded >= payment.amount:
        payment.payment_status = "refunded"
    else:
        payment.payment_status = "partially_refunded"

    db.commit()
    db.refresh(refund)
    return refund


# ---------------------------------------------------------------------------
# Receipt Services
# ---------------------------------------------------------------------------
def get_receipt_by_id(db: Session, receipt_id: UUID) -> PaymentReceipt:
    receipt = db.get(PaymentReceipt, receipt_id)
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Receipt with ID '{receipt_id}' not found.",
        )
    return receipt


def list_receipts(db: Session) -> List[PaymentReceipt]:
    stmt = select(PaymentReceipt).order_by(PaymentReceipt.created_at.desc())
    return list(db.scalars(stmt).all())
