import asyncio
from app.database import engine
from app.models import StudentPreference

async def create_table():
    async with engine.begin() as conn:
        # We can just create all tables, or specifically StudentPreference
        # Since other tables exist, create_all will only create the missing ones if using checkfirst=True (which is default)
        await conn.run_sync(StudentPreference.metadata.create_all)
    print("StudentPreference table created successfully!")

if __name__ == "__main__":
    asyncio.run(create_table())
