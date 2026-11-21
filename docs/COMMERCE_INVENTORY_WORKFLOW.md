# Champions Club — Commerce, Shared Inventory & Cafeteria Operations (Milestone D)

This document details the architectural design, concurrency controls, ledger structures, and operational workflows for the Pro-Shop, Shared Inventory, and Cafeteria subsystems implemented in Milestone D of the Champions Club Sports Club Management System.

---

## 1. Executive Summary & Core Design Principle

The defining architectural principle of Milestone D is the **Single Authoritative Source of Truth for Inventory**:
> **Shop counter POS sales, online member shop orders, and cafeteria food/beverage operations consume the exact same underlying physical inventory.**
> 
> A product's stock is never partitioned into artificial silos (e.g. "online quota" vs "counter stock"). Stock is strictly non-negative (`CHECK (current_stock >= 0)`), and every stock modification is recorded in an immutable audit ledger (`inventory_movements`) within the same ACID database transaction.

```text
  ┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
  │   Shop Counter POS     │      │   Online Member Shop   │      │   Cafeteria & Bar      │
  │  (Walk-in / Member)    │      │    (Self-Service)      │      │  (Walk-in / Table)     │
  └───────────┬────────────┘      └───────────┬────────────┘      └───────────┬────────────┘
              │                               │                               │
              ▼                               ▼                               ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │                           FastAPI Order Service Layer                                  │
  │  1. Deterministic lock ordering (sort by product UUID) to eliminate deadlocks          │
  │  2. Member subscription discount resolution (Shop discount vs Bar discount)            │
  │  3. Authoritative server-side price & configurable tax calculation                     │
  │  4. Strict stock sufficiency verification (current_stock >= requested_qty)             │
  └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                              │
                                              ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │                        PostgreSQL Engine (ACID Transaction)                            │
  │  - SELECT ... FROM products WHERE id IN (...) FOR UPDATE                               │
  │  - INSERT INTO orders (order_number, total_amount, order_status, payment_status, ...)   │
  │  - INSERT INTO order_items (price, discount, tax snapshots)                            │
  │  - UPDATE products SET current_stock = current_stock - qty                             │
  │  - INSERT INTO inventory_movements (product_id, 'sale', -qty, resulting_stock, ...)    │
  │  - INSERT INTO order_status_history (previous_status, new_status, ...)                 │
  └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Product Categories & Catalog Architecture

### 2.1 Product Categories (`product_categories`)
- Provides categorization for sports equipment, apparel, footwear, accessories, meals, snacks, and beverages.
- Identified by `module_type`: `'shop'` (Pro-Shop catalog) or `'cafeteria'` (Cafeteria & Bar menu).
- Category deletion is strictly prevented if referenced by existing products (`ondelete="RESTRICT"`). Categories can be safely deactivated (`is_active = False`).

### 2.2 Product Catalog (`products`)
- **Key Attributes:**
  - `unit_price`: Base price before discounts and taxes (`Numeric(10, 2)` non-negative).
  - `tax_rate`: Configurable tax rate percentage (`Numeric(5, 2)` between 0.00% and 100.00%).
  - `discount_eligible`: Boolean flag controlling whether membership plan discounts apply.
  - `inventory_tracked`: Boolean flag indicating whether physical stock is tracked. (Service items or perishable freshly prepared dishes can be non-tracked).
  - `current_stock`: Authoritative physical stock count (`Integer >= 0`).
  - `reorder_threshold`: Minimum stock level alerting staff to low inventory.
- **Invariants:**
  - Inactive products (`is_active = False`) cannot be purchased.
  - Non-inventory products do not decrement stock or produce phantom movements.

---

## 3. Shared Inventory & Movement Ledger

Every change in stock—without exception—is recorded in the `inventory_movements` table.

### 3.1 Movement Types & Quantities
| Movement Type | Quantity Direction | Triggering Business Event |
|---|---|---|
| `initial_stock` | Positive (`+N`) | Initial product onboarding with stock > 0 |
| `restock` | Positive (`+N`) | Supplier delivery / inventory replenishment |
| `sale` | Negative (`-N`) | POS sale, online order checkout, cafeteria purchase |
| `adjustment` | Positive/Negative (`±N`) | Periodic physical stock reconciliation |
| `shrinkage` | Negative (`-N`) | Damaged, expired, or stolen goods write-off |
| `cancellation_restore` | Positive (`+N`) | Cancelled pending order stock return |

### 3.2 Audit Integrity
- Every movement captures: `product_id`, `movement_type`, `quantity_change`, `resulting_stock`, `performed_by_id`, optional `order_id`, and `reason`.
- Check constraint `chk_movement_resulting_stock_non_negative` guarantees physical impossibility of negative resulting inventory.
- Product updates and movement insertions occur in the **same database transaction**: if either fails, both roll back.

---

## 4. Concurrency Protection & Deadlock Elimination

High-volume operations (e.g. multiple POS terminals and online shoppers ordering simultaneously) present two concurrency risks:

### 4.1 Overselling Prevention (`with_for_update`)
When an order is placed:
```python
stmt = select(Product).where(Product.id == prod_id).with_for_update()
product = db.scalars(stmt).first()
```
The PostgreSQL row lock guarantees that competing transactions queue. The second transaction reads the updated stock committed by the first transaction, preventing double-selling of the last item.

### 4.2 Deadlock Prevention via Deterministic Lock Ordering
When an order contains multiple items (e.g. Product A and Product B), two concurrent transactions could deadlock if Transaction 1 locks A then B, while Transaction 2 locks B then A.
To eliminate this risk, the backend sorts all requested products by UUID before acquiring locks:
```python
sorted_items = sorted(items_in, key=lambda x: str(x.product_id))
for item in sorted_items:
    # Acquire locks in globally consistent alphabetical order
    product = db.execute(select(Product).where(Product.id == item.product_id).with_for_update()).scalar_one()
