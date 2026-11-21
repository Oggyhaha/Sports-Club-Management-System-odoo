# Champions Club — Sports Club Management System

A one-day hackathon MVP for managing the essential day-to-day operations of a sports club.

## Project goal

Replace scattered spreadsheets and messages with one simple application for:
- Registering members and assigning membership plans
- Managing courts and viewing availability
- Creating and cancelling court bookings
- Applying membership-based booking prices
- Viewing a simple admin dashboard

This is an MVP. Shop inventory, cafeteria orders, online enquiries, staff management, advanced analytics, notifications, and payment-gateway integration are future enhancements unless time remains.

## Tech stack

| Area | Technology |
|---|---|
| Frontend | React + JavaScript (ES6+) |
| Frontend tooling | Vite |
| Styling | Tailwind CSS |
| Backend | Python + FastAPI |
| API style | REST |
| Database | PostgreSQL |
| ORM | SQLAlchemy 2.x |
| Validation | Pydantic |
| Database migrations | Alembic |
| API server | Uvicorn |
| API testing | Postman |
| Automated tests | Pytest |
| Version control | Git + GitHub |
| Containerization | Docker (optional for the one-day MVP) |

## Architecture

**Modular monolith with layered separation.**

The React frontend communicates with the FastAPI backend through REST endpoints. Within the backend, routes handle HTTP requests, Pydantic schemas validate data, service functions implement business rules, and SQLAlchemy handles database access.

```text
React (Vite)
    |
    | HTTP / JSON (REST)
    v
FastAPI routes
    |
Pydantic validation
    |
Service / business logic
    |
SQLAlchemy
    |
PostgreSQL
```

Keep the first version simple. Do not add Redis, Celery, WebSockets, microservices, or a payment gateway unless a demonstrated requirement makes them necessary.

## Suggested MVP features

### 1. Members and membership plans
- Create and view member records.
- Support Gold, Silver, and Junior plans.
- Store membership start and expiry dates.
- Show a member's current plan and status.

### 2. Courts and bookings
- Create and view courts.
- Create and cancel bookings.
- Use one-hour sessions with start times on half-hour intervals.
- Prevent overlapping bookings for the same court.
- Enforce the maximum of two sessions per member per day.
- Calculate a simple booking price based on membership plan.

### 3. Admin overview
- Show total members.
- Show today's bookings.
- Show upcoming bookings.
- Show a basic booking/revenue summary if payment data is implemented.

## One-day implementation order

Work in this order and keep each stage runnable before moving on.

1. **Repository setup:** create the project folders, virtual environment, React app, and Git repository.
2. **Backend foundation:** create the FastAPI app and a health-check endpoint.
3. **Database:** configure PostgreSQL and SQLAlchemy; create the initial tables.
4. **Member APIs:** implement create/list/view member endpoints and validate requests.
5. **Court APIs:** implement court creation and listing.
6. **Booking logic:** implement booking creation, cancellation, overlap checks, and the daily booking limit.
7. **Frontend:** build a simple dashboard, members page, courts page, and booking form.
8. **Integration:** connect React to the API and show success/error messages.
9. **Testing:** test the happy path and important failure cases.
10. **Demo preparation:** seed realistic sample data, verify the demo flow, and document known limitations.

If time becomes tight, prioritize a working member-to-booking flow over additional modules or visual polish.

## Suggested repository structure

```text
champions-club/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   └── database.py
│   │   └── modules/
│   │       ├── members/
│   │       ├── courts/
│   │       └── bookings/
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
├── .env.example
├── .gitignore
└── README.md
```

You can add `routes.py`, `schemas.py`, `models.py`, `service.py`, and `repository.py` inside each backend module as the implementation grows. Avoid creating empty layers that you do not yet need.

## Local development setup

### Prerequisites

Install:
- Python 3.11 or newer
- Node.js LTS and npm
- PostgreSQL
- Git

### Backend

From the repository root:

```bash
cd backend

python -m venv .venv
```

Activate the virtual environment:

**Windows PowerShell**
```powershell
.venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
source .venv/bin/activate
```

Install dependencies after creating `requirements.txt`:

```bash
pip install -r requirements.txt
```

Start the API:

```bash
uvicorn app.main:app --reload
```

Open the interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

### Frontend

In a separate terminal, from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Vite prints the local frontend URL in the terminal (commonly `http://localhost:5173`).

## Configuration

Keep secrets and machine-specific settings in a local `.env` file. Do not commit it.

Create `.env.example` with placeholder values, for example:

```env
DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/champions_club
SECRET_KEY=replace-this-with-a-long-random-secret
```

Use a real secret only in your local environment. Never put passwords, API keys, or production credentials in Git.

## Important business rules to test

- A court cannot have two overlapping active bookings.
- A booking must use a valid court, member, date, and permitted start time.
- A member cannot exceed two sessions on the same day.
- A cancelled booking must not block the court.
- Membership status and pricing must follow the selected plan.
- Booking creation should be protected against concurrent requests, not just checked in the frontend.

For a production-quality implementation, enforce critical booking-conflict rules at the database level where practical and use transactions. A frontend availability check alone is not sufficient to prevent two users booking simultaneously.

## Initial Git commit

After adding the project files:

```bash
git init
git add README.md .gitignore
git commit -m "chore: add project documentation and gitignore"
```

After creating the application folders and code, commit those separately.

## Demo flow

A short, clear demo can follow this sequence:

1. Admin opens the dashboard.
2. Admin registers a member and assigns a membership plan.
3. Admin views the available courts.
4. A booking is created for the member.
5. A second overlapping booking is attempted and rejected.
6. The dashboard displays the updated booking information.

## Scope and honesty

This repository starts as a hackathon MVP, not a complete production club-management platform. Do not claim that payments, inventory, cafeteria operations, notifications, or advanced reporting are implemented until they actually work. List unfinished features as future work in the final presentation.
