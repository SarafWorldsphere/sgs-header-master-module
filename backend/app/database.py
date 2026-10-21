from app.pool import build_engine
from app.config import settings
from sqlalchemy.orm import sessionmaker, declarative_base
from saraswati_tenant import apply_rls


# Create engine
engine = build_engine(
    settings.DATABASE_URL,
    service="sgs-headmaster-api",
    slots=settings.DB_SERVICE_SLOTS,
    reserve=settings.DB_RESERVE
)


# Session
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# Base model
Base = declarative_base()


# Dependency
def get_db():
    db = SessionLocal()
    try:
        apply_rls(db)
        yield db
    finally:
        db.close()