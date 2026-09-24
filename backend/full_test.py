import asyncio
import httpx
import uuid
import datetime
from app.database import SessionLocal
from app.models import User, Community
from sqlalchemy.future import select
from app.auth import create_access_token
import json

async def run_test():
    async with SessionLocal() as db:
        res = await db.execute(select(User).where(User.role == "student"))
        student = res.scalars().first()
        if not student:
            print("No student found")
            return
        
        token = create_access_token({"sub": str(student.id), "role": "student"})
        
    record_id = str(uuid.uuid4())
    payload = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "operation_type": "CREATE",
                "entity_type": "SURVEY",
                "entity_id": record_id,
                "payload": {
                    "id": record_id,
                    "survey_type": "HOUSEHOLD",
                    "community_id": student.community_id,
                    "student_id": student.id,
                    "entity_id": "WILL_BE_OVERWRITTEN",
                    "answers": [
                        {"question_id": "q1", "answer": "Yes"}
                    ],
                    "status": "SUBMITTED",
                    "sync_status": "pending",
                    "created_at": datetime.datetime.now().isoformat() + "Z",
                    "updated_at": datetime.datetime.now().isoformat() + "Z",
                    "submitted_at": datetime.datetime.now().isoformat() + "Z"
                }
            }
        ]
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/sync/operations",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0
        )
        print(response.status_code)
        print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    asyncio.run(run_test())
