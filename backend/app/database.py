
from app.pool import build_engine
from app.config import settings
from sqlalchemy.orm import sessionmaker, declarative_base
from saraswati_tenant import apply_rls, bind_rls


engine = build_engine(
    settings.DATABASE_URL,
    service="sgs-headmaster-api",
    slots=settings.DB_SERVICE_SLOTS,
    reserve=settings.DB_RESERVE,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

bind_rls(SessionLocal)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        apply_rls(db)
        yield db
    finally:
        db.close()
