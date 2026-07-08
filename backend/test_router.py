import asyncio
from httpx import AsyncClient
from app.main import app
import uuid

async def test():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        login_res = await ac.post("/api/auth/admin/login", data={"username": "admin", "password": "admin123"})
        token = login_res.json().get("access_token")
        
        res = await ac.post(
            "/api/admin/communities",
            json={"name": f"Test {uuid.uuid4()}", "district": "D", "region": "R", "capacity": 10},
            headers={"Authorization": f"Bearer {token}"}
        )
        print(res.status_code)
        print(res.text)

if __name__ == "__main__":
    asyncio.run(test())
