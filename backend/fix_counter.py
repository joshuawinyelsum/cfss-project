import asyncio
from app.database import SessionLocal
from sqlalchemy import text

async def fix_counter():
    async with SessionLocal() as db:
        await db.execute(text("UPDATE survey_counters SET last_count = last_count + 10"))
        await db.commit()

if __name__ == "__main__":
    asyncio.run(fix_counter())
