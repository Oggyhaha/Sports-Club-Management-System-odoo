# Champions Club — One-Day Build Plan

## Goal
Build a small, demonstrable Sports Club Management System. As a solo beginner, prioritize a working member-to-court-booking workflow over breadth.

## Locked stack
Python, FastAPI, React, JavaScript, Vite, PostgreSQL, SQLAlchemy 2.x, Pydantic, Alembic, Uvicorn, Pytest, Postman, Git/GitHub. Tailwind CSS is preferred; simple CSS is a temporary fallback if setup blocks progress. Docker is optional. Redis, Celery and WebSockets are not needed for the core MVP.

## Architecture
**Modular monolith + layered separation.**

React UI → REST/JSON → FastAPI routes → Pydantic validation → service/business rules → SQLAlchemy → PostgreSQL.

One backend application organized into business modules. Do not use microservices for this one-day solo build.

## Pages in implementation order
1. **Dashboard:** member count, today's bookings, upcoming bookings. Revenue only if actual payment records exist.
2. **Members:** list/search members and open details.
3. **Add/Edit Member:** name, contact, plan, membership start/expiry, status.
4. **Courts:** list courts, status, and add court.
5. **Bookings:** date, court, member, available start time, price, create/cancel.
6. **Optional Shop:** only after core workflow works.
7. **Optional Cafeteria:** only after core workflow works.

## Backend implementation order
1. Health endpoint.
2. PostgreSQL connection and SQLAlchemy session.
3. Alembic and initial migration.
4. Membership plan/member models, schemas, services and routes.
5. Court models, schemas, services and routes.
6. Booking models, schemas, services, routes and conflict rules.
7. Dashboard summary endpoint.
8. Pytest tests for core rules.

## Initial database entities
- `membership_plans`: plan name and configurable pricing/discount fields.
- `members`: details, plan reference, start/end dates and status.
- `courts`: name/type/status.
- `bookings`: member, court, start/end, status, calculated amount and timestamps.

Relationships: one plan has many members; one member has many bookings; one court has many bookings. Add payments, products, sales, cafeteria orders, enquiries and audit logs only if those features are actually implemented.

## Booking rules
- Session duration: 60 minutes.
- Start times align to 30-minute intervals.
- Maximum two active bookings per member per local calendar day.
- No overlapping active bookings on the same court.
- Cancelled bookings do not block a slot.
- Backend calculates end time.
- Validate member, court, membership eligibility and pricing on backend.
- Protect against concurrent booking races with database-level constraints/transactions where practical. An application-only check-then-insert can race; disclose any MVP limitation.
- Social/shared-court play is a stretch feature because it changes capacity/participant rules.

## Suggested repository structure
```text
champions-club/
├── .agents/skills/champions-club-builder/SKILL.md
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/{config.py,database.py}
│   │   └── modules/
│   │       ├── members/
│   │       ├── courts/
│   │       └── bookings/
│   ├── alembic/
│   ├── tests/
│   └── requirements.txt
├── frontend/src/{components,layouts,pages,services,App.jsx,main.jsx}
├── docs/FILE_MAP.md
├── .env.example
├── .gitignore
├── README.md
└── PROJECT_PLAN.md
```
Create files only when their stage begins; do not create empty scaffolding.

## Suggested one-day time budget
| Time | Target |
|---|---|
| 0:00–0:30 | Inspect repo, scaffold |
| 0:30–1:15 | FastAPI health endpoint and PostgreSQL connection |
| 1:15–2:15 | Models, migration, member APIs |
| 2:15–2:45 | Court APIs |
| 2:45–4:15 | Booking engine and tests |
| 4:15–5:45 | React layout, members and courts pages |
| 5:45–6:45 | Booking UI and integration |
| 6:45–7:30 | Dashboard and styling |
| 7:30–8:00 | Full demo test, README and commits |

Adapt this to the actual hackathon duration. If time is short, cut stretch features and visual polish before cutting booking validation.

## Design direction
- Responsive admin dashboard with sidebar, top bar and content area.
- Neutral background, white surfaces, one primary accent.
- Green for success/available, amber for warning/pending, red for conflict/error.
- Clear typography, consistent spacing, accessible labels and focus states.
- Tables for members/bookings; cards for summary metrics.
- Every data page needs loading, empty, error and success states.
- No decorative chart without real data.

## MVP definition of done
A user can start backend and frontend, view dashboard, create/view a member, create/view a court, create a booking, see an overlapping booking rejected, cancel a booking, and explain the React → API → service/SQLAlchemy → PostgreSQL flow.

## Judge preparation
Maintain `docs/FILE_MAP.md`. For every important file record its purpose, imports, callers, data read/written and a one-sentence explanation. The map must reflect the actual code, not just this proposal.
