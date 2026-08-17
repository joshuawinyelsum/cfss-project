"""Initialize the database schema on first boot.

The alembic history in this repo is stale and incomplete (it even creates a
`system_users` table that no longer matches app/models.py), so on a fresh
database we create tables straight from the models and seed the survey
question bank instead. Idempotent: running it on every boot is safe because
create_all uses checkfirst and seed_questions skips existing rows.
"""
import asyncio

from app.database import engine, Base
from app import models  # noqa: F401  registers every table on Base.metadata


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from seed_surveys import seed_questions

    await seed_questions()


if __name__ == "__main__":
    asyncio.run(init_db())
