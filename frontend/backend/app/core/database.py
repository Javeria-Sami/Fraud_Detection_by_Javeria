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
 
_db_initialized = False
_db_init_lock = None

def _get_init_lock():
    global _db_init_lock
    if _db_init_lock is None:
        import asyncio
        _db_init_lock = asyncio.Lock()
    return _db_init_lock

async def ensure_db_initialized():
    """Ensures database schema and seed data are initialized even in serverless environments without lifespan."""
    global _db_initialized
    if _db_initialized:
        return
    lock = _get_init_lock()
    async with lock:
        if _db_initialized:
            return
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        _db_initialized = True
        try:
            from backend.app.models.user import User
            from sqlalchemy import select, func
            async with AsyncSessionLocal() as session:
                cnt = await session.scalar(select(func.count()).select_from(User))
                if not cnt:
                    from backend.app.db.seed import seed_database
                    await seed_database()
        except Exception:
            pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining async database session."""
    await ensure_db_initialized()
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
