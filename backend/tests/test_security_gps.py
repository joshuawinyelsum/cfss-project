import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models import SurveyRecord, FieldFeature, Community, User
from app.auth import get_password_hash, create_access_token
from datetime import timedelta

async def create_user_comm(db, name, email):
    comm = Community(name=name, district="D", region="R", capacity=10)
    db.add(comm)
    await db.commit()
    await db.refresh(comm)
    user = User(
        name=name,
        email=email,
        hashed_password=get_password_hash("pwd"),
        role="student",
        is_active=True,
        community_id=comm.id
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token({"sub": user.email, "role": user.role, "pwd_ver": user.password_version})
    return user, comm, token

@pytest.mark.asyncio
async def test_cross_community_feature_link(client: AsyncClient, db: AsyncSession):
    u1, c1, t1 = await create_user_comm(db, "enemy", "e@e.com")
    u2, c2, t2 = await create_user_comm(db, "victim", "v@v.com")
    
    feature_id = "victim-feature"
    await client.post("/api/sync/operations", json={
        "operations": [{
            "operation_id": "op1", "operation_type": "CREATE", "entity_type": "FEATURE",
            "entity_id": feature_id, "payload": {"latitude": 10.0, "longitude": 10.0}
        }]
    }, headers={"Authorization": f"Bearer {t2}"})
    
    res = await client.post("/api/sync/operations", json={
        "operations": [{
            "operation_id": "op2", "operation_type": "CREATE", "entity_type": "SURVEY",
            "entity_id": "enemy-survey", "payload": {"survey_type": "HEALTH", "field_feature_id": feature_id, "answers": []}
        }]
    }, headers={"Authorization": f"Bearer {t1}"})
    
    data = res.json()
    assert data["results"][0]["success"] is False
    assert "belongs to a different community" in data["results"][0]["error"]
