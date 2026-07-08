from fastapi.testclient import TestClient
import asyncio
from app.main import app
from app.database import get_db, SessionLocal
from app import models
import traceback
from sqlalchemy import select

def test():
    # We will use TestClient, but we need an auth token or bypass the dependency.
    # To bypass get_current_student:
    from app.routers.student_surveys import get_current_student
    
    async def mock_get_current_student():
        # Get a real student and community
        async with SessionLocal() as db:
            result = await db.execute(select(models.User).where(models.User.role == "student").limit(1))
            user = result.scalars().first()
            if not user:
                raise Exception("No student")
            result = await db.execute(select(models.Community).where(models.Community.id == user.community_id))
            community = result.scalars().first()
            return user, community

    # We must patch it synchronously or use FastAPI dependency overrides
    app.dependency_overrides[get_current_student] = mock_get_current_student
    
    client = TestClient(app)
    
    # create a survey record first? No, we don't know the token.
    # Actually, we can just hit the create endpoint.
    from app.routers.student_surveys import create_survey
    # Wait, create_survey requires Depends(get_current_student) as well!
    # So we can just hit it via TestClient!
    
    resp = client.post("/api/student/surveys/create", json={"survey_type": "HOUSEHOLD"})
    print("Create:", resp.status_code, resp.json())
    if resp.status_code != 200:
        return
        
    record_id = resp.json()["id"]
    
    # Save draft
    resp = client.put(f"/api/student/surveys/record/{record_id}/draft", json={"answers": []})
    print("Save draft:", resp.status_code, resp.json())

if __name__ == "__main__":
    test()
