# Champions Club — Payment & Allocation Workflow (Milestone E)

This document explains the payment recording, allocation distribution, amount-based reversals, and refund lifecycle implemented in Milestone E.

---

## 1. Payment Lifecycle

```text
       ┌───────────────┐
       │ POST /payments│
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │  successful   │ ──► [Auto-generates PaymentReceipt (REC-YYYYMMDD-XXXX)]
       └───────┬───────┘
               │
       ┌───────┴───────────────────────────────┐
       ▼                                       ▼
┌──────────────┐                       ┌──────────────┐
│  Allocations │                       │   Refunds    │
│(to Invoices) │                       │ (Unallocated)│
└──────┬───────┘                       └──────────────┘
       │
       ▼
┌──────────────┐
│  Reversals   │
│(Amount-based)│
└──────────────┘
```

### 1.1 Payment Recording
- **Endpoint:** `POST /api/v1/payments`
- **Supported Methods:** `cash`, `upi`, `card`, `bank_transfer`, `other`.
- **Idempotency Protection:** Clients can submit an `idempotency_key`. If the same key is submitted again (e.g. on network retry or double-click), the existing payment record is returned safely without duplicate charges.
- **Single Receipt Generation:** When a payment is recorded in `successful` status, a `PaymentReceipt` is immediately created acknowledging the total money received.

---

## 2. Payment Allocations & Splitting

### 2.1 Multi-Invoice Allocation (e.g., Corporate Split Payments)
- **Endpoint:** `POST /api/v1/payments/{payment_id}/allocations`
- A single large payment (e.g. ₹50,000 corporate bank transfer) can be allocated across multiple invoices.
- **Allocation Rules:**
  - `amount > 0`
  - `amount <= unallocated_payment_balance`
  - `amount <= invoice_outstanding_balance`
- Over-allocation is prevented at the database level using `SELECT ... FOR UPDATE` locks.

---

## 3. Amount-Based Allocation Reversals

- **Endpoint:** `POST /api/v1/allocations/{allocation_id}/reverse`
- When an invoice charge is disputed or adjusted, staff can reverse an allocation partially or completely.
- Creates an immutable `PaymentAllocationReversal` row recording the reversed amount, reason, and authorizer ID.
- Restores the invoice's outstanding balance:
  $$\text{Invoice.amount\_paid} = \text{Invoice.amount\_paid} - \text{Reversal.amount}$$
- Reverts invoice and underlying order/subscription status from `paid` back to `partially_paid` or `issued`.

---

## 4. Payment Refunds

- **Endpoint:** `POST /api/v1/payments/{payment_id}/refund`
- Owner-only endpoint.
- Refunds can only be drawn from **unallocated payment funds**. If money has already been allocated to an invoice, the allocation must be reversed first.
- Updates payment status to `partially_refunded` or `refunded`.
- Creates an immutable `PaymentRefund` record. Original payment records are **never deleted**.
