"""
IntelliCrime — Phase 2 | Database connection
SQLAlchemy engine + session factory pointing at intellicrime.db
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../intellicrime.db")
DATABASE_URL = f"sqlite:///{os.path.abspath(DB_PATH)}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ping_db():
    """Health check — returns True if DB is reachable and has data."""
    try:
        with engine.connect() as conn:
            count = conn.execute(text("SELECT COUNT(*) FROM districts")).scalar()
            return count > 0
    except Exception:
        return False