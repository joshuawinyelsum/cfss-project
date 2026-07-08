import asyncio
from app.database import engine
from sqlalchemy import text

async def main():
    async with engine.connect() as conn:
        try:
            print("Adding max_students_per_community...")
            await conn.execute(text("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS max_students_per_community INTEGER DEFAULT 10"))
            
            print("Adding auto_assign_enabled...")
            await conn.execute(text("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS auto_assign_enabled BOOLEAN DEFAULT TRUE"))
            
            print("Adding assignment_strategy...")
            await conn.execute(text("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS assignment_strategy VARCHAR DEFAULT 'balanced'"))
            
            print("Adding survey_enabled...")
            await conn.execute(text("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS survey_enabled BOOLEAN DEFAULT FALSE"))
            
            print("Adding survey_deadline...")
            await conn.execute(text("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS survey_deadline TIMESTAMP WITH TIME ZONE"))
            
            print("Adding allow_multiple_submissions...")
            await conn.execute(text("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS allow_multiple_submissions BOOLEAN DEFAULT FALSE"))

            print("Adding default_page_size...")
            await conn.execute(text("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS default_page_size INTEGER DEFAULT 100"))
            
            await conn.commit()
            print("Settings migration complete.")
        except Exception as e:
            print(f"Error: {e}")
            await conn.rollback()
            
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(main())
