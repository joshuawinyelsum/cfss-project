import asyncio
from httpx import AsyncClient
import uuid
import sys
import uvicorn
from app.main import app

import threading
import time

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8005, log_level="error")

async def test():
    thread = threading.Thread(target=run_server)
    thread.daemon = True
    thread.start()
    
    await asyncio.sleep(2)
    
    async with AsyncClient(base_url="http://127.0.0.1:8005") as ac:
        login_res = await ac.post("/api/auth/admin/login", data={"username": "admin", "password": "admin123"})
        token = login_res.json().get("access_token")
        
        res = await ac.post(
            "/api/admin/communities",
            json={"name": f"Test {uuid.uuid4()}", "district": "D", "region": "R", "capacity": 10},
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Status Code: {res.status_code}")
        print(f"Response: {res.text}")

if __name__ == "__main__":
    asyncio.run(test())
