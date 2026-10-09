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
        admin_res = await db.execute(select(User).where(User.role == "admin"))
        admin = admin_res.scalars().first()
        if not student or not admin:
            print("No student or admin found")
            return
        
        token = create_access_token({"sub": str(student.id), "role": "student"})
        admin_token = create_access_token({"sub": str(admin.id), "role": "admin"})
        
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
                        {"question_id": "e16cfdbd-45b3-47c9-85dd-ead62dcccfa4", "answer": "Yes"}
                    ],
                    "status": "DRAFT",
                    "sync_status": "pending",
                    "created_at": datetime.datetime.now(datetime.UTC).isoformat().replace("+00:00", "Z"),
                    "updated_at": datetime.datetime.now(datetime.UTC).isoformat().replace("+00:00", "Z"),
                }
            }
        ]
    }
    
    async with httpx.AsyncClient() as client:
        print("--- DRAFT SYNC ---")
        response = await client.post(
            "http://localhost:8000/api/sync/operations",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0
        )
        print(response.status_code)
        print(json.dumps(response.json(), indent=2))

        payload["operations"][0]["operation_id"] = str(uuid.uuid4())
        payload["operations"][0]["operation_type"] = "UPDATE"
        payload["operations"][0]["payload"]["status"] = "SUBMITTED"
        payload["operations"][0]["payload"]["submitted_at"] = datetime.datetime.now(datetime.UTC).isoformat().replace("+00:00", "Z")
        payload["operations"][0]["payload"]["answers"] = [{"question_id": "e16cfdbd-45b3-47c9-85dd-ead62dcccfa4", "answer": "No"}]

        print("--- SUBMIT SYNC ---")
        response2 = await client.post(
            "http://localhost:8000/api/sync/operations",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0
        )
        print(response2.status_code)
        print(json.dumps(response2.json(), indent=2))

        print("--- ADMIN GET ---")
        admin_resp = await client.get(
            "http://localhost:8000/api/admin/surveys",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30.0
        )
        print(admin_resp.status_code)
        surveys = admin_resp.json()
        print(f"Total surveys found: {len(surveys)}")
        found = any(s["id"] == record_id for s in surveys)
        print(f"Is our survey visible? {found}")

        print("--- ADMIN GET SURVEY DETAILS ---")
        if found:
            detail_resp = await client.get(
                f"http://localhost:8000/api/admin/surveys/{record_id}",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=30.0
            )
            print(detail_resp.status_code)
            print(json.dumps(detail_resp.json(), indent=2))


if __name__ == "__main__":
    asyncio.run(run_test())
