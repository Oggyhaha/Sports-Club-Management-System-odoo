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
| `docs/MEMBERSHIP_WORKFLOW.md` | Comprehensive architectural documentation detailing the relationship between plans, members, subscriptions, and booking pricing. | None | Developers & Judges | Documentation | "Documents the dual-layer subscription lifecycle, immutable snapshots, and historical financial integrity." |

### Backend Foundation

| File Path | Purpose | What it Imports | What Imports/Calls It | Data Read / Written | Judge-Ready One-Sentence Explanation |
|---|---|---|---|---|---|
| `backend/requirements.txt` | Locks all Python dependencies (FastAPI, SQLAlchemy 2.x, Pydantic, Uvicorn, Alembic, Pytest). | Python packages | `pip install` | Dependency specs | "Defines reproducible, locked Python dependencies ensuring consistent execution across development and deployment." |
| `backend/pytest.ini` | Configures pytest root path and test discovery directory. | pytest configuration | pytest runner | Configuration | "Configures automated test discovery and Python module resolution for backend test suites." |
| `backend/app/main.py` | FastAPI application factory, CORS middleware setup, and root `/api/v1/health` route definition. | `FastAPI`, `CORSMiddleware` | Uvicorn ASGI server (`uvicorn app.main:app`) | None (Health JSON) | "Serves as the central API gateway entry point that configures middleware, registers modular routers, and exposes health checks." |
| `backend/app/core/config.py` | Central configuration management using Pydantic Settings; loads `.env` variables safely with fallback defaults. | `pydantic_settings.BaseSettings` | `database.py`, `main.py` | Environment variables | "Centralizes application configuration with type-safe environment variable parsing and fallback defaults." |
| `backend/app/core/database.py` | Configures SQLAlchemy 2.x engine, connection pool, session factory, `DeclarativeBase`, and `get_db` FastAPI dependency. | `sqlalchemy`, `app.core.config.settings` | Routers, services, Alembic | Database connection pool | "Manages database connection lifecycle, ORM base declarations, and provides safe per-request session injection." |
| `backend/app/core/security.py` | Password security utilities implementing bcrypt hashing, verification, salt generation, and strict 8-char / 72-byte limit validation. | `bcrypt` | Auth services, seed scripts, test suites | None (hashing logic) | "Guarantees secure credential protection using bcrypt with explicit length validation preventing silent truncation." |
| `backend/app/core/jwt.py` | JWT token utilities enforcing HS256 algorithm allowlists, UTC expiration, and required claim validation (`sub`, `exp`, `iat`, `ver`). | `jwt (PyJWT)`, `app.core.config.settings` | Dependencies, auth services | Signed JWT tokens | "Generates and cryptographically verifies tamper-proof JWT access tokens with strict algorithm allowlisting." |
| `backend/app/core/dependencies.py` | FastAPI authentication (`get_current_user`) and RBAC (`require_roles`) dependencies verifying token version against PostgreSQL. | `fastapi`, `jwt`, `app.models`, `get_db` | Protected API routers | PostgreSQL user and role lookup | "Protects endpoints by authenticating Bearer JWTs, verifying revocation states, and enforcing database-backed role authorization." |
| `backend/app/models.py` | Central export module consolidating all SQLAlchemy ORM models (`User`, `Role`, `UserRole`, `MembershipPlan`, `Member`, `MemberSubscription`, `Court`, `Booking`). | All domain models | `alembic/env.py`, seed script, test suites | None | "Provides a single entry point for ORM metadata registration to avoid circular dependency resolution issues." |

### Authentication & Authorization

| File Path | Purpose | What it Imports | What Imports/Calls It | Data Read / Written | Judge-Ready One-Sentence Explanation |
|---|---|---|---|---|---|
| `backend/app/modules/auth/models.py` | SQLAlchemy ORM models for `User`, `Role`, `UserRole`, and `Invitation` supporting multi-role RBAC and `token_version` invalidation. | `app.core.database.Base`, `uuid` | Routers, services, `app.models` | PostgreSQL `users`, `roles`, `user_roles`, `invitations` | "Implements decoupled identity, credential management, and extensible role associations." |
| `backend/app/modules/auth/schemas.py` | Pydantic v2 validation contracts for member registration, credentials login, staff invitations, and profile updates. | `pydantic` | `routes.py`, `service.py`, test suites | Request/Response JSON validation | "Enforces password length policies, drops client role manipulation attempts, and guarantees strict authentication contracts." |
| `backend/app/modules/auth/service.py` | Core business logic for user authentication, member registration (forcing member role), staff invitation tokens, and profile sync. | `app.models`, `hash_password`, `verify_password` | `routes.py` | PostgreSQL user & invitation records | "Encapsulates credential verification, token hashing, and single-use staff invitation lifecycle management." |
| `backend/app/modules/auth/routes.py` | REST API endpoints under `/api/v1/auth`: register, login, me, me update, logout (token revocation), staff invite, staff accept. | `fastapi.APIRouter`, `service.py`, `dependencies.py` | `app/main.py` | HTTP JSON requests/responses | "Exposes high-security endpoints for public onboarding, session management, and owner-governed staff invitations." |
| `backend/app/core/bootstrap_owner.py` | Concurrency-safe initial owner creation script using PostgreSQL advisory transaction lock and environment-driven credentials. | `sqlalchemy`, `app.models`, `hash_password` | CLI bootstrap (`python -m app.core.bootstrap_owner`) | Creates initial Owner User | "Eliminates owner takeover race conditions via PostgreSQL advisory locks and boots administrative access securely." |
| `backend/alembic/versions/e202d110bd57_add_auth_tables_and_extend_existing.py` | Migration A: Creates `roles`, `users`, `user_roles`, adds `members.user_id`, and extends dynamic plan and court fields. | Alembic migration framework | `alembic upgrade head` | PostgreSQL schema extension | "Safely introduces authentication tables and non-breaking nullable foreign keys preserving all existing data." |
| `backend/alembic/versions/01f0239295a6_add_invitations_table.py` | Migration B: Creates the `invitations` table with SHA-256 token hashing, expiration, and foreign keys to roles and users. | Alembic migration framework | `alembic upgrade head` | PostgreSQL schema extension | "Provides a version-controlled, safe table structure for cryptographically secure staff and client onboarding." |

