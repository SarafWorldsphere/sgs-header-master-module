
import logging
import math
import os

from sqlalchemy import create_engine, text

log = logging.getLogger(__name__)

DEFAULT_SLOTS = 12
DEFAULT_RESERVE = 0.2

FALLBACK_MAX_CONNECTIONS = int(
    os.getenv("DB_MAX_CONNECTIONS_FALLBACK", "80")
)


def _max_connections(url: str) -> int:
    """Read PostgreSQL max_connections."""

    probe = None

    try:
        probe = create_engine(
            url,
            connect_args={"connect_timeout": 5}
        )

        with probe.connect() as conn:
            return int(
                conn.execute(text("SHOW max_connections")).scalar()
            )

    except Exception as exc:
        log.warning(
            "Could not read max_connections (%s); assuming %d",
            exc,
            FALLBACK_MAX_CONNECTIONS,
        )
        return FALLBACK_MAX_CONNECTIONS

    finally:
        if probe is not None:
            probe.dispose()


def build_engine(
    url: str,
    service: str,
    slots: int = DEFAULT_SLOTS,
    reserve: float = DEFAULT_RESERVE,
):
    """Create SQLAlchemy engine with calculated pool capacity."""

    max_connections = _max_connections(url)

    share = max(
        2,
        math.floor(max_connections * (1 - reserve) / slots)
    )

    log.warning(
        "DB pool for %s: idle 1, burst to %d (slots=%d)",
        service,
        share,
        slots,
    )

    return create_engine(
        url,
        pool_size=1,
        max_overflow=share - 1,
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_timeout=10,
        connect_args={
            "application_name": service,
            "connect_timeout": 5,
        },
    )
