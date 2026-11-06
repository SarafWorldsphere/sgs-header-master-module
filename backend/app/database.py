
import logging
from threading import BoundedSemaphore

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.pool import build_engine
from app.config import settings

log = logging.getLogger(__name__)

# Current pool maximum:
# pool_size=1 + max_overflow=4 = 5
#
# Allow only 4 request sessions at a time.
# Remaining requests wait here instead of exhausting QueuePool.
DB_MAX_CONCURRENT_SESSIONS = 4

_db_session_slots = BoundedSemaphore(
    value=DB_MAX_CONCURRENT_SESSIONS
)


# Create database engine
engine = build_engine(
    settings.DATABASE_URL,
    service="sgs-headmaster-api",
    slots=settings.DB_SERVICE_SLOTS,
    reserve=settings.DB_RESERVE
)

log.warning(
    "[DB READY] %s | Maximum concurrent request sessions: %s",
    engine.pool.status(),
    DB_MAX_CONCURRENT_SESSIONS
)


# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# Base model
Base = declarative_base()


# Database dependency with concurrency control
def get_db():
    _db_session_slots.acquire()

    db = None

    try:
        db = SessionLocal()
        yield db

    finally:
        try:
            if db is not None:
                db.close()

        finally:
            _db_session_slots.release()
