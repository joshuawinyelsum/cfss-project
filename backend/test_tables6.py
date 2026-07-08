import asyncio
from app.database import engine
import sqlalchemy

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(sqlalchemy.text('SELECT email, is_verified FROM users ORDER BY created_at DESC LIMIT 5'))
        print(res.fetchall())

asyncio.run(main())
