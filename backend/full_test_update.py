import asyncio
from app.database import SessionLocal
from app.models import User, SurveyRecord
from sqlalchemy.future import select
from app.auth import create_access_token
import uuid
import datetime
import httpx
import json

async def run_test():
    async with SessionLocal() as db:
        res = await db.execute(select(User).where(User.role == "student"))
        student = res.scalars().first()
        token = create_access_token({"sub": str(student.id), "role": "student"})
        
        res = await db.execute(select(SurveyRecord).where(SurveyRecord.created_by_student_id == student.id))
        survey = res.scalars().first()
        if not survey:
            print("No survey found to update")
            return
            
    payload = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "operation_type": "UPDATE",
                "entity_type": "SURVEY",
                "entity_id": survey.id,
                "payload": {
                    "status": "SUBMITTED",
                    "answers": []
                }
            }
        ]
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/sync/operations",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        print(response.status_code)
        print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    asyncio.run(run_test())
