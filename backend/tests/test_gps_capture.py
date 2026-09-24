import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import models

@pytest.mark.asyncio
async def test_survey_with_gps_capture_sync(client: AsyncClient, student_with_community, db: AsyncSession):
    student, community, token = student_with_community
    await db.refresh(community)
    comm_id = community.id
    
    feature_id = "gps-feature-uuid"
    survey_id = "gps-survey-uuid"
    
    # Send both operations in one batch, exactly as the frontend will queue them
    sync_payload = {
        "operations": [
            {
                "operation_id": "op-feat-1",
                "operation_type": "CREATE",
                "entity_type": "FEATURE",
                "entity_id": feature_id,
                "payload": {
                    "feature_type": "HEALTH",
                    "latitude": 10.123,
                    "longitude": -1.234,
                    "accuracy_meters": 5.0
                }
            },
            {
                "operation_id": "op-surv-1",
                "operation_type": "CREATE",
                "entity_type": "SURVEY",
                "entity_id": survey_id,
                "payload": {
                    "survey_type": "HEALTH",
                    "status": "DRAFT",
                    "field_feature_id": feature_id,
                    "answers": []
                }
            }
        ]
    }
    
    res = await client.post(
        "/api/sync/operations",
        json=sync_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["results"]) == 2
    
    # 1. Verify feature is saved and isolated to the community
    feat_res = await db.execute(select(models.FieldFeature).where(models.FieldFeature.id == feature_id))
    feature = feat_res.scalars().first()
    assert feature is not None
    assert feature.latitude == 10.123
    assert feature.longitude == -1.234
    assert feature.community_id == comm_id
    
    # 2. Verify survey is saved and linked to feature
    surv_res = await db.execute(select(models.SurveyRecord).where(models.SurveyRecord.id == survey_id))
    survey = surv_res.scalars().first()
    assert survey is not None
    assert survey.field_feature_id == feature_id
    assert survey.community_id == comm_id

    # 3. Test invalid coordinates update on the feature
    bad_payload = {
        "operations": [
            {
                "operation_id": "op-feat-bad",
                "operation_type": "UPDATE",
                "entity_type": "FEATURE",
                "entity_id": feature_id,
                "payload": {
                    "latitude": 100.0, # invalid
                    "longitude": -1.234,
                }
            }
        ]
    }
    res_bad = await client.post("/api/sync/operations", json=bad_payload, headers={"Authorization": f"Bearer {token}"})
    assert res_bad.status_code == 200
    data_bad = res_bad.json()
    assert data_bad["results"][0]["success"] is False
    assert "Latitude must be between -90 and 90" in data_bad["results"][0]["error"]
