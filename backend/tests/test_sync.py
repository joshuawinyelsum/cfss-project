import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.asyncio
async def test_unauthenticated_sync(client: AsyncClient):
    payload = {"operations": []}
    response = await client.post("/api/sync/operations", json=payload)
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_student_can_sync_own_record(client: AsyncClient, student_with_community: tuple):
    user, community, student_token = student_with_community
    community_id = user.community_id
    client_id = str(uuid.uuid4())
    payload = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "operation_type": "CREATE",
                "entity_type": "SURVEY",
                "entity_id": client_id,
                "payload": {
                    "survey_type": "HOUSEHOLD",
                    "community_id": community_id,
                    "status": "DRAFT",
                    "answers": []
                }
            }
        ]
    }
    response = await client.post("/api/sync/operations", json=payload, headers={"Authorization": f"Bearer {student_token}"})
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    assert len(res_data["results"]) == 1
    assert res_data["results"][0]["success"] is True, str(res_data)

@pytest.mark.asyncio
async def test_sync_duplicate_idempotency(client: AsyncClient, student_with_community: tuple):
    user, community, student_token = student_with_community
    community_id = user.community_id
    client_id = str(uuid.uuid4())
    payload = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "operation_type": "CREATE",
                "entity_type": "SURVEY",
                "entity_id": client_id,
                "payload": {
                    "survey_type": "HOUSEHOLD",
                    "community_id": community_id,
                    "status": "DRAFT",
                    "answers": []
                }
            }
        ]
    }
    # First sync
    res1 = await client.post("/api/sync/operations", json=payload, headers={"Authorization": f"Bearer {student_token}"})
    assert res1.status_code == 200
    
    # Second sync (duplicate retry - simulate UPDATE)
    payload["operations"][0]["operation_type"] = "UPDATE"
    res2 = await client.post("/api/sync/operations", json=payload, headers={"Authorization": f"Bearer {student_token}"})
    assert res2.status_code == 200
    assert res2.json()["results"][0]["success"] is True

@pytest.mark.asyncio
async def test_cannot_edit_other_students_record(client: AsyncClient, student_with_community: tuple, db):
    user, community, student_token = student_with_community
    community_id = user.community_id
    
    # We need a second student to test isolation.
    from app.models import User
    from app.auth import get_password_hash, create_access_token
    student2 = User(
        student_id="STU/999/26",
        name="Student Two",
        password_hash=get_password_hash("password"),
        role="student",
        level="100",
        is_active=True,
        community_id=community_id
    )
    db.add(student2)
    await db.commit()
    await db.refresh(student2)
    student2_token = create_access_token({"sub": str(student2.id), "role": "student"})
    
    # Student 1 creates
    client_id = str(uuid.uuid4())
    payload = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "operation_type": "CREATE",
                "entity_type": "SURVEY",
                "entity_id": client_id,
                "payload": {
                    "survey_type": "HOUSEHOLD",
                    "community_id": community_id,
                    "status": "DRAFT",
                    "answers": []
                }
            }
        ]
    }
    await client.post("/api/sync/operations", json=payload, headers={"Authorization": f"Bearer {student_token}"})
    
    # Student 2 tries to edit
    payload2 = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "operation_type": "UPDATE",
                "entity_type": "SURVEY",
                "entity_id": client_id,
                "payload": {
                    "survey_type": "HOUSEHOLD",
                    "community_id": community_id,
                    "status": "SUBMITTED",
                    "answers": []
                }
            }
        ]
    }
    res = await client.post("/api/sync/operations", json=payload2, headers={"Authorization": f"Bearer {student2_token}"})
    assert res.status_code == 200
    assert res.json()["results"][0]["success"] is False
    assert "Not authorized" in res.json()["results"][0]["error"]

@pytest.mark.asyncio
async def test_partial_batch_failure(client: AsyncClient, student_with_community: tuple):
    user, community, student_token = student_with_community
    community_id = user.community_id
    valid_id = str(uuid.uuid4())
    payload = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "operation_type": "CREATE",
                "entity_type": "SURVEY",
                "entity_id": valid_id,
                "payload": {
                    "survey_type": "HOUSEHOLD",
                    "community_id": community_id,
                    "status": "DRAFT",
                    "answers": []
                }
            },
            {
                # Invalid entity_type should fail
                "operation_id": str(uuid.uuid4()),
                "operation_type": "CREATE",
                "entity_type": "INVALID",
                "entity_id": str(uuid.uuid4()),
                "payload": {}
            }
        ]
    }
    res = await client.post("/api/sync/operations", json=payload, headers={"Authorization": f"Bearer {student_token}"})
    data = res.json()
    print("partial batch data:", data)
    assert data["success"] is True
    assert len(data["results"]) == 2
    
    # First should succeed
    assert data["results"][0]["success"] is True, str(data)
    # Second should fail
    assert data["results"][1]["success"] is False

