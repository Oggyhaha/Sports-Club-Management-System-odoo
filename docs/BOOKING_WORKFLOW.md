# Champions Club — Court Booking & Reception Workflows (Milestone C)

This document provides complete architectural, mathematical, and procedural documentation for the Court Booking and Reception workflows implemented in Milestone C of the Champions Club Sports Club Management System.

---

## 1. Executive Summary & Architecture Overview

The Court Booking Engine operates as a high-integrity, ACID-compliant temporal reservation system. It orchestrates physical court inventory, membership tier privileges, daily booking quotas, walk-in customer pricing, real-time availability calculations, and community Friday Social Play sessions.

```text
                                 ┌──────────────────────────────┐
                                 │   FastAPI Booking Router     │
                                 │ (/api/v1/bookings & courts)  │
                                 └──────────────┬───────────────┘
                                                │ Request DTOs
                                                ▼
                                 ┌──────────────────────────────┐
                                 │  Validation Layer (Pydantic) │
                                 │  - Slot bounds (06:00-22:00) │
                                 │  - 30-min boundary rule      │
                                 │  - Duration derivation (60m) │
                                 └──────────────┬───────────────┘
                                                │
                                                ▼
                                 ┌──────────────────────────────┐
                                 │     Booking Service Layer    │
                                 │  - Member quota locking      │
                                 │  - Court collision locking   │
                                 │  - Dynamic fee calculation   │
                                 └──────────────┬───────────────┘
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        ▼                                               ▼
         ┌──────────────────────────────┐                ┌──────────────────────────────┐
         │     Member Reservation       │                │      Walk-in Reservation     │
         │  - Member row FOR UPDATE     │                │  - No quota enforcement      │
         │  - 2 active bookings/day cap │                │  - Charges court walk_in_rate│
         │  - Membership court discount │                │  - Contact info captured     │
         └──────────────┬───────────────┘                └──────────────┬───────────────┘
                        │                                               │
                        └───────────────────────┬───────────────────────┘
                                                │
                                                ▼
                                 ┌──────────────────────────────┐
                                 │   PostgreSQL Engine (ACID)   │
                                 │  - SELECT court FOR UPDATE   │
                                 │  - Conflict overlap check    │
                                 │  - Social session check      │
                                 │  - Immutable calculated_fee  │
                                 └──────────────────────────────┘
```

---

## 2. Core Booking Rules & Validation Invariants

Every court reservation strictly enforces five operational invariants before any transaction commit:

### 2.1 Standard 60-Minute Duration
- All regular bookings span exactly 60 minutes (`3600` seconds).
- The end time is automatically derived: `end_time = start_time + timedelta(minutes=60)`.
- If a client supplies an explicit `end_time` differing from `start_time + 60 minutes`, HTTP 422 Unprocessable Entity is raised.

### 2.2 30-Minute Boundary Alignment
- Bookings must commence on either the hour (:00) or half-hour (:30).
- Formulas: `start_time.minute in (0, 30)` and `start_time.second == 0` and `start_time.microsecond == 0`.
- Arbitrary start times (e.g. 06:15 or 14:45) are rejected with HTTP 422.

### 2.3 Operating Hours Window (06:00 to 22:00)
- Facility doors open at 06:00 local club time (UTC) and close at 22:00.
- A booking may begin as early as 06:00 and as late as 21:00 (completing at 22:00).
- Any reservation beginning before 06:00 or completing after 22:00 is rejected with HTTP 422.

### 2.4 Strict Daily Booking Quota (2 Active Bookings Per Member Per Day)
- To prevent court hoarding, each registered member is limited to a maximum of **2 active bookings per calendar day**.
- A calendar day is evaluated in the date boundary of the booking start time (`[start_of_day, end_of_day)`).
- Bookings with `status = 'cancelled'` are strictly excluded from quota calculation, liberating quota immediately upon cancellation.
- Exceeding the quota triggers HTTP 409 Conflict with details: `"Daily booking quota reached (maximum 2 active bookings per day)."`.
- Walk-in customers (`member_id = None`) are exempt from member quota restrictions.

