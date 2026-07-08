"""DB migration for student auth system rebuild."""
import asyncio
from app.database import engine
from sqlalchemy import text

async def run():
    async with engine.begin() as conn:
        # 1. Add full_name column to whitelist_entries
        await conn.execute(text("ALTER TABLE whitelist_entries ADD COLUMN IF NOT EXISTS full_name VARCHAR"))
        print("full_name column added to whitelist_entries")
        
        # 2. Add CHECK constraint to communities (drop first if exists to be idempotent)
        try:
            await conn.execute(text("ALTER TABLE communities DROP CONSTRAINT IF EXISTS check_capacity"))
            await conn.execute(text("ALTER TABLE communities ADD CONSTRAINT check_capacity CHECK (current_count <= capacity)"))
            print("CHECK(current_count <= capacity) constraint added to communities")
        except Exception as e:
            print(f"CHECK constraint warning: {e}")
    
    print("Migration complete")

asyncio.run(run())
