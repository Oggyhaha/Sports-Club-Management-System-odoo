# Champions Club — File Map

This document tracks every critical file in the project, explaining its exact purpose, its dependencies, what calls it, and how to explain it to hackathon judges.

---

## Architecture Flow Overview

```text
React Frontend (Vite)
      │
      │ HTTP REST (JSON)
      ▼
FastAPI Routes (`routes.py`)
      │
      ▼
Pydantic Schemas (`schemas.py`)  ◄── [Validation Layer]
      │
      ▼
Service Layer (`service.py`)      ◄── [Business Rules & ACID Logic]
      │
      ▼
SQLAlchemy ORM (`models.py`)     ◄── [Object-Relational Mapping]
      │
      ▼
PostgreSQL Database              ◄── [Single Source of Truth (UUIDs, ACID)]
```

---

## File Directory & Explanations

### Root & Configuration

| File Path | Purpose | What it Imports | What Imports/Calls It | Data Read / Written | Judge-Ready One-Sentence Explanation |
|---|---|---|---|---|---|
| `.gitignore` | Prevents secrets (`.env`), Python caches (`__pycache__`), virtualenvs (`.venv/`), and `node_modules/` from being committed to Git. | None | Git VCS | None | "Ensures sensitive credentials, virtual environments, and temporary build artifacts are never leaked into version control." |
| `docs/FILE_MAP.md` | Living architectural documentation explaining file roles, data flows, and dependencies. | None | Developers & Judges | Documentation | "Provides clear architectural transparency showing how every single file connects in our modular monolith." |

### Backend Foundation

| File Path | Purpose | What it Imports | What Imports/Calls It | Data Read / Written | Judge-Ready One-Sentence Explanation |
|---|---|---|---|---|---|
| `backend/requirements.txt` | Locks all Python dependencies (FastAPI, SQLAlchemy 2.x, Pydantic, Uvicorn, Alembic, Pytest). | Python packages | `pip install` | Dependency specs | "Defines reproducible, locked Python dependencies ensuring consistent execution across development and deployment." |
| `backend/pytest.ini` | Configures pytest root path and test discovery directory. | pytest configuration | pytest runner | Configuration | "Configures automated test discovery and Python module resolution for backend test suites." |
| `backend/app/main.py` | FastAPI application factory, CORS middleware setup, and root `/api/v1/health` route definition. | `FastAPI`, `CORSMiddleware` | Uvicorn ASGI server (`uvicorn app.main:app`) | None (Health JSON) | "Serves as the central API gateway entry point that configures middleware, registers modular routers, and exposes health checks." |
| `backend/app/core/config.py` | Central configuration management using Pydantic Settings; loads `.env` variables safely with fallback defaults. | `pydantic_settings.BaseSettings` | `database.py`, `main.py` | Environment variables | "Centralizes application configuration with type-safe environment variable parsing and fallback defaults." |
| `backend/app/core/database.py` | Configures SQLAlchemy 2.x engine, connection pool, session factory, `DeclarativeBase`, and `get_db` FastAPI dependency. | `sqlalchemy`, `app.core.config.settings` | Routers, services, Alembic | Database connection pool | "Manages database connection lifecycle, ORM base declarations, and provides safe per-request session injection." |
| `backend/tests/test_health.py` | Automated tests verifying the health check and root welcome endpoints. | `fastapi.testclient.TestClient`, `app.main` | Pytest runner | None | "Validates API uptime and service availability through automated test assertions." |
| `backend/tests/test_database.py` | Automated tests verifying Pydantic settings loading, SQLAlchemy engine, DeclarativeBase, and `get_db` generator. | `app.core.config`, `app.core.database` | Pytest runner | None | "Verifies database configuration integrity, ORM base hierarchy, and session lifecycle management." |
| `backend/app/models.py` | Central export module consolidating all SQLAlchemy ORM models (`MembershipPlan`, `Member`, `Court`, `Booking`). | All domain models | `alembic/env.py`, seed script, test suites | None | "Provides a single entry point for ORM metadata registration to avoid circular dependency resolution issues." |
| `backend/app/modules/members/models.py` | SQLAlchemy ORM models for `MembershipPlan` and `Member` with UUID primary keys and NUMERIC currencies. | `app.core.database.Base`, `uuid` | Routers, services, `app.models` | PostgreSQL `membership_plans`, `members` | "Defines persistent membership entities with UUID identifiers and foreign-key integrity constraints." |
| `backend/app/modules/members/schemas.py` | Pydantic v2 schemas defining input validation (`MemberCreate`, `MemberUpdate`) and serialization contracts (`MemberResponse`, `MembershipPlanResponse`). | `pydantic` | `routes.py`, `service.py`, tests | Request/Response JSON validation | "Guarantees strict type safety and input sanitization at the API boundary before data reaches business logic." |
| `backend/app/modules/members/service.py` | Core business logic for members: plan validation, duplicate email enforcement, expiry defaulting, and SQLAlchemy queries. | `sqlalchemy`, `app.models`, `schemas.py` | `routes.py` | Database reads and writes | "Encapsulates business rules and transactional integrity for member registration and profile management." |
| `backend/app/modules/members/routes.py` | REST API endpoints under `/api/v1/members`: listing plans, listing members, creating, fetching, and updating member records. | `fastapi.APIRouter`, `service.py`, `get_db` | `app/main.py` | HTTP JSON requests/responses | "Exposes standardized RESTful endpoints with explicit HTTP status codes (200, 201, 400, 404, 409)." |
| `backend/tests/test_members.py` | Automated integration tests for all member endpoints (create, duplicate conflict, invalid plan, invalid email, search, update). | `fastapi.testclient.TestClient`, `app.main` | Pytest runner | Test API interactions | "Automates verification of the entire Member API lifecycle and negative edge cases." |
| `backend/app/modules/courts/models.py` | SQLAlchemy ORM model for `Court` representing sports courts (tennis, cricket) with hourly rates. | `app.core.database.Base`, `uuid` | Routers, services, `app.models` | PostgreSQL `courts` | "Models physical sports facilities with activity statuses and configurable hourly pricing." |
| `backend/app/modules/bookings/models.py` | SQLAlchemy ORM model for `Booking` with UUID keys, composite index on court/time/status, and timezone-aware timestamps. | `app.core.database.Base`, `uuid` | Routers, services, `app.models` | PostgreSQL `bookings` | "Represents court reservations with foreign-key relationships and indexed temporal boundary tracking." |
| `backend/app/core/seed.py` | Idempotent database seeder that populates default tiers (Gold, Silver, Junior) and courts. | `app.models`, `SessionLocal` | CLI initialization (`python -m app.core.seed`) | Writes default seed records | "Populates initial business domain fixtures safely and idempotently for demonstration and local testing." |
| `backend/tests/test_models.py` | Automated test suite verifying model instantiation, UUID generation, and PostgreSQL live table queries. | `app.models`, `SessionLocal` | Pytest runner | Reads/writes test records | "Verifies schema contract enforcement, UUID primary key assignment, and live PostgreSQL persistence." |
| `backend/alembic/` | Alembic database migration environment managing schema versions (`alembic upgrade head`). | `app.models`, `app.core.database` | Alembic CLI | `alembic_version` table | "Enforces version-controlled database schema migrations ensuring repeatable and safe production schema evolutions." |

*(New files will be appended here as each milestone is built.)*
