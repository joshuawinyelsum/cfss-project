import asyncio
import httpx
from app.database import SessionLocal
from app.models import User
from sqlalchemy.future import select
from app.auth import create_access_token
import json

async def run_test():
    async with SessionLocal() as db:
        admin_res = await db.execute(select(User).where(User.role == "admin"))
        admin = admin_res.scalars().first()
        if not admin:
            print("No admin found")
            return
        
        admin_token = create_access_token({"sub": str(admin.id), "role": "admin"})
        
    async with httpx.AsyncClient() as client:
        print("--- ADMIN GET STATS ---")
        resp = await client.get(
            "http://localhost:8000/api/admin/surveys/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30.0
        )
        print(resp.status_code)
        print(json.dumps(resp.json(), indent=2))
        
        print("--- ADMIN GET ---")
        admin_resp = await client.get(
            "http://localhost:8000/api/admin/surveys",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30.0
        )
        print(admin_resp.status_code)

if __name__ == "__main__":
    asyncio.run(run_test())

