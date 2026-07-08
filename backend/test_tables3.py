import asyncio
from app.database import engine
import sqlalchemy

async def main():
    async with engine.begin() as conn:
        r1 = await conn.execute(sqlalchemy.text('SELECT * FROM users'))
        for row in r1:
            print("USERS:", row)
        r2 = await conn.execute(sqlalchemy.text('SELECT * FROM system_users'))
        for row in r2:
            print("SYSTEM_USERS:", row)

asyncio.run(main())
