import asyncio
from app.database import engine
from sqlalchemy import text

async def run_migration():
    queries = [
        "ALTER TABLE survey_records ADD COLUMN IF NOT EXISTS sync_status VARCHAR NOT NULL DEFAULT 'synced'",
        "ALTER TABLE survey_records ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE survey_records ADD COLUMN IF NOT EXISTS sync_error VARCHAR",
        """
        CREATE TABLE IF NOT EXISTS admin_notifications (
            id SERIAL PRIMARY KEY,
            type VARCHAR NOT NULL,
            title VARCHAR NOT NULL,
            message VARCHAR NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_admin_notifications_type ON admin_notifications (type)",
        "CREATE INDEX IF NOT EXISTS ix_admin_notifications_is_read ON admin_notifications (is_read)"
    ]
    
    async with engine.begin() as conn:
        for q in queries:
            await conn.execute(text(q))
            
    print("Migration successful!")

asyncio.run(run_migration())
