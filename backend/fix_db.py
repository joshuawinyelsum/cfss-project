import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.database import DATABASE_URL

# Connect directly to the pooler port, but disable statement cache so DDL works through PgBouncer
engine = create_async_engine(
    DATABASE_URL, 
    connect_args={
        "statement_cache_size": 0, 
        "prepared_statement_cache_size": 0
    }
)

async def run():
    async with engine.connect() as conn:
        try:
            await conn.execute(text('TRUNCATE alembic_version;'))
            await conn.commit()
            print("Truncated alembic_version")
        except Exception as e:
            await conn.rollback()
            print("Could not truncate alembic_version:", e)
        
        try:
            await conn.execute(text('ALTER TABLE communities ADD COLUMN current_count INTEGER NOT NULL DEFAULT 0;'))
            await conn.commit()
            print("Added current_count to communities")
        except Exception as e:
            await conn.rollback()
            print("Could not add current_count:", e)
            
        try:
            await conn.execute(text('ALTER TABLE communities ADD COLUMN group_number INTEGER UNIQUE;'))
            await conn.commit()
            # Generate group numbers
            await conn.execute(text('UPDATE communities SET group_number = id_seq.nextval FROM (SELECT id, row_number() over () as nextval FROM communities) as id_seq WHERE communities.id = id_seq.id;'))
            await conn.commit()
            await conn.execute(text('ALTER TABLE communities ALTER COLUMN group_number SET NOT NULL;'))
            await conn.commit()
            print("Added group_number to communities")
        except Exception as e:
            await conn.rollback()
            print("Could not add group_number:", e)
            
        try:
            await conn.execute(text('DROP TABLE groups;'))
            await conn.commit()
            print("Dropped groups table")
        except Exception as e:
            await conn.rollback()
            print("Could not drop groups:", e)

if __name__ == '__main__':
    asyncio.run(run())
