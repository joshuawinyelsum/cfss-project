import asyncio
from app.database import engine
import sqlalchemy

async def main():
    async with engine.begin() as conn:
        print("Dropping constraint...")
        await conn.execute(sqlalchemy.text('''
            ALTER TABLE email_verification_tokens DROP CONSTRAINT email_verification_tokens_user_id_fkey;
        '''))
        print("Truncating tokens...")
        await conn.execute(sqlalchemy.text('''
            TRUNCATE TABLE email_verification_tokens;
        '''))
        print("Altering column type to integer...")
        await conn.execute(sqlalchemy.text('''
            ALTER TABLE email_verification_tokens ALTER COLUMN user_id TYPE INTEGER USING user_id::integer;
        '''))
        print("Adding new constraint to users...")
        await conn.execute(sqlalchemy.text('''
            ALTER TABLE email_verification_tokens ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
        '''))
        print("Done!")

asyncio.run(main())
