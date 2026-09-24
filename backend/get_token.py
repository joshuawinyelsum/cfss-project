import asyncio
from app.database import SessionLocal
from app.models import User, Community
from sqlalchemy.future import select
from app.auth import create_access_token

async def get_test_token():
    async with SessionLocal() as db:
        res = await db.execute(select(User).where(User.role == "student"))
        student = res.scalars().first()
        if student:
            return create_access_token({"sub": student.student_id, "role": "student"})
        return None

if __name__ == "__main__":
    token = asyncio.run(get_test_token())
    print("Token:", token)
