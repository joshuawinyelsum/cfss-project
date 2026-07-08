import asyncio
from app.database import engine, SessionLocal
from app.models import User
from app.auth import get_password_hash

async def main():
    async with SessionLocal() as db:
        new_user = User(
            student_id="test_student_123",
            name="Test Student",
            email="test@example.com",
            password_hash=get_password_hash("password"),
            program="Computer Science",
            level=1,
            role="student"
        )
        db.add(new_user)
        await db.commit()
        print("Student created")

if __name__ == '__main__':
    asyncio.run(main())
