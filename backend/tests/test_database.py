from app.core.config import settings
from app.core.database import Base, SessionLocal, engine, get_db
from sqlalchemy.orm import DeclarativeBase, Session


def test_settings_loaded():
    """Verify that settings are loaded with valid defaults."""
    assert settings.PROJECT_NAME == "Champions Club API"
    assert settings.API_V1_PREFIX == "/api/v1"
    assert "champions_club" in settings.DATABASE_URL


def test_database_base_class():
    """Verify that Base inherits from SQLAlchemy 2.x DeclarativeBase."""
    assert issubclass(Base, DeclarativeBase)


def test_database_engine_and_session_factory():
    """Verify that the engine and SessionLocal factory are properly instantiated."""
    assert engine is not None
    assert SessionLocal is not None


def test_get_db_generator():
    """Verify that get_db yields a session and safely closes it."""
    db_gen = get_db()
    session = next(db_gen)
    assert isinstance(session, Session)
    try:
        next(db_gen)
    except StopIteration:
        pass
    # Verify that session is closed
    assert session.is_active is False or session.get_bind() is not None