### 2.5 Temporal Non-Overlap Invariant
- A single court cannot host concurrent activities.
- An overlap occurs whenever:
  $$\text{Existing.start\_time} < \text{New.end\_time} \quad \land \quad \text{Existing.end\_time} > \text{New.start\_time}$$
- Overlap detection checks both:
  1. Other active court bookings (`status = 'confirmed'`).
  2. Scheduled Friday Social Play sessions (`status != 'cancelled'`).
- Violations raise HTTP 409 Conflict.

---

## 3. Concurrency Locking Mechanics

To prevent double bookings and race conditions when concurrent requests hit identical courts or quotas, the service employs **PostgreSQL Row-Level Locking (`FOR UPDATE`)**:

### 3.1 Court Row-Level Lock
```python
# Synchronize all transactions competing for the target court
court = db.execute(
    select(Court).where(Court.id == court_id).with_for_update()
).scalar_one_or_none()
```
- Acquiring a write lock on the `Court` row serializes competing booking attempts for that specific court within the same transaction scope.
- Subsequent overlap queries run with guaranteed consistency, precluding phantom slot reservations.

### 3.2 Member Row-Level Lock (Quota Serialization)
```python
# Synchronize all transactions competing for the member's daily quota
member = db.execute(
    select(Member).where(Member.id == member_id).with_for_update()
).scalar_one_or_none()
```
- Locking the `Member` row serializes simultaneous booking attempts by the same member across different courts or parallel browser tabs.
- Prevents race conditions where two simultaneous requests could each see `count == 1` and simultaneously commit, creating 3 daily bookings.

> [!NOTE]
> PostgreSQL forbids `FOR UPDATE` on nullable tables in an outer join. The locking queries are kept isolated (`select(Model).where(...).with_for_update()`) without eager joins, loading relational data separately.

---

## 4. Pricing & Discount Matrix

### 4.1 Member Pricing Formula
When a registered member reserves a court:
1. Base rate is taken from `court.hourly_rate`.
2. Active membership plan discount (`member.plan.court_discount_percent`) is fetched.
3. Fee calculation:
   $$\text{Fee} = \text{round}\left(\text{court.hourly\_rate} \times \left(1 - \frac{\text{discount\_percent}}{100}\right), 2\right)$$
4. The calculated fee is immutably stored in `bookings.calculated_fee`.

### 4.2 Walk-in Pricing Formula
When a walk-in customer reserves a court via reception:
1. `member_id` is stored as `NULL`.
2. Customer details (`walk_in_name` and `walk_in_phone`) are recorded.
3. Base rate prefers `court.walk_in_rate`. If `walk_in_rate` is not configured, it falls back to `court.hourly_rate`.
4. No membership discount applies (discount = 0%):
   $$\text{Fee} = \text{court.walk\_in\_rate} \quad (\text{or } \text{court.hourly\_rate})$$
5. The fee is immutably stored in `bookings.calculated_fee`.

### 4.3 Historical Fee Preservation
- Once created, a booking's `calculated_fee` is permanently preserved.
- Future changes to court hourly rates, walk-in rates, or member plan discounts never alter historical booking records.

---

## 5. Real-Time Court Availability Engine

Endpoint: `GET /api/v1/bookings/availability?date=YYYY-MM-DD[&court_id=UUID][&sport_type=STRING]`

### 5.1 Slot Derivation Algorithm
1. The requested date is bounded between `06:00:00` and `22:00:00` (UTC).
2. Continuous 60-minute candidate windows are generated on 30-minute steps:
   - 06:00 - 07:00
   - 06:30 - 07:30
   - 07:00 - 08:00
   - ...
   - 21:00 - 22:00 (Total of 31 candidate slots per court per day).
