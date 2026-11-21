from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# 1. Create the SQLAlchemy Engine
# The Engine is the central connection manager. It communicates with the PostgreSQL
# psycopg driver, maintains a connection pool, and coordinates SQL execution.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Tests connections for liveness before giving them to a request
    pool_size=5,  # Default number of persistent connections in the pool
    max_overflow=10,  # Maximum extra connections allowed during traffic spikes
)

# 2. SessionLocal factory
# Creates fresh, isolated Session objects. Each HTTP request receives its own session.
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# 3. Base class for all database models (SQLAlchemy 2.x style)
class Base(DeclarativeBase):
    pass


# 4. Dependency for FastAPI routes
# Injected into routes using `Depends(get_db)`.
# Guarantees that the session is closed even if an exception occurs during the request.
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