### Membership & Member Management (Milestone B)

| File Path | Purpose | What it Imports | What Imports/Calls It | Data Read / Written | Judge-Ready One-Sentence Explanation |
|---|---|---|---|---|---|
| `backend/app/modules/members/models.py` | SQLAlchemy ORM models for `MembershipPlan`, `Member`, and `MemberSubscription` capturing immutable pricing and discount snapshots. | `app.core.database.Base`, `uuid` | Routers, services, `app.models` | PostgreSQL `membership_plans`, `members`, `member_subscriptions` | "Implements dual-layer membership architecture: authoritative subscription history alongside fast current-state member projections." |
| `backend/app/modules/members/schemas.py` | Pydantic v2 schemas defining input validation and serialization for plans, member profiles, self-service profile, purchases, renewals, and plan changes. | `pydantic` | `routes.py`, `service.py`, tests | Request/Response JSON validation | "Enforces non-negative pricing, percentage discount bounds [0, 100], and separate subscription and payment lifecycles." |
| `backend/app/modules/members/service.py` | Core business logic for plans and subscriptions: row-level locking (`with_for_update`), duplicate subscription prevention, continuous renewals, and plan upgrade history. | `sqlalchemy`, `app.models`, `schemas.py` | `routes.py` | Database reads, locks, and writes | "Guarantees ACID subscription purchases and atomic synchronization of member expiry dates and plan tiers." |
| `backend/app/modules/members/routes.py` | REST API endpoints under `/api/v1/members`: plans management (Owner only), member directory, self-service `/me`, subscription purchases, renewals, and plan changes. | `fastapi.APIRouter`, `service.py`, `dependencies.py` | `app/main.py` | HTTP JSON requests/responses | "Exposes role-governed endpoints enforcing ownership boundaries for members and full administrative control for staff." |
| `backend/alembic/versions/67a56946e12c_add_member_subscriptions_table.py` | Migration C: Adds `is_active` to `membership_plans` and creates `member_subscriptions` table with snapshot fields and indices. | Alembic migration framework | `alembic upgrade head` | PostgreSQL schema extension | "Introduces immutable historical subscription tracking without breaking existing walk-in members or plan definitions." |

### Courts & Booking Engine

| File Path | Purpose | What it Imports | What Imports/Calls It | Data Read / Written | Judge-Ready One-Sentence Explanation |
|---|---|---|---|---|---|
| `backend/app/modules/courts/models.py` | SQLAlchemy ORM model for `Court` representing sports courts (tennis, cricket) with hourly rates. | `app.core.database.Base`, `uuid` | Routers, services, `app.models` | PostgreSQL `courts` | "Models physical sports facilities with activity statuses and configurable hourly pricing." |
| `backend/app/modules/courts/schemas.py` | Pydantic v2 schemas for court validation (`CourtCreate`, `CourtUpdate`, `CourtResponse`). | `pydantic` | `routes.py`, `service.py`, tests | Request/Response JSON validation | "Validates sports facility data types, hourly rates, and status fields before execution." |
| `backend/app/modules/courts/service.py` | Business logic for courts: duplicate name rejection (409), sport type normalization, and active filtering. | `sqlalchemy`, `app.models`, `schemas.py` | `routes.py` | Database reads and writes | "Encapsulates court inventory management and facility status updates." |
| `backend/app/modules/courts/routes.py` | REST API endpoints under `/api/v1/courts`: list all courts with `?sport_type=` filter, create, fetch by ID, update. | `fastapi.APIRouter`, `service.py`, `get_db` | `app/main.py` | HTTP JSON requests/responses | "Exposes endpoints for court directory management and real-time court availability querying." |
| `backend/app/modules/bookings/models.py` | SQLAlchemy ORM model for `Booking` with UUID keys, composite index on court/time/status, and timezone-aware timestamps. | `app.core.database.Base`, `uuid` | Routers, services, `app.models` | PostgreSQL `bookings` | "Represents court reservations with foreign-key relationships and indexed temporal boundary tracking." |
| `backend/app/modules/bookings/schemas.py` | Pydantic v2 schemas for booking validation (`BookingCreate`, `BookingResponse`). | `pydantic` | `routes.py`, `service.py`, tests | Request/Response JSON validation | "Defines booking payload constraints and nests eager-loaded member and court metadata." |
| `backend/app/modules/bookings/service.py` | The Core Booking Engine: validates 30-min boundaries, derives 60-min durations, enforces 2/day member quotas, prevents overlapping conflicts with PostgreSQL row-locks, and calculates tier discounts. | `sqlalchemy`, `app.models`, `schemas.py` | `routes.py` | Database reads, locks, and writes | "Implements the core business logic, temporal conflict rejection (409), daily quota limits, and ACID transaction safety." |
| `backend/app/modules/bookings/routes.py` | REST API endpoints under `/api/v1/bookings`: list with date/court/status filters, create booking, fetch by ID, cancel booking. | `fastapi.APIRouter`, `service.py`, `get_db` | `app/main.py` | HTTP JSON requests/responses | "Exposes high-integrity endpoints for court reservation lifecycle management." |

