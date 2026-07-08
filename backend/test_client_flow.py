from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models
from sqlalchemy import select

def test():
    from app.routers.student_surveys import get_current_student
    
    async def mock_get_current_student():
        async with SessionLocal() as db:
            result = await db.execute(select(models.User).where(models.User.role == "student").limit(1))
            user = result.scalars().first()
            if not user:
                raise Exception("No student")
            
            # Ensure the user has a community
            if not user.community_id:
                # Assign to community 1 or create one
                result = await db.execute(select(models.Community).limit(1))
                community = result.scalars().first()
                if not community:
                    community = models.Community(id=1, name="Test Community", region="Test Region", district="Test District")
                    db.add(community)
                    await db.commit()
                    await db.refresh(community)
                user.community_id = community.id
                await db.commit()
            
            result = await db.execute(select(models.Community).where(models.Community.id == user.community_id))
            community = result.scalars().first()
            return user, community

    app.dependency_overrides[get_current_student] = mock_get_current_student
    
    client = TestClient(app)
    
    # 1. Create survey
    resp = client.post("/api/student/surveys/create", json={"survey_type": "HOUSEHOLD"})
    print("Create:", resp.status_code, resp.json())
    if resp.status_code != 200:
        return
        
    record_id = resp.json()["id"]
    
    # 2. Get survey record
    resp = client.get(f"/api/student/surveys/record/{record_id}")
    print("Get record:", resp.status_code)
    
    # 3. Save draft
    resp = client.put(f"/api/student/surveys/record/{record_id}/draft", json={"answers": []})
    print("Save draft:", resp.status_code, resp.json())
    
    # 4. Check drafts
    resp = client.get("/api/student/surveys/drafts/all")
    print("Drafts:", resp.status_code, len(resp.json()["items"]))
    
    # 5. Submit survey (with missing fields to see 400)
    resp = client.post(f"/api/student/surveys/record/{record_id}/submit", json={"answers": []})
    print("Submit (should fail due to required):", resp.status_code, resp.json())

    # Get required questions to submit
    resp = client.get(f"/api/student/surveys/record/{record_id}")
    questions = resp.json()["questions"]
    answers = [{"question_id": q["id"], "answer": "Test"} for q in questions if q["required"]]
    
    # Submit properly
    resp = client.post(f"/api/student/surveys/record/{record_id}/submit", json={"answers": answers})
    print("Submit properly:", resp.status_code, resp.json())
    
    # 6. Check submitted
    resp = client.get("/api/student/surveys/submitted/all")
    print("Submitted:", resp.status_code, len(resp.json()["items"]))

if __name__ == "__main__":
    test()
