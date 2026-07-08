import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String

DATABASE_URL = "postgresql+asyncpg://postgres.pglovosjndpaonfxngng:Cfss%402026Strong@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"

engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class SurveyRecord(Base):
    __tablename__ = "survey_records"
    id = Column(String, primary_key=True)
    community_id = Column(Integer)
    created_by_student_id = Column(String)
    status = Column(String)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    student_id = Column(String)

async def test():
    async with SessionLocal() as session:
        result = await session.execute(select(SurveyRecord).limit(10))
        records = result.scalars().all()
        for r in records:
            print(f"Record {r.id}: created_by_student_id={r.created_by_student_id!r}, status={r.status!r}, community_id={r.community_id}")

        result2 = await session.execute(select(User).limit(5))
        users = result2.scalars().all()
        for u in users:
            print(f"User {u.id}: student_id={u.student_id!r}")

asyncio.run(test())
