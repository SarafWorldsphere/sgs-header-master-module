"""
Connection-pool sizing, derived from the database rather than hand-set.

The pool is elastic: a quiet service holds one connection, a busy one grows and
then releases. The ceiling is computed at startup from the server's own
`max_connections` divided by the workers sharing it, so resizing the instance
or deploying to another school needs no code change.

Reference implementation — the other backends should copy this file.
"""

import logging
import math
import os

from sqlalchemy import create_engine, text

log = logging.getLogger(__name__)

# Callers pass the real values in. Reading them here with os.getenv looks right
# but is a trap: pydantic-settings loads .env into the Settings object without
# exporting to the process environment, so os.getenv silently returns the
# default and the pool is sized wrong with no error.
DEFAULT_SLOTS = 12
DEFAULT_RESERVE = 0.2

# Used only when the startup probe cannot reach the database. Deliberately
# small: a service that cannot measure should not assume it has room.
FALLBACK_MAX_CONNECTIONS = int(os.getenv("DB_MAX_CONNECTIONS_FALLBACK", "80"))


def _max_connections(url: str) -> int:
    """Ask the server its own limit. Never fatal — a service must still boot."""
    probe = None
    try:
        probe = create_engine(url, connect_args={"connect_timeout": 5})
        with probe.connect() as conn:
            return int(conn.execute(text("SHOW max_connections")).scalar())
    except Exception as exc:
        log.warning(
            "Could not read max_connections (%s); assuming %d",
            exc, FALLBACK_MAX_CONNECTIONS,
        )
        return FALLBACK_MAX_CONNECTIONS
    finally:
        if probe is not None:
            probe.dispose()


def build_engine(url: str, service: str, slots: int = DEFAULT_SLOTS,
                 reserve: float = DEFAULT_RESERVE):
    """An engine whose ceiling is this worker's fair share of the database."""
    share = max(2, math.floor(_max_connections(url) * (1 - reserve) / slots))

    log.warning("DB pool for %s: idle 1, burst to %d (slots=%d)", service, share, slots)

    return create_engine(
        url,
        # Idle floor of one. With N workers the baseline cost is N connections,
        # not N x pool_size — which is what exhausted the shared instance.
        pool_size=1,
        max_overflow=share - 1,
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_timeout=10,
        connect_args={"application_name": service},
    )
