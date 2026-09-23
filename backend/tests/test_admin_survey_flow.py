import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_admin_survey_visibility_and_idempotency(db, client, student_with_community, admin_token):
    student, community, token = student_with_community
    
    # 2. Sync CREATE operation (status=SUBMITTED)
    import uuid
    from datetime import datetime, timezone
    
    entity_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()
    
    payload = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "operation_type": "CREATE",
                "entity_type": "SURVEY",
                "entity_id": entity_id,
                "created_at": now_str,
                "payload": {
                    "id": entity_id,
                    "survey_type": "HOUSEHOLD",
                    "status": "SUBMITTED",
                    "sync_status": "pending",
                    "answers": [],
                    "created_at": now_str,
                    "updated_at": now_str,
                    "submitted_at": now_str,
                }
            }
        ]
    }
    
    sync_resp = await client.post(
        "/api/sync/operations", 
        json=payload, 
        headers={"Authorization": f"Bearer {token}"}
    )
    assert sync_resp.status_code == 200
    
    # 3. Test Idempotency (Sync UPDATE on submitted survey)
    payload_update = {
        "operations": [
            {
                "operation_id": str(uuid.uuid4()),
                "operation_type": "UPDATE",
                "entity_type": "SURVEY",
                "entity_id": entity_id,
                "created_at": now_str,
                "payload": {
                    "id": entity_id,
                    "survey_type": "HOUSEHOLD",
                    "status": "SUBMITTED",
                    "sync_status": "pending",
                    "answers": [],
                }
            }
        ]
    }
    
    update_resp = await client.post(
        "/api/sync/operations", 
        json=payload_update, 
        headers={"Authorization": f"Bearer {token}"}
    )
    assert update_resp.status_code == 200
    assert "Cannot edit a submitted survey" in update_resp.json()["results"][0]["error"]
    
    # 4. Check Admin Visibility (Should be paginated correctly and visible)
    admin_surveys = await client.get(
        "/api/admin/surveys",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_surveys.status_code == 200, f"Error: {admin_surveys.text}"
    
    surveys = admin_surveys.json()
    found = False
    for s in surveys:
        if s["id"] == entity_id:
            found = True
            assert s["student_id"] == student.student_id
            assert s["student_name"] == student.name
            break
            
    assert found, "Submitted survey must be visible in Admin API"
