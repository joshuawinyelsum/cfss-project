import pytest
import uuid
from datetime import datetime, timezone
from app import models, auth

@pytest.mark.asyncio
async def test_survey_collection_toggle_requires_valid_password(client, admin_token):
    # 1. Invalid password -> 403 Forbidden
    res_fail = await client.put(
        "/api/admin/settings/survey-collection",
        json={"survey_enabled": True, "admin_password": "wrongpassword"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_fail.status_code == 403

    # 2. Valid password ("admin123") -> 200 OK and survey_enabled updated
    res_ok = await client.put(
        "/api/admin/settings/survey-collection",
        json={"survey_enabled": True, "admin_password": "admin123"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_ok.status_code == 200
    assert res_ok.json()["survey_enabled"] is True

    # 3. Disable survey collection
    res_disable = await client.put(
        "/api/admin/settings/survey-collection",
        json={"survey_enabled": False, "admin_password": "admin123"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_disable.status_code == 200
    assert res_disable.json()["survey_enabled"] is False

@pytest.mark.asyncio
async def test_admin_community_students_endpoint(db, client, student_with_community, admin_token):
    student, community, _ = student_with_community
    db.add(student)
    await db.refresh(student)
    comm_id = student.community_id

    res = await client.get(
        f"/api/admin/communities/{comm_id}/students",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    students_list = res.json()
    assert isinstance(students_list, list)
    assert len(students_list) >= 1
    matched = [s for s in students_list if s["student_id"] == student.student_id]
    assert len(matched) == 1
    assert matched[0]["name"] == student.name

@pytest.mark.asyncio
async def test_admin_survey_stats_and_filters(db, client, student_with_community, admin_token):
    student, community, token = student_with_community
    db.add(student)
    await db.refresh(student)
    comm_id = student.community_id

    # Create a survey record via sync
    entity_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()
    sync_resp = await client.post(
        "/api/sync/operations",
        json={
            "operations": [
                {
                    "operation_id": str(uuid.uuid4()),
                    "operation_type": "CREATE",
                    "entity_type": "SURVEY",
                    "entity_id": entity_id,
                    "created_at": now_str,
                    "payload": {
                        "id": entity_id,
                        "survey_type": "HEALTH",
                        "status": "SUBMITTED",
                        "sync_status": "synced",
                        "answers": [],
                        "created_at": now_str,
                        "updated_at": now_str,
                        "submitted_at": now_str,
                    }
                }
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert sync_resp.status_code == 200

    # Test GET /api/admin/surveys/stats
    stats_res = await client.get(
        "/api/admin/surveys/stats",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_surveys" in stats
    assert "by_community" in stats
    assert "by_type" in stats
    assert "submitted_today" in stats
    assert "submitted_last_7_days" in stats
    assert "submitted_last_30_days" in stats
    assert stats["total_surveys"] >= 1

    # Test filtered GET /api/admin/surveys
    filter_res = await client.get(
        f"/api/admin/surveys?survey_type=HEALTH&community_id={comm_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert filter_res.status_code == 200
    filtered_items = filter_res.json()
    assert any(item["id"] == entity_id for item in filtered_items)

    # Test CSV Export
    export_res = await client.get(
        f"/admin/export/surveys?survey_type=HEALTH",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers["content-type"]
    assert entity_id in export_res.text

