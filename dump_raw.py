import asyncio
import asyncpg

DATABASE_URL = "postgresql://postgres.pglovosjndpaonfxngng:Cfss%402026Strong@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    records = await conn.fetch("SELECT * FROM survey_records")
    print(f"Total survey records: {len(records)}")
    for r in records:
        print(dict(r))
    await conn.close()

asyncio.run(main())
