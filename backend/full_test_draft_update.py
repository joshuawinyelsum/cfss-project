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
        
    record_id = str(uuid.uuid4())
    create_payload = {
        "operations": [{
            "operation_id": str(uuid.uuid4()),
            "operation_type": "CREATE",
            "entity_type": "SURVEY",
            "entity_id": record_id,
            "payload": {
                "id": record_id,
                "survey_type": "HOUSEHOLD",
                "community_id": student.community_id,
                "student_id": student.id,
                "status": "DRAFT",
                "answers": []
            }
        }]
    }
    
    update_payload = {
        "operations": [{
            "operation_id": str(uuid.uuid4()),
            "operation_type": "UPDATE",
            "entity_type": "SURVEY",
            "entity_id": record_id,
            "payload": {
                "status": "SUBMITTED",
                "answers": []
            }
        }]
    }
    
    async with httpx.AsyncClient() as client:
        await client.post(
            "http://localhost:8000/api/sync/operations",
            json=create_payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = await client.post(
            "http://localhost:8000/api/sync/operations",
            json=update_payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        print(response.status_code)
        print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    asyncio.run(run_test())
