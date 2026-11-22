from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.modules.auth.models import RoleEnum, User
from app.modules.finance import service
from app.modules.finance.schemas import (
    AllocationCreate,
    AllocationResponse,
    AllocationReversalCreate,
    AllocationReversalResponse,
    BusinessClientCreate,
    BusinessClientResponse,
    BusinessClientUpdate,
    InvoiceBalanceResponse,
    InvoiceCreate,
    InvoiceResponse,
    PaymentCreate,
    PaymentResponse,
    ReceiptResponse,
    RefundCreate,
    RefundResponse,
)

# Individual modular routers
business_clients_router = APIRouter(prefix="/business-clients", tags=["Business Clients"])
invoices_router = APIRouter(prefix="/invoices", tags=["Invoices"])
payments_router = APIRouter(prefix="/payments", tags=["Payments & Allocations"])
receipts_router = APIRouter(prefix="/receipts", tags=["Receipts"])
allocations_router = APIRouter(prefix="/allocations", tags=["Payment Allocations"])

FINANCE_STAFF_ROLES = [
    RoleEnum.OWNER.value,
    RoleEnum.ACCOUNT_STAFF.value,
    RoleEnum.RECEPTIONIST.value,
    RoleEnum.SHOP_STAFF.value,
]


# ---------------------------------------------------------------------------
# Business Client Endpoints
# ---------------------------------------------------------------------------
@business_clients_router.post(
    "",
    response_model=BusinessClientResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles([RoleEnum.OWNER.value, RoleEnum.ACCOUNT_STAFF.value]))],
)
def create_business_client(
    client_in: BusinessClientCreate,
    db: Session = Depends(get_db),
):
    """Owner/Finance: register corporate or institutional business client."""
    return service.create_business_client(db, client_in)


