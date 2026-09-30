"""
Database Connection and Session Management with SQLAlchemy.
Supports both SQLite (local development) and PostgreSQL (production).
"""
from datetime import datetime, timezone
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from backend.app.core.config import settings

def utc_now() -> datetime:
    """Returns current UTC timestamp as naive datetime for PostgreSQL/asyncpg compatibility."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

# For SQLite, check same thread must be false
is_sqlite = "sqlite" in settings.DATABASE_URL
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine_kwargs = {
    "echo": False,
    "connect_args": connect_args,
    "future": True,
}

# PostgreSQL / MySQL enterprise connection pooling configuration
if not is_sqlite:
    engine_kwargs.update({
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_recycle": settings.DB_POOL_RECYCLE,
        "pool_timeout": settings.DB_POOL_TIMEOUT,
        "pool_pre_ping": settings.DB_POOL_PRE_PING,
    })
else:
    # Enable pre-ping on SQLite to ensure connection validity
    engine_kwargs["pool_pre_ping"] = settings.DB_POOL_PRE_PING

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