3. Active bookings for each court on the date are fetched (`status = 'confirmed'`).
4. Scheduled social play sessions on the date for each court are fetched (`status != 'cancelled'`).
5. A slot is marked `available: false` if any active booking or social play session overlaps with its window.
6. The API returns court details and an array of slot objects:
   ```json
   {
     "court_id": "...",
     "court_name": "Court 1",
     "sport_type": "tennis",
     "hourly_rate": 40.0,
     "walk_in_rate": 50.0,
     "date": "2026-11-27",
     "slots": [
       {
         "start_time": "2026-11-27T06:00:00Z",
         "end_time": "2026-11-27T07:00:00Z",
         "available": true,
         "conflict_reason": null
       }
     ]
   }
   ```

---

## 6. Friday Social Play Subsystem

To foster club community, Champions Club supports communal Friday Social Play sessions.

### 6.1 Session Model & Rules
- **Day of Week:** Only scheduled on Fridays (`start_time.weekday() == 4`). Attempting to create on any other day yields HTTP 422.
- **Dedicated Court:** Held on a specific court. That court becomes unavailable for regular bookings during the session window.
- **Capacity Bounds:** Has a configured `max_participants` (e.g. 12 players).
- **Price:** Has an entry fee `price_per_participant` (e.g. 10.00).

### 6.2 Participant Atomic Join & Concurrency
- Endpoint: `POST /api/v1/bookings/social-sessions/{id}/join`
- **Locking:** The session row is locked using `with_for_update()`.
- **Capacity Check:** Active participant count (`left_at IS NULL`) is checked against `max_participants`. If full, HTTP 409 Conflict is returned (`"Social play session is full"`).
- **Duplicate Prevention:** If the member is already an active participant, HTTP 409 Conflict is returned (`"Member has already joined this session"`).
- **Re-joining:** If a member previously left (`left_at IS NOT NULL`), their existing record is reactivated (`left_at = None`).

### 6.3 Leaving and Cancellation
- **Leave:** `POST /api/v1/bookings/social-sessions/{id}/leave`. Sets `left_at = utcnow()`, immediately freeing capacity for another member.
- **Cancel:** `POST /api/v1/bookings/social-sessions/{id}/cancel`. Staff/Owner only. Marks session `status = 'cancelled'`, releasing the court for standard bookings.

---

## 7. Cancellation Lifecycle & Audit Trail

- Regular bookings can be cancelled via `POST /api/v1/bookings/{id}/cancel`.
- Role guards:
  - **Members** can only cancel their own bookings.
  - **Receptionist / Owner** can cancel any booking.
- Audit persistence:
  - Sets `booking.status = 'cancelled'`.
  - Stamps `booking.cancelled_at = datetime.now(timezone.utc)`.
- **Immediate Resource Release:**
  - The court slot is instantly released in `GET /availability`.
  - The member's daily quota count instantly decreases by 1.

---

## 8. Role-Based Access Control (RBAC) Summary

| Endpoint | Method | Permitted Roles | Notes |
|---|---|---|---|
| `/bookings` | GET | All Authenticated | Members see only their own bookings; Staff/Owner see all. |
| `/bookings` | POST | Member, Receptionist, Owner | Members book for self; Staff can book for walk-ins or any member. |
| `/bookings/{id}` | GET | Member, Receptionist, Owner | Members can view only their own bookings; Staff/Owner can view any. |
| `/bookings/{id}/cancel` | POST | Member, Receptionist, Owner | Members can cancel only their own; Staff/Owner can cancel any. |
| `/bookings/availability` | GET | Public / All Authenticated | Open access for live court scheduling. |
| `/bookings/social-sessions` | GET | Public / All Authenticated | Open directory of scheduled community sessions. |
| `/bookings/social-sessions` | POST | Receptionist, Owner | Staff-scheduled Friday community events. |
| `/bookings/social-sessions/{id}/join` | POST | Member, Receptionist, Owner | Enforces atomic capacity locks. |
| `/bookings/social-sessions/{id}/leave` | POST | Member, Receptionist, Owner | Frees capacity slot immediately. |
| `/bookings/social-sessions/{id}/cancel` | POST | Receptionist, Owner | Cancels session and releases court. |
