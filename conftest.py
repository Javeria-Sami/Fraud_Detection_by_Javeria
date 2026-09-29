import sys
import os
import pytest
import pytest_asyncio
import asyncio

# Add root directory to python path for testing
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.app.core.database import engine, Base
from backend.app.main import seed_initial_database

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for test session."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session", autouse=True)
async def init_test_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await seed_initial_database()
    yield
    await engine.dispose()