@business_clients_router.get(
    "",
    response_model=List[BusinessClientResponse],
    dependencies=[Depends(require_roles([RoleEnum.OWNER.value, RoleEnum.ACCOUNT_STAFF.value]))],
)
def list_business_clients(
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Owner/Finance: directory of corporate business clients."""
    return service.list_business_clients(db, is_active=is_active, search=search)


@business_clients_router.get("/me", response_model=BusinessClientResponse)
def get_my_business_client_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Business Client: retrieve own organization profile."""
    client = service.get_business_client_by_user_id(db, current_user.id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business client profile linked to this user account.",
        )
    return client


@business_clients_router.get("/me/invoices", response_model=List[InvoiceResponse])
def get_my_business_client_invoices(
    invoice_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Business Client: list own organization's invoices."""
    client = service.get_business_client_by_user_id(db, current_user.id)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business client profile linked to this user account.",
        )
    invoices = service.list_invoices(db, business_client_id=client.id, invoice_status=invoice_status)
    results = []
    for inv in invoices:
        resp = InvoiceResponse.model_validate(inv)
        resp.outstanding_amount = max(Decimal("0.00"), inv.total_amount - inv.amount_paid)
        results.append(resp)
    return results


@business_clients_router.get("/{client_id}", response_model=BusinessClientResponse)
def get_business_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Owner or linked business client: view organization profile."""
    user_roles = [r.name for r in current_user.roles]
    client = service.get_business_client_by_id(db, client_id)

    if RoleEnum.OWNER.value in user_roles or (client.user_id and client.user_id == current_user.id):
        return client

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unauthorized to access this business client profile.",
    )


@business_clients_router.put(
    "/{client_id}",
    response_model=BusinessClientResponse,
    dependencies=[Depends(require_roles([RoleEnum.OWNER.value, RoleEnum.ACCOUNT_STAFF.value]))],
)
def update_business_client(
    client_id: UUID,
    client_in: BusinessClientUpdate,
    db: Session = Depends(get_db),
):
    """Owner: update corporate client contact details, address, or tax ID."""
    return service.update_business_client(db, client_id, client_in)


# ---------------------------------------------------------------------------
# Invoice Endpoints
# ---------------------------------------------------------------------------
@invoices_router.post(
    "",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_invoice(
    invoice_in: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(FINANCE_STAFF_ROLES)),
):
    """Staff/Owner: issue an invoice for orders, subscriptions, or corporate clients."""
    inv = service.create_invoice(db, invoice_in, current_user)
    resp = InvoiceResponse.model_validate(inv)
    resp.outstanding_amount = max(Decimal("0.00"), inv.total_amount - inv.amount_paid)
    return resp


@invoices_router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    invoice_status: Optional[str] = None,
    business_client_id: Optional[UUID] = None,
    member_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List invoices:
    - Staff / Owner view all invoices.
    - Members view only their own invoices.
    - Business Clients view only their own organization's invoices.
    """
    user_roles = [r.name for r in current_user.roles]

    if any(role in user_roles for role in FINANCE_STAFF_ROLES):
        invoices = service.list_invoices(
            db,
            business_client_id=business_client_id,
            member_id=member_id,
            invoice_status=invoice_status,
        )
    elif RoleEnum.BUSINESS_CLIENT.value in user_roles:
        client = service.get_business_client_by_user_id(db, current_user.id)
        if not client:
            return []
        invoices = service.list_invoices(db, business_client_id=client.id, invoice_status=invoice_status)
    elif RoleEnum.MEMBER.value in user_roles and current_user.member_profile:
        invoices = service.list_invoices(
            db,
            member_id=current_user.member_profile.id,
            invoice_status=invoice_status,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to view invoices.",
        )

    results = []
    for inv in invoices:
        resp = InvoiceResponse.model_validate(inv)
        resp.outstanding_amount = max(Decimal("0.00"), inv.total_amount - inv.amount_paid)
        results.append(resp)
    return results


@invoices_router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve invoice details with strict object-level ownership check."""
    inv = service.get_invoice_by_id(db, invoice_id)
    user_roles = [r.name for r in current_user.roles]

    if any(role in user_roles for role in FINANCE_STAFF_ROLES):
        resp = InvoiceResponse.model_validate(inv)
        resp.outstanding_amount = max(Decimal("0.00"), inv.total_amount - inv.amount_paid)
        return resp

    if (
        RoleEnum.BUSINESS_CLIENT.value in user_roles
        and inv.business_client
        and inv.business_client.user_id == current_user.id
    ):
        resp = InvoiceResponse.model_validate(inv)
        resp.outstanding_amount = max(Decimal("0.00"), inv.total_amount - inv.amount_paid)
        return resp

    if (
        RoleEnum.MEMBER.value in user_roles
        and current_user.member_profile
        and inv.member_id == current_user.member_profile.id
    ):
        resp = InvoiceResponse.model_validate(inv)
        resp.outstanding_amount = max(Decimal("0.00"), inv.total_amount - inv.amount_paid)
        return resp

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unauthorized to access this invoice.",
    )


@invoices_router.get("/{invoice_id}/balance", response_model=InvoiceBalanceResponse)
def get_invoice_balance(
    invoice_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check authoritative invoice balance and settlement status."""
    inv = service.get_invoice_by_id(db, invoice_id)
    # Re-verify derived amount_paid from authoritative allocation ledger
    current_paid = service._compute_invoice_ledger_amount_paid(db, inv.id)
    outstanding = max(Decimal("0.00"), inv.total_amount - current_paid)

    return InvoiceBalanceResponse(
        invoice_id=inv.id,
        invoice_number=inv.invoice_number,
        currency=inv.currency,
        total_amount=inv.total_amount,
        amount_paid=current_paid,
        outstanding_amount=outstanding,
        invoice_status=inv.invoice_status,
    )


@invoices_router.post(
    "/{invoice_id}/cancel",
    response_model=InvoiceResponse,
)
def cancel_invoice(
    invoice_id: UUID,
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.OWNER.value)),
):
    """Owner: cancel invoice if no active payment allocations exist."""
    inv = service.cancel_invoice(db, invoice_id, current_user, reason=reason)
    resp = InvoiceResponse.model_validate(inv)
    resp.outstanding_amount = max(Decimal("0.00"), inv.total_amount - inv.amount_paid)
    return resp


