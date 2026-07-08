import asyncio
from app.database import engine
from sqlalchemy import text

async def seed_db():
    async with engine.begin() as conn:
        # Open registration
        await conn.execute(text("UPDATE system_settings SET registration_open = true"))
        
        # Insert test community
        await conn.execute(text("INSERT INTO communities (name, district, region, capacity, current_count, group_number) VALUES ('Test Community', 'Test District', 'Test Region', 10, 0, 9999) ON CONFLICT (name) DO NOTHING"))
        
        # Insert whitelist
        await conn.execute(text("INSERT INTO whitelists (id, name, status, uploaded_by) VALUES (9999, 'Test Whitelist', 'ACTIVE', 'Admin') ON CONFLICT (id) DO NOTHING"))
        
        # Insert entry
        await conn.execute(text("DELETE FROM whitelist_entries WHERE student_id = 'TEST/1234/5678'"))
        await conn.execute(text("INSERT INTO whitelist_entries (whitelist_id, student_id, full_name, program) VALUES (9999, 'TEST/1234/5678', 'Test Student', 'computer science')"))

        # Clean up user if already exists
        await conn.execute(text("DELETE FROM users WHERE student_id = 'TEST/1234/5678'"))
        
asyncio.run(seed_db())
print("DB setup complete.")
