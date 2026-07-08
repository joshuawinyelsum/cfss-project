import asyncio
from sqlalchemy import text
from app.database import engine
from app.models import Base

async def reset_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.execute(text("DROP TABLE IF EXISTS alembic_version CASCADE"))
        # Drop whitelist_entries if it exists
        await conn.execute(text("DROP TABLE IF EXISTS whitelist_entries CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS system_users CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS users CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS communities CASCADE"))
        await conn.execute(text("DROP TABLE IF EXISTS groups CASCADE"))

asyncio.run(reset_db())