# ---------------------------------------------------------------------------
# Payment Endpoints
# ---------------------------------------------------------------------------
@payments_router.post(
    "",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def record_payment(
    payment_in: PaymentCreate,
    customer_name: Optional[str] = Query("Champions Club Patron"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(FINANCE_STAFF_ROLES)),
):
    """Staff/Owner: record cash, UPI, card, or bank transfer receipt into club accounts."""
    pmt = service.record_payment(db, payment_in, current_user, customer_name=customer_name)
    net_allocated, unallocated = service._compute_payment_balances(db, pmt.id)
    resp = PaymentResponse.model_validate(pmt)
    resp.allocated_amount = net_allocated
    resp.unallocated_amount = unallocated
    return resp


@payments_router.get("", response_model=List[PaymentResponse])
def list_payments(
    payment_status: Optional[str] = None,
    payment_method: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(FINANCE_STAFF_ROLES)),
):
    """Staff/Owner: list recorded payment transactions."""
    payments = service.list_payments(db, payment_status=payment_status, payment_method=payment_method)
    results = []
    for p in payments:
        net_allocated, unallocated = service._compute_payment_balances(db, p.id)
        resp = PaymentResponse.model_validate(p)
        resp.allocated_amount = net_allocated
        resp.unallocated_amount = unallocated
        results.append(resp)
    return results


@payments_router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(FINANCE_STAFF_ROLES)),
):
    """Staff/Owner: get payment details."""
    pmt = service.get_payment_by_id(db, payment_id)
    net_allocated, unallocated = service._compute_payment_balances(db, pmt.id)
    resp = PaymentResponse.model_validate(pmt)
    resp.allocated_amount = net_allocated
    resp.unallocated_amount = unallocated
    return resp


@payments_router.post(
    "/{payment_id}/allocations",
    response_model=AllocationResponse,
    status_code=status.HTTP_201_CREATED,
)
def allocate_payment(
    payment_id: UUID,
    alloc_in: AllocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(FINANCE_STAFF_ROLES)),
):
    """
    Staff/Owner: allocate a payment towards an invoice.
    Enforces row-level locks, prevents overpayment, and synchronizes invoice status.
    """
    alloc = service.allocate_payment(db, payment_id, alloc_in, current_user)
    rev_sum = sum((r.amount for r in alloc.reversals), Decimal("0.00"))
    resp = AllocationResponse.model_validate(alloc)
    resp.net_allocated_amount = alloc.allocated_amount - rev_sum
    return resp


@payments_router.get(
    "/{payment_id}/allocations",
    response_model=List[AllocationResponse],
    dependencies=[Depends(require_roles(FINANCE_STAFF_ROLES))],
)
def list_payment_allocations(
    payment_id: UUID,
    db: Session = Depends(get_db),
):
    """Staff/Owner: view allocation statement distributing this payment across invoices."""
    pmt = service.get_payment_by_id(db, payment_id)
    results = []
    for a in pmt.allocations:
        rev_sum = sum((r.amount for r in a.reversals), Decimal("0.00"))
        resp = AllocationResponse.model_validate(a)
        resp.net_allocated_amount = a.allocated_amount - rev_sum
        results.append(resp)
    return results


@payments_router.post(
    "/{payment_id}/refund",
    response_model=RefundResponse,
    status_code=status.HTTP_201_CREATED,
)
def refund_payment(
    payment_id: UUID,
    refund_in: RefundCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.OWNER.value)),
):
    """Owner: process an immutable refund against unallocated payment balance."""
    return service.refund_payment(db, payment_id, refund_in, current_user)


# ---------------------------------------------------------------------------
# Allocation Reversal Endpoints
# ---------------------------------------------------------------------------
@allocations_router.post(
    "/{allocation_id}/reverse",
    response_model=AllocationReversalResponse,
    status_code=status.HTTP_201_CREATED,
)
def reverse_allocation(
    allocation_id: UUID,
    rev_in: AllocationReversalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.OWNER.value)),
):
    """Owner: reverse an allocation partially or completely, restoring invoice balance."""
    return service.reverse_allocation(db, allocation_id, rev_in, current_user)


# ---------------------------------------------------------------------------
# Receipt Endpoints
# ---------------------------------------------------------------------------
@receipts_router.get(
    "",
    response_model=List[ReceiptResponse],
    dependencies=[Depends(require_roles(FINANCE_STAFF_ROLES))],
)
def list_receipts(db: Session = Depends(get_db)):
    """Staff/Owner: list official payment receipts."""
    return service.list_receipts(db)


@receipts_router.get("/{receipt_id}", response_model=ReceiptResponse)
def get_receipt(
    receipt_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve receipt details."""
    receipt = service.get_receipt_by_id(db, receipt_id)
    # Allow staff or authenticated user
    return receipt
