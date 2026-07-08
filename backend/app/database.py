import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

# PostgreSQL connection to Supabase via IPv4 Connection Pooler
# Password '@' symbol is URL encoded as '%40'
DATABASE_URL = "postgresql+asyncpg://postgres.pglovosjndpaonfxngng:Cfss%402026Strong@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"

engine = create_async_engine(
    DATABASE_URL, 
    echo=False, 
    connect_args={
        "statement_cache_size": 0, 
        "prepared_statement_cache_size": 0
    }
)
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)
Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session
