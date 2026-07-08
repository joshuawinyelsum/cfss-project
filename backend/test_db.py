import asyncio
from sqlalchemy.future import select
from app.database import SessionLocal
from app.models import StudentPreference

async def test():
    async with SessionLocal() as db:
        res = await db.execute(select(StudentPreference))
        print('Success:', len(res.scalars().all()))

asyncio.run(test())
