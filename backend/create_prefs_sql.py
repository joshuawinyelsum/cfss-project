import asyncio
from app.database import engine
from sqlalchemy import text

async def create_table():
    sql = """
    CREATE TABLE IF NOT EXISTS student_preferences (
        id VARCHAR PRIMARY KEY,
        student_id INTEGER NOT NULL UNIQUE,
        theme VARCHAR DEFAULT 'light',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(student_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS ix_student_preferences_id ON student_preferences (id);
    CREATE INDEX IF NOT EXISTS ix_student_preferences_student_id ON student_preferences (student_id);
    """
    async with engine.begin() as conn:
        await conn.execute(text(sql))
    print("Table created via raw SQL!")

asyncio.run(create_table())
