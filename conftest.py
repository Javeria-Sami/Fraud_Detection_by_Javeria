import sys
import os
import pytest
import pytest_asyncio
import asyncio

# Add root directory to python path for testing
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.app.core.database import engine, Base
from backend.app.main import seed_initial_database


@pytest_asyncio.fixture(scope="session", autouse=True)
async def init_test_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        await seed_initial_database()
    except Exception:
        pass
    yield
