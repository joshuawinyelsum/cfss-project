import pytest
from httpx import AsyncClient
import uuid
from sqlalchemy import select

from app import models


def survey_operation(operation_type: str, entity_id: str, *, status: str = "DRAFT", answers=None):
    return {
        "operation_id": str(uuid.uuid4()),
        "operation_type": operation_type,
        "entity_type": "SURVEY",
        "entity_id": entity_id,
        "payload": {
            "survey_type": "HOUSEHOLD",
            "status": status,
            "answers": answers or [],
        },
    }

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
    student2_token = create_access_token({"sub": str(student2.id), "role": "student", "pwd_ver": student2.password_hash[-8:]})
    
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


@pytest.mark.asyncio
async def test_synced_draft_delete_creates_server_tombstone(client: AsyncClient, student_with_community: tuple, db):
    _, _, token = student_with_community
    record_id = str(uuid.uuid4())

    create = await client.post(
        "/api/sync/operations",
        json={"operations": [survey_operation("CREATE", record_id)]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create.json()["results"][0]["success"] is True

    delete = await client.post(
        "/api/sync/operations",
        json={"operations": [{
            "operation_id": str(uuid.uuid4()), "operation_type": "DELETE",
            "entity_type": "SURVEY", "entity_id": record_id,
        }]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete.json()["results"][0]["success"] is True

    record = (await db.execute(select(models.SurveyRecord).where(models.SurveyRecord.id == record_id))).scalar_one()
    assert record.status == "DELETED"

    stale_update = await client.post(
        "/api/sync/operations",
        json={"operations": [survey_operation("UPDATE", record_id)]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert stale_update.json()["results"][0]["success"] is False
    assert "deleted" in stale_update.json()["results"][0]["error"].lower()


@pytest.mark.asyncio
async def test_create_updates_coalesce_to_one_server_record(client: AsyncClient, student_with_community: tuple, db):
    _, _, token = student_with_community
    record_id = str(uuid.uuid4())
    answer_id = str(uuid.uuid4())

    response = await client.post(
        "/api/sync/operations",
        json={"operations": [
            survey_operation("CREATE", record_id),
            survey_operation("UPDATE", record_id, answers=[{"question_id": answer_id, "answer": "final"}]),
        ]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert all(result["success"] for result in response.json()["results"])
    records = (await db.execute(select(models.SurveyRecord).where(models.SurveyRecord.id == record_id))).scalars().all()
    assert len(records) == 1
    answers = (await db.execute(select(models.SurveyAnswer).where(models.SurveyAnswer.survey_record_id == record_id))).scalars().all()
    assert len(answers) == 1
    assert answers[0].answer == "final"


@pytest.mark.asyncio
async def test_retrying_create_is_idempotent_and_entity_ids_increment(client: AsyncClient, student_with_community: tuple, db):
    _, _, token = student_with_community
    first_id, second_id = str(uuid.uuid4()), str(uuid.uuid4())
    first = survey_operation("CREATE", first_id)

    for operations in ([first], [first], [survey_operation("CREATE", second_id)]):
        response = await client.post(
            "/api/sync/operations", json={"operations": operations},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.json()["results"][0]["success"] is True

    records = (await db.execute(
        select(models.SurveyRecord).where(models.SurveyRecord.id.in_([first_id, second_id]))
    )).scalars().all()
    assert len(records) == 2
    assert len({record.entity_id for record in records}) == 2


@pytest.mark.asyncio
async def test_submitted_survey_cannot_be_deleted(client: AsyncClient, student_with_community: tuple):
    _, _, token = student_with_community
    record_id = str(uuid.uuid4())
    await client.post(
        "/api/sync/operations",
        json={"operations": [survey_operation("CREATE", record_id, status="SUBMITTED")]},
        headers={"Authorization": f"Bearer {token}"},
    )
    response = await client.post(
        "/api/sync/operations",
        json={"operations": [{
            "operation_id": str(uuid.uuid4()), "operation_type": "DELETE",
            "entity_type": "SURVEY", "entity_id": record_id,
        }]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.json()["results"][0]["success"] is False
    assert "submitted" in response.json()["results"][0]["error"].lower()


@pytest.mark.asyncio
async def test_admin_can_view_synced_submitted_records(client: AsyncClient, student_with_community: tuple, admin_token: str):
    _, _, student_token = student_with_community
    record_id = str(uuid.uuid4())
    await client.post(
        "/api/sync/operations",
        json={"operations": [survey_operation("CREATE", record_id, status="SUBMITTED")]},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    headers = {"Authorization": f"Bearer {admin_token}"}
    surveys = await client.get("/api/admin/surveys", headers=headers)
    assert surveys.status_code == 200
    assert surveys.json()[0]["id"] == record_id
    assert surveys.json()[0]["type"] == "HOUSEHOLD"

    stats = await client.get("/api/admin/surveys/stats", headers=headers)
    assert stats.status_code == 200
    assert stats.json()["total_surveys"] == 1

    detail = await client.get(f"/api/admin/surveys/{record_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["id"] == record_id


@pytest.mark.asyncio
async def test_deleted_survey_hidden_from_student_endpoints(client: AsyncClient, student_with_community: tuple, db):
    _, _, token = student_with_community
    record_id = str(uuid.uuid4())

    # Create and sync
    await client.post(
        "/api/sync/operations",
        json={"operations": [survey_operation("CREATE", record_id, status="DRAFT")]},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Delete
    await client.post(
        "/api/sync/operations",
        json={"operations": [{
            "operation_id": str(uuid.uuid4()), "operation_type": "DELETE",
            "entity_type": "SURVEY", "entity_id": record_id,
        }]},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Verify hidden from dashboard stats
    stats_resp = await client.get("/api/student/surveys/dashboard/stats", headers={"Authorization": f"Bearer {token}"})
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_surveys"] == 0
    assert len(stats["recent_surveys"]) == 0

    # Verify hidden from drafts
    drafts_resp = await client.get("/api/student/surveys/drafts/all", headers={"Authorization": f"Bearer {token}"})
    assert drafts_resp.status_code == 200
    assert drafts_resp.json()["total"] == 0

    # Verify hidden from survey type listing
    type_resp = await client.get("/api/student/surveys/HOUSEHOLD", headers={"Authorization": f"Bearer {token}"})
    assert type_resp.status_code == 200
    assert len(type_resp.json()) == 0