```

---

## 5. Pricing, Membership Discounts & Tax Calculations

The backend **never trusts client-submitted financial figures**. All calculations are performed authoritatively server-side:

### 5.1 Membership Discount Rules
1. **Registered Members:** The service queries `MemberSubscription` for an active subscription (`subscription_status = 'active'` and `start_date <= today <= end_date`).
   - For **Shop Orders**: applies `sub.shop_discount_snapshot`.
   - For **Cafeteria Orders**: applies `sub.bar_discount_snapshot`.
   - Legacy members with no subscription history fall back to `member.plan` discounts.
   - Cancelled or expired subscriptions receive **0% discount**.
2. **Walk-in Customers:** Receive **0% discount**.
3. **Product Discount Eligibility:** If `product.discount_eligible = False`, discount is 0% regardless of membership tier.

### 5.2 Line Item Financial Formulas
$$\text{line\_gross} = \text{round}(\text{unit\_price} \times \text{quantity}, 2)$$
$$\text{line\_discount} = \text{round}\left(\text{line\_gross} \times \frac{\text{discount\_pct}}{100}, 2\right)$$
$$\text{line\_net} = \text{line\_gross} - \text{line\_discount}$$
$$\text{line\_tax} = \text{round}\left(\text{line\_net} \times \frac{\text{tax\_rate}}{100}, 2\right)$$
$$\text{line\_total} = \text{line\_net} + \text{line\_tax}$$

### 5.3 Immutable Historical Snapshots
Line items preserve:
`product_name_snapshot`, `sku_snapshot`, `unit_price_snapshot`, `discount_percent_snapshot`, `discount_amount_snapshot`, `tax_rate_snapshot`, `tax_amount_snapshot`, `line_subtotal`, and `line_total`.
Future price changes, tax adjustments, or membership renewals never alter historical orders.

---

## 6. Order Lifecycles & State Transitions

### 6.1 Pro-Shop Order Lifecycle
- **Counter POS Sale:** Completed immediately at checkout (`order_status = 'completed'`, stock decremented).
- **Online Member Order:** Created as `order_status = 'pending'`.
  - Member may cancel their order while still in `'pending'` status.
  - Cancellation immediately restores stock via `cancellation_restore` and transitions order to `'cancelled'`.
  - Completed orders cannot be cancelled by members.

### 6.2 Cafeteria Kitchen State Machine
Cafeteria orders track kitchen preparation via strict validated transitions:
```text
            ┌──────────────┐
            │   pending    │
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │  preparing   │
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │    ready     │
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │    served    │ (completed_at stamped)
            └──────────────┘
```
- Arbitrary jumps (e.g. `pending` $\rightarrow$ `served`) are rejected with HTTP 400 Bad Request.
- Orders in `pending` or `preparing` can be cancelled by staff, restoring any tracked inventory items.

---

## 7. Role-Based Access Control (RBAC) Matrix

| Endpoint Group | Allowed Roles | Restrictions / Notes |
|---|---|---|
| **Public Catalog & Menu** | Unauthenticated, All Roles | Sensitive inventory counts & internal thresholds hidden from public/members. |
| **Product & Category CRUD** | `owner`, `shop_staff` | Only authorized staff may configure products, prices, and tax rates. |
| **Inventory Adjust & Restock** | `owner`, `shop_staff` | All actions audited with user identity and rationale. HR/Receptionist blocked. |
| **Shop POS Orders** | `owner`, `shop_staff` | Can create orders for walk-ins (null member) or members. |
| **Online Shop Orders** | `member` | Self-service only. Backend enforces `member_id == current_user.member_profile.id`. |
| **Order History & Details** | `owner`, `shop_staff` (all), `member` (own only) | Strict object-level ownership check. Members cannot inspect other customers' orders. |
| **Cafeteria Orders & Status** | `owner`, `receptionist`, `shop_staff` | Receptionists and shop staff can manage kitchen queue and status transitions. |

---

## 8. Milestone E Payment Integration Boundary

Milestone D deliberately decouples **Order Lifecycle Status** from **Payment Status**:
- `order_status`: Represents fulfillment/kitchen operational state (`pending`, `confirmed`, `completed`, `preparing`, `ready`, `served`, `cancelled`).
- `payment_status`: Represents financial settlement state (`unpaid`, `partially_paid`, `paid`).
- All orders currently initialize as `payment_status = "unpaid"`. No fake payment records or dummy gateways are created.
- In Milestone E, payments, cash registers, invoices, and ledger settlements will link to `orders.id` via foreign key without disrupting inventory or kitchen workflows.
