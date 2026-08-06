import asyncio
import asyncpg

import os

DATABASE_URL = os.environ["DATABASE_URL"]

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    records = await conn.fetch("SELECT * FROM survey_records")
    print(f"Total survey records: {len(records)}")
    for r in records:
        print(dict(r))
    await conn.close()

asyncio.run(main())
