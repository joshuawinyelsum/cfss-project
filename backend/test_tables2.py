import asyncio
from app.database import engine
import sqlalchemy

async def main():
    async with engine.begin() as conn:
        r1 = await conn.execute(sqlalchemy.text('SELECT count(*) FROM users'))
        r2 = await conn.execute(sqlalchemy.text('SELECT count(*) FROM system_users'))
        print(f"users: {r1.scalar()}, system_users: {r2.scalar()}")

asyncio.run(main())
