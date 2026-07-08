import asyncio
from app.database import SessionLocal
from app.models import Community
from sqlalchemy.future import select
from sqlalchemy import func
import uuid

async def test():
    async with SessionLocal() as db:
        max_group_result = await db.execute(select(func.max(Community.group_number)))
        max_group = max_group_result.scalar() or 0
        next_group = max_group + 1
        
        new_community = Community(
            name=f"Test_{uuid.uuid4()}",
            district="D",
            region="R",
            capacity=10,
            current_count=0,
            group_number=next_group
        )
        db.add(new_community)
        try:
            await db.flush()
            await db.commit()
            print("Success")
        except Exception as e:
            print("Error:")
            print(type(e))
            print(e)

if __name__ == "__main__":
    asyncio.run(test())
