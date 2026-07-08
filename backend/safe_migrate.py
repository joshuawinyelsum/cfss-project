import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.database import DATABASE_URL

if DATABASE_URL:
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, execution_options={"isolation_level": "AUTOCOMMIT"})

async def main():
    async with engine.connect() as conn:
        try:
            print("Renaming max_capacity to capacity...")
            await conn.execute(text("ALTER TABLE communities RENAME COLUMN max_capacity TO capacity;"))
            print("Done.")
        except Exception as e:
            print(f"Skipped renaming max_capacity: {e}")

        try:
            print("Dropping group_label from communities...")
            await conn.execute(text("ALTER TABLE communities DROP COLUMN group_label;"))
            print("Done.")
        except Exception as e:
            print(f"Skipped dropping group_label: {e}")

        try:
            print("Adding district to communities...")
            await conn.execute(text("ALTER TABLE communities ADD COLUMN district VARCHAR NOT NULL DEFAULT 'Unknown';"))
            print("Done.")
        except Exception as e:
            print(f"Skipped adding district: {e}")

        try:
            print("Adding region to communities...")
            await conn.execute(text("ALTER TABLE communities ADD COLUMN region VARCHAR NOT NULL DEFAULT 'Unknown';"))
            print("Done.")
        except Exception as e:
            print(f"Skipped adding region: {e}")

    await engine.dispose()
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(main())
