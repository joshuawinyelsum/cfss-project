"""
conftest.py – Shared test fixtures for CFSS backend stabilization tests.

Uses an in-memory SQLite database so tests run without a real PostgreSQL server.
Patches the database module AFTER import to replace the Postgres engine with SQLite.
Registers a JSONB → JSON type adapter so PostgreSQL-specific columns work on SQLite.
"""
import asyncio
import os

# ── Set env vars FIRST, before any app module import ──────────────────────────
os.environ["DATABASE_URL"] = "postgresql+asyncpg://test:test@localhost:5432/testdb"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-only"

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import JSON, event
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.database import Base, get_db
from app.main import app
from app import auth, models
from app import database as db_module

# ── Replace JSONB with JSON so SQLite can handle PostgreSQL models ────────────
# Walk all tables and swap JSONB columns to JSON at the metadata level.
for table in Base.metadata.tables.values():
    for column in table.columns:
        if isinstance(column.type, JSONB):
            column.type = JSON()

# ── Replace the production engine with a SQLite test engine ───────────────────
TEST_DB_URL = "sqlite+aiosqlite://"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine, class_=AsyncSession
)

# Patch the module-level references so lifespan and other code use our test DB
db_module.engine = test_engine
db_module.SessionLocal = TestSession


async def override_get_db():
    async with TestSession() as session:
        yield session


# Wire the override into FastAPI's dependency injection
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create all tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db():
    """Provide a test database session."""
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    """ASGI test client that talks to the app without network I/O."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def admin_token(db):
    """Create an admin user and return a valid JWT."""
    admin = models.User(
        student_id="ADMIN",
        name="Test Admin",
        email="admin@test.local",
        password_hash=auth.get_password_hash("admin123"),
        role="admin",
        level=0,
        is_active=True,
        is_verified=True,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    from datetime import timedelta

    token = auth.create_access_token(
        data={"sub": str(admin.id), "role": "admin", "pwd_ver": admin.password_hash[-8:]},
        expires_delta=timedelta(hours=1),
    )
    return token


@pytest_asyncio.fixture
async def student_with_community(db):
    """Create a community + student user; return (student, community, token)."""
    community = models.Community(
        name="TestCommunity",
        district="TestDistrict",
        region="TestRegion",
        capacity=20,
        current_count=1,
        group_number=99,
    )
    db.add(community)
    await db.flush()

    student = models.User(
        student_id="TST/0001/0001",
        name="Test Student",
        email="student@test.local",
        password_hash=auth.get_password_hash("Student1!"),
        role="student",
        level=1,
        is_active=True,
        is_verified=True,
        community_id=community.id,
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)

    from datetime import timedelta

    token = auth.create_access_token(
        data={"sub": str(student.id), "role": "student", "pwd_ver": student.password_hash[-8:]},
        expires_delta=timedelta(hours=1),
    )
    return student, community, token
