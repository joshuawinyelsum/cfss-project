import asyncio
import httpx
from app.database import SessionLocal
from app import models
from sqlalchemy import select

async def get_test_token():
    async with SessionLocal() as db:
        result = await db.execute(select(models.User).where(models.User.role == "student").limit(1))
        user = result.scalars().first()
        from app.auth import create_access_token
        return create_access_token({"sub": str(user.id)})

async def main():
    token = await get_test_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
        resp = await client.post("/api/student/surveys/create", json={"survey_type": "HOUSEHOLD"}, headers=headers)
        print("Create:", resp.status_code, resp.json())
        if resp.status_code != 200:
            return
            
        record_id = resp.json()["id"]
        
        resp = await client.put(f"/api/student/surveys/record/{record_id}/draft", json={"answers": []}, headers=headers)
        print("Save draft:", resp.status_code, resp.json())
        
        resp = await client.get("/api/student/surveys/drafts/all", headers=headers)
        print("Drafts:", resp.status_code, len(resp.json()["items"]))
        
        resp = await client.post(f"/api/student/surveys/record/{record_id}/submit", json={"answers": []}, headers=headers)
        print("Submit (should fail):", resp.status_code, resp.json())
        
        resp = await client.get(f"/api/student/surveys/record/{record_id}", headers=headers)
        questions = resp.json()["questions"]
        answers = [{"question_id": q["id"], "answer": "Test"} for q in questions if q["required"]]
        
        resp = await client.post(f"/api/student/surveys/record/{record_id}/submit", json={"answers": answers}, headers=headers)
        print("Submit proper:", resp.status_code, resp.json())
        
        resp = await client.get("/api/student/surveys/submitted/all", headers=headers)
        print("Submitted:", resp.status_code, len(resp.json()["items"]))

if __name__ == "__main__":
    asyncio.run(main())
