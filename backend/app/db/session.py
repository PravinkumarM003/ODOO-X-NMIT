import logging
import time

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger("texflow.db")

connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

# ---------------------------------------------------------------------------
# Engine configuration
# TiDB Cloud connections traverse the internet (50-200ms RTT per query),
# so the pool must be sized to handle concurrent requests without exhaustion.
# Previous defaults (pool_size=5, max_overflow=10) were too small.
# ---------------------------------------------------------------------------
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,       # was default 5
    max_overflow=5,     # was default 10 — reducing overflow forces faster turnover
    pool_timeout=30,
    echo=False,
)

# ---------------------------------------------------------------------------
# Pool diagnostics — log checkout/checkin timing without exposing credentials
# ---------------------------------------------------------------------------
@event.listens_for(engine, "checkout")
def _on_checkout(dbapi_conn, connection_rec, connection_proxy):
    connection_rec.info.setdefault("checkout_time", time.monotonic())
    pool = engine.pool
    logger.debug(
        "Pool checkout: size=%s checked_out=%s overflow=%s",
        pool.size(),
        pool.checkedout(),
        pool.overflow(),
    )


@event.listens_for(engine, "checkin")
def _on_checkin(dbapi_conn, connection_rec):
    checkout_time = connection_rec.info.pop("checkout_time", None)
    if checkout_time is not None:
        held_ms = (time.monotonic() - checkout_time) * 1000
        if held_ms > 5000:
            logger.warning("Connection held for %.0f ms — possible leak", held_ms)
        else:
            logger.debug("Connection returned after %.0f ms", held_ms)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that provides a database session per request.
    
    The finally block guarantees the session (and its underlying connection)
    is returned to the pool even if the route handler raises an exception.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
