import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy import func, case
from app.models import SurveyRecord
from app.database import SQLALCHEMY_DATABASE_URL

async def test():
    engine = create_async_engine(SQLALCHEMY_DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            result = await db.execute(
                select(
                    func.count().label("total"),
                    func.sum(case((SurveyRecord.status == "DRAFT", 1), else_=0)).label("draft"),
                )
                .where(SurveyRecord.created_by_student_id == 1)
            )
            print(result.first())
        except Exception as e:
            print("ERROR:", e)

asyncio.run(test())
