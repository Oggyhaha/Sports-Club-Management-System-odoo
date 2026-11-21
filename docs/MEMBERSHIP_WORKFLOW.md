# Membership & Subscription Workflow Architecture

## 1. Domain Architecture Overview

Champions Club implements a dual-layer membership architecture that cleanly separates **authoritative historical transactions** from **high-performance operational projections**.

```text
┌──────────────────────┐
│   MembershipPlan     │  ◄── Defines tier pricing, discounts & durations (Owner-governed)
└──────────┬───────────┘
           │
           │ 1. Plan Snapshot at purchase
           ▼
┌──────────────────────┐        2. Synchronizes current state        ┌──────────────────────┐
│ MemberSubscription   │ ──────────────────────────────────────────► │        Member        │
│                      │                                             │                      │
│ - Historical terms   │                                             │ - Current plan_id    │
│ - Price snapshots    │                                             │ - Current start_date │
│ - Discount snapshots │                                             │ - Current expiry_date│
│ - Statuses (sub/pay) │                                             │ - is_active (bool)   │
└──────────────────────┘                                             └──────────┬───────────┘
                                                                                │
                                                                                │ 3. Applies current discount
                                                                                ▼
                                                                     ┌──────────────────────┐
                                                                     │       Booking        │
                                                                     │                      │
                                                                     │ - calculated_fee     │
                                                                     │   (Permanent/frozen) │
                                                                     └──────────────────────┘
```

---

## 2. Entity Relationships & Responsibilities

### A. `membership_plans` (Tier Definition)
- **Role:** The catalog of available membership tiers (e.g. Gold, Silver, Junior, Platinum).
- **Key Attributes:** `id`, `name`, `monthly_fee`, `court_discount_percent`, `shop_discount_percent`, `bar_discount_percent`, `duration_days`, `is_active`.
- **Governance:** Only users with the `owner` role may create or modify plans. Changes to plan pricing or discount rates never alter historical records.

### B. `member_subscriptions` (Authoritative Historical Log)
- **Role:** The immutable financial and contractual history of every subscription purchase, renewal, and tier change.
- **Key Attributes:** `id`, `member_id`, `plan_id`, `start_date`, `end_date`, `price_paid`, `plan_name_snapshot`, `duration_days_snapshot`, `court_discount_snapshot`, `shop_discount_snapshot`, `bar_discount_snapshot`, `subscription_status`, `payment_status`, `notes`, `created_at`, `cancelled_at`.
- **Snapshot Immutability:** When a subscription is recorded, all benefits and fees are copied into snapshot columns. Even if the owner later increases the tier fee from $100 to $200, the historic subscription preserves its original $100 price and discount rates.

### C. `members` (Operational Projection)
- **Role:** Represents the customer profile (walk-in or registered user) and holds the fast, denormalized current-membership projection:
  - `plan_id`: The current active tier.
  - `start_date` & `expiry_date`: Current validity window.
  - `is_active`: Operational active flag used by the booking engine.
  - `user_id`: Optional link to a login account (`users.id`). For front-desk walk-ins, `user_id = NULL`.
- **Synchronization:** Any subscription purchase, renewal, or plan change updates the `members` record atomically in the same database transaction.

### D. `bookings` (Pricing Integration)
- **Role:** Court reservations.
- **Dynamic Calculation:** When creating a booking, the fee is calculated dynamically using the member's current tier discount:
  $$\text{calculated\_fee} = \text{court.hourly\_rate} \times \left(1 - \frac{\text{court\_discount\_percent}}{100}\right)$$
- **Fee Preservation:** Once created, `calculated_fee` is permanently stored on the `bookings` record. If the member upgrades their plan the next day, previous bookings are never retroactively repriced.

---

## 3. Separation of Subscription and Payment Lifecycles

In accordance with strict financial accounting principles, subscription duration is decoupled from payment settlement:

| Lifecycle | Status Field | Allowed Values | Description |
| :--- | :--- | :--- | :--- |
| **Subscription Lifecycle** | `subscription_status` | `active`, `expired`, `cancelled` | Represents club access entitlement and validity dates. |
| **Payment Lifecycle** | `payment_status` | `unpaid`, `partially_paid`, `paid` | Tracks commercial settlement. Prepared for Milestone E (Invoices & Payments). |

A subscription may be `active` even if `unpaid` (e.g. corporate invoicing), or `paid` immediately at the reception desk.

---

## 4. Core Business Workflows

### 1. Subscription Purchase (`POST /api/v1/members/{member_id}/subscriptions`)
1. Acquires a row-level lock (`with_for_update()`) on `members` to prevent concurrent race conditions.
2. Validates that the plan exists, is active, and has configured `duration_days`.
3. Verifies that the member does not already possess an active subscription covering today.
4. Calculates `end_date = start_date + duration_days`.
5. Takes immutable snapshots of plan name, duration, discounts, and fee.
6. Atomically creates `member_subscriptions` record and synchronizes `members` current projection.

### 2. Subscription Renewal (`POST /api/v1/members/{member_id}/renew`)
1. Acquires row-level lock on `members`.
2. Inspects member's current `expiry_date`:
   - **Active Renewal (`expiry_date >= today`):** Extends continuous coverage without gaps:
     $$\text{start\_date} = \text{member.expiry\_date} + 1 \text{ day}$$
     $$\text{end\_date} = \text{start\_date} + \text{plan.duration\_days}$$
   - **Expired Renewal (`expiry_date < today`):** Resumes coverage from today:
     $$\text{start\_date} = \text{today}$$
     $$\text{end\_date} = \text{today} + \text{plan.duration\_days}$$
3. Creates new subscription record with current plan snapshots.
4. Atomically updates `member.expiry_date` and marks `member.is_active = True`.

### 3. Plan Change (`POST /api/v1/members/{member_id}/change-plan`)
1. Acquires row-level lock on `members`.
2. Locates any existing active subscription for this member.
3. Updates existing subscription:
   - `subscription_status = "cancelled"`
   - `cancelled_at = now()`
   - Appends audit note: `"[Superseded by plan change to {new_plan_name}]"`.
4. Creates new subscription record under the new plan tier starting from today.
5. Atomically updates `member.plan_id`, `member.start_date`, `member.expiry_date`, and `member.is_active = True`.

---

## 5. Security & Authorization Matrix

| Endpoint | Method | Role Allowed | Ownership Constraint |
| :--- | :--- | :--- | :--- |
| `/api/v1/members/plans` | GET | Public | None |
| `/api/v1/members/plans` | POST | Owner | None |
| `/api/v1/members/plans/{plan_id}` | PUT | Owner | None |
| `/api/v1/members/me` | GET | Member | Must be authenticated; returns linked profile |
| `/api/v1/members` | GET | Owner, Receptionist | Staff only |
| `/api/v1/members` | POST | Owner, Receptionist | Staff only |
| `/api/v1/members/{member_id}` | GET | Owner, Receptionist, Member | Members can only view their own record |
| `/api/v1/members/{member_id}` | PUT | Owner, Receptionist | Staff only |
| `/api/v1/members/{member_id}/subscriptions` | POST | Owner, Receptionist | Staff only |
| `/api/v1/members/{member_id}/subscriptions` | GET | Owner, Receptionist, Member | Members can only view their own subscriptions |
| `/api/v1/members/{member_id}/renew` | POST | Owner, Receptionist | Staff only |
| `/api/v1/members/{member_id}/change-plan` | POST | Owner, Receptionist | Staff only |
