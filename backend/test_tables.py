import asyncio
from app.database import engine
import sqlalchemy

async def main():
    async with engine.begin() as conn:
        result = await conn.execute(sqlalchemy.text('''SELECT table_name FROM information_schema.tables WHERE table_schema='public' '''))
        print([r[0] for r in result.fetchall()])

asyncio.run(main())
