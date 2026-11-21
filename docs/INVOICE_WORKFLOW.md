# Champions Club — Invoice Workflow & Integration (Milestone E)

This document details the invoice lifecycle, billing sources, customer integrity rules, and synchronization with Pro-Shop orders and Membership subscriptions.

---

## 1. Invoice Sources & Customer Integrity

Every Invoice (`invoices`) strictly defines its source obligation and primary debtor:

### 1.1 Source Obligations
1. **Pro-Shop / Cafeteria Order (`order_id`):**
   - Strictly copies `subtotal`, `discount_amount`, `tax_amount`, and `total_amount` from the existing `orders` row.
   - Preserves historical order item snapshots without re-querying current product prices.
2. **Membership Subscription (`subscription_id`):**
   - Strictly copies `subscription.price_paid`.
3. **Direct Custom / Corporate Invoice:**
   - Created with custom line items (`invoice_items`) specifying description, quantity, unit price, discounts, and taxes.

> [!IMPORTANT]
> An invoice can never simultaneously reference both an `order_id` and a `subscription_id`.

### 1.2 Customer Identification
Every invoice must have exactly one primary customer representation:
- `business_client_id` (corporate debtor)
- `member_id` (registered club member)
- `walk_in_name` & `walk_in_phone` (front-desk walk-in patron)

---

## 2. Invoice Lifecycle

```text
       ┌───────────────┐
       │ POST /invoices│
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │    issued     │ (amount_paid = 0, outstanding = total)
       └───────┬───────┘
               │
       ┌───────┴───────────────────────────────┐
       ▼                                       ▼
┌──────────────┐                       ┌──────────────┐
│partially_paid│                       │     paid     │
│(0 < paid < T)│                       │(paid >= total│
└──────┬───────┘                       └──────┬───────┘
       │                                      │
       └───────────────────┬──────────────────┘
                           │ (on allocation reversal)
                           ▼
                   ┌──────────────┐
                   │    revert    │
                   │(issued/part.)│
                   └──────────────┘
```

---

## 3. Financial Synchronization with Business Modules

### 3.1 Pro-Shop & Cafeteria Orders
- Fulfilling or serving an order sets `order_status = 'completed'` or `'served'`, but leaves `payment_status = 'unpaid'`.
- Generating an invoice links the order to the financial domain.
- Allocating a payment to the invoice updates `invoice.amount_paid`. When `invoice.invoice_status` becomes `'paid'`, it automatically synchronizes `order.payment_status = 'paid'`.

### 3.2 Membership Subscriptions
- Subscriptions are purchased with `payment_status = 'unpaid'`.
- When an invoice is created and fully settled by an allocated payment, the service updates `subscription.payment_status = 'paid'`.