### Automated Test Suites

| File Path | Purpose | What it Imports | What Imports/Calls It | Data Read / Written | Judge-Ready One-Sentence Explanation |
|---|---|---|---|---|---|
| `backend/tests/conftest.py` | Pytest test configuration providing dynamic test database isolation (`champions_club_test`), engine patching, dependency overrides, and automatic teardown cleanup. | `pytest`, `sqlalchemy`, `app.main`, `app.core.database` | Pytest runner | Test database lifecycle | "Guarantees complete database isolation for automated tests, preventing test pollution of the development database." |
| `backend/tests/test_memberships.py` | Automated test suite verifying Milestone B: plan creation, owner authorization, duration validation, subscription purchases, renewals, plan upgrades, immutable snapshots, and booking price preservation. | `fastapi.testclient.TestClient`, `app.main`, `conftest` | Pytest runner | Test database records | "Proves that subscription history, plan changes, and booking discounts adhere to strict business rules and ACID persistence." |
| `backend/tests/test_auth_endpoints.py` | Automated integration test suite verifying member registration, password length bounds, login, token revocation, and staff invitation lifecycle. | `fastapi.testclient.TestClient`, `app.main` | Pytest runner | Test database records | "Comprehensive automated test harness proving public registration security, token version revocation, and staff invitation integrity." |
| `backend/tests/test_auth_models.py` | Automated tests verifying `User`, `Role`, walk-in member isolation (`user_id=None`), and linked member profiles. | `app.modules.auth.models`, `SessionLocal` | Pytest runner | Test database records | "Guarantees that walk-in members remain functional without user accounts while online accounts link correctly." |
| `backend/tests/test_security.py` | Automated test suite validating password policies, JWT generation/decoding, token invalidation, and multi-role RBAC guards. | `fastapi.testclient.TestClient`, `app.core.security`, `app.core.jwt`, `app.core.dependencies` | Pytest runner | Test database records | "Comprehensive automated test harness proving password security, JWT resilience, and role-based access control." |
| `backend/tests/test_members.py` | Automated integration tests for member directory endpoints (create, duplicate conflict, invalid plan, invalid email, search, update). | `fastapi.testclient.TestClient`, `app.main` | Pytest runner | Test API interactions | "Automates verification of the entire Member API lifecycle and negative edge cases." |
| `backend/tests/test_courts.py` | Automated integration tests for court endpoints (create, duplicate conflict, negative rate validation, search, update). | `fastapi.testclient.TestClient`, `app.main` | Pytest runner | Test API interactions | "Verifies court catalog management and negative validation handling." |
| `backend/tests/test_bookings.py` | Automated integration tests for all 6 core booking rules (exact overlap, partial overlap, adjacent slots, 2/day limit, cancellation slot release). | `fastapi.testclient.TestClient`, `app.main` | Pytest runner | Test API interactions | "Proves that court conflicts and daily quotas are strictly enforced under automated testing." |
| `backend/tests/test_models.py` | Automated test suite verifying model instantiation, UUID generation, and PostgreSQL live table queries. | `app.models`, `SessionLocal` | Pytest runner | Reads/writes test records | "Verifies schema contract enforcement, UUID primary key assignment, and live PostgreSQL persistence." |
| `backend/tests/test_database.py` | Automated tests verifying Pydantic settings loading, SQLAlchemy engine, DeclarativeBase, and `get_db` generator. | `app.core.config`, `app.core.database` | Pytest runner | None | "Verifies database configuration integrity, ORM base hierarchy, and session lifecycle management." |
| `backend/tests/test_health.py` | Automated tests verifying the health check and root welcome endpoints. | `fastapi.testclient.TestClient`, `app.main` | Pytest runner | None | "Validates API uptime and service availability through automated test assertions." |
