import asyncio
from app.database import engine
from sqlalchemy import text

async def main():
    async with engine.connect() as conn:
        try:
            print("Adding email to users...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR UNIQUE"))
            
            print("Adding is_verified to users...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE"))
            
            print("Adding is_active to users...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"))
            
            print("Adding trace_id to users...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS trace_id VARCHAR"))
            
            print("Creating index on trace_id...")
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_trace_id ON users (trace_id)"))

            print("Adding created_at to users...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"))
            
            await conn.commit()
            print("Migration complete.")
        except Exception as e:
            print(f"Error: {e}")
            await conn.rollback()
            
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(main())
